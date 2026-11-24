import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const temp = path.join(os.tmpdir(), 'opencode');
const links = [
  ['opencode.json', 'opencode.json'], ['agent-lsp.json', 'agent-lsp.json'],
  ['tui.json', 'tui.json'], ['AGENTS.md', 'AGENTS.md'],
  ...['agents', 'commands', 'instructions', 'plugins', 'prompts', 'skills']
    .map(name => [`.opencode/${name}`, name]),
];
async function fixture(t, xdg = 'custom', special = false) {
  await fs.mkdir(temp, { recursive: true });
  const root = await fs.mkdtemp(path.join(temp, special ? "verify-install space's-" : 'verify-install-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const repo = path.join(root, special ? "checkout's directory" : 'checkout');
  const home = path.join(root, 'home');
  const env = { HOME: home, PATH: process.env.PATH, LC_ALL: 'C' };
  if (xdg !== 'default') env.XDG_CONFIG_HOME = xdg === 'empty' ? '' : path.join(root, special ? "config's directory" : 'config');
  const global = path.join(env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode');
  await fs.mkdir(path.join(repo, 'bin'), { recursive: true });
  await fs.mkdir(global, { recursive: true });
  for (const script of ['verify-install.sh', 'setup-opencode.sh'])
    await fs.copyFile(new URL(`../bin/${script}`, import.meta.url), path.join(repo, 'bin', script));
  for (const [src, dest] of links) {
    const source = path.join(repo, src);
    if (src.startsWith('.opencode/')) await fs.mkdir(source, { recursive: true });
    else await fs.writeFile(source, '{}');
    await fs.symlink(source, path.join(global, dest));
  }
  const config = value => fs.writeFile(path.join(repo, 'opencode.json'), JSON.stringify(value));
  await config({ instructions: ['instructions/rule.md'] });
  await fs.writeFile(path.join(repo, '.opencode/instructions/rule.md'), 'rule');
  const replace = async (name, target) => {
    await fs.rm(path.join(global, name), { recursive: true, force: true });
    if (target !== undefined) await fs.symlink(target, path.join(global, name));
  };
  const run = () => spawnSync('/bin/bash', [path.join(repo, 'bin/verify-install.sh')], {
    env, cwd: root, encoding: 'utf8', timeout: 10000,
  });
  return { root, repo, global, env, config, replace, run };
}
function result(f, good, diagnostic) {
  const r = f.run();
  assert.equal(r.error, undefined);
  const output = r.stdout + r.stderr;
  if (good) { assert.equal(r.status, 0, output); assert.match(r.stdout, /^OK$/m); }
  else { assert.notEqual(r.status, 0, output); assert.doesNotMatch(r.stdout, /^OK$/m); }
  if (diagnostic) assert.match(output, diagnostic);
}
for (const xdg of ['default', 'empty', 'custom']) test(`valid installation with ${xdg} XDG`, async t => {
  const f = await fixture(t, xdg);
  result(f, true);
});
test('equivalent relative and normalized absolute links are accepted', async t => {
  const f = await fixture(t);
  await f.replace('agents', path.relative(f.global, path.join(f.repo, '.opencode/agents')));
  await f.replace('commands', `${f.repo}/.opencode/../.opencode/commands`);
  result(f, true);
});
for (const value of [{}, { instructions: [] }]) test(`absent or empty instructions: ${JSON.stringify(value)}`, async t => {
  const f = await fixture(t); await f.config(value); result(f, true);
});
for (const name of links.map(([, name]) => name)) test(`rejects wrong source for ${name}`, async t => {
  const f = await fixture(t);
  await f.replace(name, path.join(f.repo, 'AGENTS.md') === path.join(f.repo, name)
    ? path.join(f.repo, 'tui.json') : path.join(f.repo, 'AGENTS.md'));
  result(f, false, /WRONG|MISMATCH/i);
});
test('rejects links to another checkout', async t => {
  const f = await fixture(t);
  const other = path.join(f.root, 'other-checkout');
  await fs.mkdir(other); await fs.writeFile(path.join(other, 'tui.json'), '{}');
  await f.replace('tui.json', path.join(other, 'tui.json')); result(f, false, /WRONG|MISMATCH/i);
});
for (const kind of ['file', 'directory', 'broken', 'missing']) test(`rejects ${kind} destination`, async t => {
  const f = await fixture(t); await f.replace('agents');
  const dest = path.join(f.global, 'agents');
  if (kind === 'file') await fs.writeFile(dest, 'ordinary');
  if (kind === 'directory') await fs.mkdir(dest);
  if (kind === 'broken') await fs.symlink(path.join(f.root, 'absent'), dest);
  result(f, false, /NOT.*LINK|BROKEN|MISSING/i);
});
test('invalid JSON cannot return OK', async t => {
  const f = await fixture(t); await fs.writeFile(path.join(f.repo, 'opencode.json'), '{');
  result(f, false, /parse|JSON/i);
});
for (const value of [null, [], 'string', { instructions: null }, { instructions: {} },
  { instructions: 'instructions/rule.md' }, { instructions: [1] },
  { instructions: [''] }, { instructions: ['   '] }]) test(`rejects invalid schema ${JSON.stringify(value)}`, async t => {
  const f = await fixture(t); await f.config(value); result(f, false, /object|instructions/i);
});
test('missing instruction fails', async t => {
  const f = await fixture(t); await f.config({ instructions: ['instructions/absent.md'] });
  result(f, false, /MISSING/);
});
test('instruction paths with apostrophes, spaces and newline are not split', async t => {
  const f = await fixture(t, 'custom', true); const name = "instructions/rule's name\nsecond.md";
  await fs.writeFile(path.join(f.global, name), 'rule'); await f.config({ instructions: [name] });
  assert.match(f.run().stdout, /instructions: ok=1 missing=0/);
  result(f, true);
});
test('JSON read failure cannot return OK', async t => {
  const f = await fixture(t); await fs.rm(path.join(f.repo, 'opencode.json'));
  await fs.mkdir(path.join(f.repo, 'opencode.json')); result(f, false, /read|parse|JSON/i);
});
test('missing Python fails explicitly', async t => {
  const f = await fixture(t); const tools = path.join(f.root, 'tools'); await fs.mkdir(tools);
  for (const name of ['dirname', 'readlink']) await fs.symlink(`/usr/bin/${name}`, path.join(tools, name));
  f.env.PATH = tools; result(f, false, /python3.*(required|not available|missing)/i);
});
test('absent global root fails', async t => {
  const f = await fixture(t); await fs.rm(f.global, { recursive: true });
  result(f, false, /does not exist/);
});
test('verification leaves config and checkout unchanged', async t => {
  const f = await fixture(t);
  const snapshot = async dir => {
    const entries = await fs.readdir(dir, { recursive: true });
    return Promise.all(entries.sort().map(async name => {
      const p = path.join(dir, name); const s = await fs.lstat(p);
      return [name, s.mode, s.mtimeMs, s.isSymbolicLink() ? await fs.readlink(p)
        : s.isFile() ? await fs.readFile(p, 'utf8') : null];
    }));
  };
  const before = await snapshot(f.root); result(f, true);
  assert.deepEqual(await snapshot(f.root), before);
});
