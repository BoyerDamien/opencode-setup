import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import plugin from '../.opencode/plugins/auto-compact.js';
import { installedPolicyDecision } from './opencode-patch-oracle.mjs';

const readConfig = async path => JSON.parse(await fs.readFile(new URL(path, import.meta.url)));

test('OpenCode V2 can load the auto-compact plugin definition', () => {
  assert.equal(typeof plugin, 'object', 'V2 requires a default definition object');
  assert.equal(plugin.id, 'auto-compact');
  assert.equal(typeof plugin.setup, 'function');
});

test('the plugin only adds preserve/discard instructions to the compaction system prompt', async () => {
  assert.equal(typeof plugin.setup, 'function', 'V2 compaction hook requires setup');
  const hooks = [];
  // Give setup and its handler no ability to inspect or compact a session.
  await plugin.setup({ session: { hook: (...args) => hooks.push(args) } });
  assert.deepEqual(hooks.map(([name]) => name), ['compaction']);

  const initial = { type: 'text', text: 'Existing instruction.' };
  const event = { system: [initial] };
  await hooks[0][1](event);
  assert.equal(event.system[0], initial);
  const added = event.system.slice(1);
  assert.equal(added.length, 1);
  assert.equal(added[0].type, 'text');
  assert.match(added[0].text, /Preserve: architectural decisions, unresolved bugs, TODOs, project conventions agreed in this conversation and not already recorded on disk, and the state of modified files\./);
  assert.match(added[0].text, /Discard: redundant tool outputs, debug messages, and content already reflected in the files on disk\./);
});

test('native early compaction targets a 4000-token recent-history budget and skips speculative summaries', async () => {
  const { compaction } = await readConfig('../opencode.json');
  assert.deepEqual(compaction, {
    auto: true,
    background: false,
    buffer: '20%',
    keep: { tokens: 4000 },
  });
});

test('repository policy permits the local plugin but excludes its global alias', async t => {
  const decide = await installedPolicyDecision();
  if (!decide) return t.skip('policy evaluation requires an installed OpenCode 2.4.1 binary');
  const { policies } = await readConfig('../.opencode/opencode.json');
  for (const source of ['/home/person/.config/opencode/plugins/auto-compact.js',
    '/custom/xdg/opencode/plugins/auto-compact.js']) {
    assert.equal(decide(policies, 'plugin.use', source), 'deny', source);
    assert.equal(decide([], 'plugin.use', source), 'allow', source);
  }
  assert.equal(decide(policies, 'plugin.use', '/clone/.opencode/plugins/auto-compact.js'), 'allow');
});
