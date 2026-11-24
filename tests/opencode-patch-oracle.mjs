import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

async function installedBytes() {
  const binary = process.env.OPENCODE_BINARY || path.join(os.homedir(), '.opencode/bin/opencode');
  const version = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 5000 });
  if (!/v2\.4\.1\b/.test(version.stdout || '')) return null;
  return fs.readFile(binary);
}

// Execute the installed 2.4.1 parser, not a second handwritten target scanner.
// No tools or mutations run. Schema-only errors/Result constructors are stubbed.
export async function installedPatchParser() {
  const bytes = await installedBytes();
  if (!bytes) return null;
  const start = bytes.indexOf(Buffer.from('function Xue(r){let i=W(r.trim())'));
  const end = bytes.indexOf(Buffer.from('export{Xue,FY,p8e};'), start);
  if (start < 0 || end < start) throw new Error('installed 2.4.1 patch parser not found');
  class ParseError extends Error { constructor(fields) { super('invalid patch'); Object.assign(this, fields); } }
  const parse = vm.runInNewContext(bytes.subarray(start, end).toString() + ';Xue', {
    b: ParseError, p: ParseError,
    Be: (success) => ({ success }), Me: (failure) => ({ failure }),
  }, { timeout: 1000 });
  return parse;
}

export async function installedPolicyDecision() {
  const bytes = await installedBytes();
  if (!bytes) return null;
  const start = bytes.indexOf(Buffer.from('function J1(e,n,a=!1){let s=e.replaceAll'));
  const end = bytes.indexOf(Buffer.from('function G9e('), start);
  if (start < 0 || end < start) throw new Error('installed 2.4.1 policy evaluator not found');
  return vm.runInNewContext(bytes.subarray(start, end).toString() + ';tO', {}, { timeout: 1000 });
}
