import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fixture } from './read-before-edit-fixture.mjs';

// Characterization of a KNOWN LIMITATION, not proof of concurrency safety.
test('a pre-hook approval does not exclude another writer before the executor', async (t) => {
  const f = await fixture(t);
  const filename = path.join(f.checkout, 'race.txt');
  await f.before('write', { path: 'race.txt' }); // A: target absent, approved.
  await fs.writeFile(filename, 'created by B without a read'); // B runs before A's executor.
  await assert.rejects(f.before('write', { path: 'race.txt' }), /read-before-edit/);
  // A's approval is already returned; its executor is not wrapped by the hook.
  await fs.writeFile(filename, 'A overwrote the unread file');
  assert.equal(await fs.readFile(filename, 'utf8'), 'A overwrote the unread file');
});
