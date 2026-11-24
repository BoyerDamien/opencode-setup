import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import plugin from '../.opencode/plugins/read-before-edit.js';

// OpenCode 2.4.1: one event, input.path; session.get returns Info directly.
export async function fixture(t) {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'read-before-edit-')));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const checkout = path.join(root, 'checkout');
  const worktree = path.join(root, 'worktree');
  for (const directory of [checkout, worktree]) {
    await fs.mkdir(directory);
    await fs.writeFile(path.join(directory, 'existing.txt'), 'old\n');
    await fs.writeFile(path.join(directory, 'other.txt'), 'other\n');
  }
  const hooks = new Map();
  const sessions = { parent: checkout, child: checkout, moved: worktree };
  assert.equal(typeof plugin, 'object', 'V2 loader requires a default definition object');
  assert.equal(typeof plugin.id, 'string');
  assert.equal(typeof plugin.setup, 'function');
  const cleanup = await plugin.setup({
    location: { directory: root, project: { directory: root } },
    tool: { hook: async (name, callback) => { hooks.set(name, callback); } },
    session: { get: async ({ sessionID }) => ({ location: { directory: sessions[sessionID] } }) },
  });
  if (cleanup) t.after(cleanup);
  let id = 0;
  const before = async (tool, input, sessionID = 'parent') => {
    const event = { tool, input, sessionID, agent: 'main', messageID: 'message', id: String(++id) };
    await hooks.get('execute.before')(event);
    return event;
  };
  const read = async (name, sessionID = 'parent', status = 'completed', type = 'text') => {
    const event = await before('read', { path: name }, sessionID);
    await hooks.get('execute.after')({ ...event, status, result: { output: { type } } });
  };
  return { root, checkout, worktree, sessions, before, read, hooks, cleanup };
}
