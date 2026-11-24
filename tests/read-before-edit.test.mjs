import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import plugin from '../.opencode/plugins/read-before-edit.js';
import { fixture } from './read-before-edit-fixture.mjs';

test('loads as V2 and blocks each real mutating tool until a successful read', async (t) => {
  const f = await fixture(t);
  for (const tool of ['edit', 'write']) {
    await assert.rejects(f.before(tool, { path: 'existing.txt' }), /read-before-edit/);
  }
  await assert.rejects(f.before('patch', { patchText: '*** Begin Patch\n*** Delete File: existing.txt\n*** End Patch' }), /read-before-edit/);
  await f.read('existing.txt');
  await f.before('edit', { path: 'existing.txt' });
  await f.before('write', { path: 'existing.txt' });
});

test('failed or unfinished reads and directory listings never authorize files', async (t) => {
  const f = await fixture(t);
  await f.before('read', { path: 'existing.txt' });
  await assert.rejects(f.before('edit', { path: 'existing.txt' }), /read-before-edit/);
  await f.read('existing.txt', 'parent', 'error');
  await assert.rejects(f.before('write', { path: 'existing.txt' }), /read-before-edit/);
  await f.read('.', 'parent', 'completed', 'directory');
  await assert.rejects(f.before('edit', { path: 'other.txt' }), /read-before-edit/);
  await f.before('grep', { path: 'other.txt' });
  await f.before('glob', { path: 'other.txt' });
  await assert.rejects(f.before('edit', { path: 'other.txt' }), /read-before-edit/);
});

test('resolves against the current session checkout, including moves and other agents', async (t) => {
  const f = await fixture(t);
  await f.read('existing.txt');
  await f.before('edit', { path: 'existing.txt' }, 'child');
  await assert.rejects(f.before('edit', { path: 'existing.txt' }, 'moved'), /read-before-edit/);
  f.sessions.parent = f.worktree;
  await assert.rejects(f.before('write', { path: 'existing.txt' }), /read-before-edit/);
  await f.read('existing.txt');
  await f.before('write', { path: 'existing.txt' });
});

test('canonicalizes symlinks and absolute paths without authorizing retargeted links', async (t) => {
  const f = await fixture(t);
  const alias = path.join(f.checkout, 'alias.txt');
  await fs.symlink('existing.txt', alias);
  await f.read('alias.txt');
  await f.before('edit', { path: path.join(f.checkout, 'existing.txt') }, 'child');
  await fs.unlink(alias);
  await fs.symlink('other.txt', alias);
  await assert.rejects(f.before('write', { path: 'alias.txt' }), /read-before-edit/);
});

test('allows creations but checks every existing patch source and move destination', async (t) => {
  const f = await fixture(t);
  await f.before('write', { path: 'new/deep.txt' });
  await f.before('patch', { patchText: '*** Begin Patch\n*** Add File: new.txt\n+new\n*** End Patch' });
  await f.read('existing.txt');
  const patch = '*** Begin Patch\n*** Update File: existing.txt\n*** Move to: other.txt\n@@\n-old\n+new\n*** Delete File: other.txt\n*** End Patch';
  await assert.rejects(f.before('patch', { patchText: patch }), /read-before-edit/);
  await f.read('other.txt');
  await f.before('patch', { patchText: patch });
  await f.before('patch', { patchText: '*** Begin Patch\n*** Update File: existing.txt\n*** Move to: created.txt\n@@\n-old\n+new\n*** End Patch' });
});

test('fails closed for inaccessible targets and unsupported mutation inputs', async (t) => {
  const f = await fixture(t);
  await fs.symlink('loop.txt', path.join(f.checkout, 'loop.txt'));
  await assert.rejects(f.before('write', { path: 'loop.txt' }));
  await assert.rejects(f.before('edit', { filePath: 'existing.txt' }), /read-before-edit/);
  await assert.rejects(f.before('write', { path: 'remote:/existing.txt' }), /read-before-edit/);
  await assert.rejects(f.before('patch', { patchText: '' }), /read-before-edit/);
});

test('unload/reload requires rereading and opt-out registers no guards', async (t) => {
  const f = await fixture(t);
  await f.read('existing.txt');
  if (f.cleanup) await f.cleanup();
  await assert.rejects(f.before('edit', { path: 'existing.txt' }), /read-before-edit/);
  const previous = process.env.OPENCODE_READ_B4_EDIT_DISABLE;
  t.after(() => previous === undefined ? delete process.env.OPENCODE_READ_B4_EDIT_DISABLE : process.env.OPENCODE_READ_B4_EDIT_DISABLE = previous);
  process.env.OPENCODE_READ_B4_EDIT_DISABLE = '1';
  await plugin.setup({ tool: { hook: () => assert.fail('disabled plugin registered a hook') } });
});

test('checks whitespace-tolerant patch headers without mistaking update context for targets', async (t) => {
  const f = await fixture(t);
  const patch = '*** Begin Patch\n*** Add File: created.txt\n+new\n  *** Delete File: existing.txt  \n*** End Patch';
  await assert.rejects(f.before('patch', { patchText: patch }), /read-before-edit/);
  await f.read('existing.txt');
  await f.before('patch', { patchText: patch });
  await f.before('patch', { patchText: '*** Begin Patch\n*** Update File: existing.txt\n@@\n *** Delete File: other.txt\n-old\n+new\n*** End Patch' });
});

test('retargeting a symlink during a read grants neither file authorization', async (t) => {
  const f = await fixture(t);
  const alias = path.join(f.checkout, 'alias.txt');
  await fs.symlink('existing.txt', alias);
  const event = await f.before('read', { path: 'alias.txt' });
  await fs.unlink(alias);
  await fs.symlink('other.txt', alias);
  await f.hooks.get('execute.after')({ ...event, status: 'completed', result: { output: { type: 'text' } } });
  await assert.rejects(f.before('edit', { path: 'existing.txt' }), /read-before-edit/);
  await assert.rejects(f.before('edit', { path: 'other.txt' }), /read-before-edit/);
});

test('a missing requested path cannot authorize a concurrently created file after fallback', async (t) => {
  const f = await fixture(t);
  const event = await f.before('read', { path: 'appeared.txt' });
  await fs.writeFile(path.join(f.checkout, 'appeared.txt'), 'unread');
  await f.hooks.get('execute.after')({ ...event, status: 'completed', result: { output: { type: 'text' } } });
  await assert.rejects(f.before('write', { path: 'appeared.txt' }), /read-before-edit/);
});
