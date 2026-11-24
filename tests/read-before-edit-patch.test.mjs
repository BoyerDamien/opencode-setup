import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import { fixture } from './read-before-edit-fixture.mjs';

for (const separator of ['\u2028', '\u2029', '\r']) {
  test(`checks every delete header with embedded ${JSON.stringify(separator)} in its filename`, async (t) => {
    const f = await fixture(t);
    const victim = `victim${separator}.txt`;
    await fs.writeFile(path.join(f.checkout, victim), 'unread');
    const patchText = `*** Begin Patch\n*** Add File: new.txt\n+new\n*** Delete File: ${victim}\n*** End Patch`;
    await assert.rejects(f.before('patch', { patchText }), /read-before-edit/);
    await f.read(victim);
    await f.before('patch', { patchText });
  });
  for (const operation of ['Add', 'Update', 'Move']) {
    test(`checks ${operation} targets containing ${JSON.stringify(separator)}`, async (t) => {
      const f = await fixture(t);
      const victim = `victim${separator}.txt`;
      await fs.writeFile(path.join(f.checkout, victim), 'unread');
      await f.read('existing.txt');
      const operationText = operation === 'Move'
        ? `*** Update File: existing.txt\n*** Move to: ${victim}\n@@\n-old\n+new`
        : `*** ${operation} File: ${victim}` + (operation === 'Add' ? '\n+new' : '\n@@\n-unread\n+new');
      const patchText = `*** Begin Patch\n*** Add File: new.txt\n+new\n${operationText}\n*** End Patch`;
      await assert.rejects(f.before('patch', { patchText }), /read-before-edit/);
      await f.read(victim);
      await f.before('patch', { patchText });
    });
  }
}

for (const header of ['*** Delete File:\tvictim.txt', '*** Update File:', '*** Rename File: victim.txt', '*** Move to: victim.txt']) {
  test(`rejects an unparsed operation instead of authorizing the recognized prefix: ${header}`, async (t) => {
    const f = await fixture(t);
    const patchText = `*** Begin Patch\n*** Add File: new.txt\n+new\n${header}\n*** End Patch`;
    await assert.rejects(f.before('patch', { patchText }), /read-before-edit/);
  });
}
