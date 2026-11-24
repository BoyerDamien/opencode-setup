import assert from 'node:assert/strict';
import { test } from 'node:test';
import { patchTargets } from '../.opencode/plugins/read-before-edit-patch.mjs';
import { installedPatchParser } from './opencode-patch-oracle.mjs';

test('an EOF marker after Move without a chunk does not require the next line to be a chunk header', () => {
  const patch = '*** Begin Patch\n*** Update File: old.txt\n*** Move to: new.txt\n*** End of File\n+new\n*** End Patch';
  assert.deepEqual(patchTargets(patch), ['old.txt', 'new.txt']);
});

test('agrees with the installed OpenCode 2.4.1 parser on operation targets', async (t) => {
  const oracle = await installedPatchParser();
  if (!oracle) return t.skip('optional differential test needs an installed OpenCode 2.4.1 binary');
  const wrap = (body) => `*** Begin Patch\n${body}\n*** End Patch`;
  const bodies = [
    '*** Add File: new.txt\n+new',
    '*** Add File: empty.txt',
    '*** Delete File: old.txt',
    '*** Update File: old.txt\n@@\n-old\n+new',
    '*** Update File: old.txt\n-old\n+new',
    '*** Update File: old.txt\n*** End of File\n*** Move to: dest.txt\n@@\n-old\n+new',
    '*** Update File: old.txt\n*** Move to: new.txt\n*** End of File\n+new',
    '*** Update File: old.txt\n*** Move to: new.txt\n*** End of File\n*** End of File\n+new',
    '*** Update File: old.txt\n*** Move to: new.txt\n*** End of File\n\n+new',
    '*** Update File: old.txt\n@@ context\n *** Delete File: data.txt\n-old\n+new\n*** End of File\n\n@@\n+more',
    '*** Add File: new.txt\n+*** Rename File: data.txt\n  *** Delete File: old.txt',
    '*** Delete File: old.txt\n\t*** Add File: new.txt\n+new',
    '*** Environment ID: local\n*** Delete File: old.txt',
  ];
  const corpus = bodies.flatMap((body) => {
    const patch = wrap(body);
    return [patch, patch.replaceAll('\n', '\r\n'), `cat <<'PATCH'\n${patch}\nPATCH`];
  });
  for (const char of ['\u2028', '\u2029', '\r', '\t', '\v', '\f', '\u00a0', '\ufeff']) {
    for (const operation of ['Add', 'Delete', 'Update']) {
      const suffix = operation === 'Add' ? '\n+new' : operation === 'Update' ? '\n@@\n-old\n+new' : '';
      corpus.push(wrap(`*** Add File: first.txt\n+first\n*** ${operation} File: name${char}.txt${suffix}`));
    }
    corpus.push(wrap(`*** Update File: old.txt\n*** Move to: name${char}.txt\n@@\n-old\n+new`));
    for (const header of ['Add', 'Delete', 'Update']) {
      corpus.push(wrap(`*** Add File: new.txt\n+new\n*** ${header} File:${char} old.txt`));
    }
  }
  const malformed = [
    '*** Rename File: old.txt', '*** Move to: old.txt', '*** Update File:',
    '*** Add File: new.txt\nnew without plus',
    '*** Delete File: old.txt\nnot a header',
    '*** Update File: old.txt\n@@',
    '*** Update File: old.txt\n@@\n-old\n+new\n*** Unknown: old.txt',
    '*** Update File: old.txt\n@@\n-old\n+new\n*** End of File\n*** Move to: dest.txt',
  ];
  corpus.push(...malformed.map((body) => wrap(`*** Add File: prefix.txt\n+prefix\n${body}`)));
  for (const patch of corpus) {
    const expected = oracle(patch);
    if (expected.failure) {
      assert.throws(() => patchTargets(patch), /read-before-edit/, JSON.stringify(patch));
    } else {
      const targets = Array.from(expected.success).flatMap((op) => [op.path, ...(op.movePath ? [op.movePath] : [])]);
      assert.deepEqual(patchTargets(patch), targets, JSON.stringify(patch));
    }
  }
  t.diagnostic(`${corpus.length} accepted/rejected cases compared to the installed parser`);
});
