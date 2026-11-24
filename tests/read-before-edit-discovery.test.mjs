import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import { installedPolicyDecision } from './opencode-patch-oracle.mjs';

test('repository-only policy excludes global aliases but keeps local/standalone copies', async (t) => {
  const decide = await installedPolicyDecision();
  if (!decide) return t.skip('optional policy test needs an installed OpenCode 2.4.1 binary');
  const { policies } = JSON.parse(await fs.readFile(new URL('../.opencode/opencode.json', import.meta.url)));
  const examples = [
    ['/home/person/.config/opencode/plugins/read-before-edit.js', 'deny'],
    ['/custom/xdg/opencode/plugins/read-before-edit.js', 'deny'],
    ['/clone/.opencode/plugins/read-before-edit.js', 'allow'],
    ['/clone-without-global-install/.opencode/plugins/read-before-edit.js', 'allow'],
    ['/home/person/.config/opencode/plugins/other-plugin.js', 'allow'],
  ];
  for (const [source, expected] of examples) {
    assert.equal(decide(policies, 'plugin.use', source), expected, source);
  }
  // The local document is not present in other projects' applicable config.
  assert.equal(decide([], 'plugin.use', examples[0][0]), 'allow');
});
