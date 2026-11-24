import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

async function waitForInventory(load, {
  timeoutMs = 5000, intervalMs = 200, signal,
  now = () => performance.now(), wait = (ms) => delay(ms, undefined, { signal }),
} = {}) {
  const deadline = now() + timeoutMs;
  while (now() < deadline) {
    const entries = await load(Math.max(1, Math.ceil(deadline - now())));
    // Return nonempty snapshots immediately; strict assertions below expose failures.
    if (entries.length) return entries;
    const remaining = deadline - now();
    if (remaining <= 0) break;
    await wait(Math.min(intervalMs, remaining));
  }
  throw new Error('OpenCode plugin initialization timed out; source did not become visible');
}
function assertSmokeVersion(version) {
  assert.equal(version, '2.4.1', 'This smoke test certifies OpenCode 2.4.1 only');
}

function fakeClock() {
  let elapsed = 0;
  return {
    timeoutMs: 100, intervalMs: 25,
    now: () => elapsed,
    wait: async (ms) => { elapsed += ms; },
  };
}

test('smoke synchronization waits through empty startup inventories', async () => {
  const ready = [{ id: 'read-before-edit', state: { status: 'active' } }];
  const snapshots = [[], [], ready];
  assert.deepEqual(await waitForInventory(async () => snapshots.shift(), fakeClock()), ready);
});

test('smoke synchronization times out when the plugin never becomes visible', async () => {
  const clock = fakeClock();
  await assert.rejects(waitForInventory(async () => [], clock), /timed out/);
  assert.equal(clock.now(), clock.timeoutMs);
});

test('smoke synchronization does not hide duplicates or failed entries', async () => {
  const failed = [{ state: { status: 'failed' } }, { state: { status: 'active' } }];
  assert.deepEqual(await waitForInventory(async () => failed, fakeClock()), failed);
});

test('the smoke contract certifies exactly OpenCode 2.4.1', () => {
  assertSmokeVersion('2.4.1');
  for (const version of ['2.4.0', '2.4.2', '2.5.0', '1.18.30']) {
    assert.throws(() => assertSmokeVersion(version), /2\.4\.1/);
  }
});

// Opt-in, read-only smoke test of an ALREADY RUNNING V2 service.
// Uses managed-service authentication; no reload, prompts, or session writes.
// Certifies server version 2.4.1, matching the version-specific patch grammar.
// Full tool behavior is tested with temporary fixtures in the unit suite.
test('the real V2 service loads this source exactly once, without a failed duplicate', {
  skip: process.env.OPENCODE_INTEGRATION !== '1',
  timeout: 20000,
}, async (t) => {
  const binary = process.env.OPENCODE_BINARY || 'opencode';
  const directory = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '');
  const run = (args, timeout = 5000) => {
    const result = spawnSync(binary, args, {
      cwd: directory, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024,
    });
    assert.equal(result.status, 0, 'OpenCode read-only command must succeed');
    return result.stdout;
  };
  // Require an active service before using the authenticated API helper.
  const status = run(['service', 'status']);
  assert.match(status, /http:\/\/127\.0\.0\.1:\d+/,
    'start OpenCode yourself before running this optional smoke test');
  const info = JSON.parse(run(['api', 'get', '/api/info']));
  assertSmokeVersion(info.version);
  const source = await fs.realpath(new URL('../.opencode/plugins/read-before-edit.js', import.meta.url));
  const instances = await waitForInventory(async (remainingMs) => {
    const response = JSON.parse(run(['api', 'get',
      `/api/plugin?location%5Bdirectory%5D=${encodeURIComponent(directory)}`], remainingMs));
    const found = [];
    for (const entry of response.data) {
      if (entry.source?.type !== 'local') continue;
      if (await fs.realpath(entry.source.path).catch(() => null) === source) found.push(entry);
    }
    return found;
  }, { signal: t.signal });
  assert.equal(instances.length, 1, 'duplicate discovery must not be silently tolerated');
  assert.equal(instances[0].id, 'read-before-edit');
  assert.equal(instances[0].state.status, 'active');
});
