/**
 * read-before-edit.js — enforces "read before edit" for file-mutating tools.
 *
 * OpenCode's permission system has no tool dependencies (e.g. "edit only after
 * read"), so we implement it via `tool.execute.before`.
 *
 * - Tracks absolute, symlink-resolved paths that have been `read`.
 * - Blocks `edit`, `write`, `apply_patch` on existing files that were not read.
 * - New files (write/Add File on a non-existent path) are allowed.
 * - State is per-process; restarts require re-reading.
 * - Cross-agent: subagents share state with the parent session.
 * - Opt-out: OPENCODE_READ_B4_EDIT_DISABLE=1.
 * - `grep`/`glob` do NOT count as reading (by design).
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DISABLED = process.env.OPENCODE_READ_B4_EDIT_DISABLE === "1";
const MUTATING_TOOLS = new Set(["edit", "write", "apply_patch"]);
const READ_TOOL = "read";
// apply_patch embeds paths in marker lines: "*** Update File: src/foo.ts"
const PATCH_MARKERS = ["*** Add File:", "*** Update File:", "*** Move to:", "*** Delete File:"];

const readFiles = new Set();

// Resolve against workspace root, then canonicalize via realpath (symlinks).
// Falls back to the resolved path if the file does not exist.
async function normalize(directory, filePath) {
  const resolved = path.resolve(directory, filePath);
  try {
    return await fs.promises.realpath(resolved);
  } catch {
    return resolved;
  }
}

// Extract target paths from apply_patch patchText (relative to project root).
function extractPatchTargets(patchText) {
  const targets = [];
  for (const line of patchText.split("\n")) {
    for (const marker of PATCH_MARKERS) {
      if (line.startsWith(marker)) {
        const p = line.slice(marker.length).trim();
        if (p) targets.push(p);
        break;
      }
    }
  }
  return targets;
}

// Block a mutating tool if the target exists but was never read.
async function assertRead(directory, filePath, toolName) {
  const canonical = await normalize(directory, filePath);
  let exists = false;
  try {
    await fs.promises.stat(canonical);
    exists = true;
  } catch {
    // ENOENT -> new file, allowed.
  }
  if (!exists) return;
  if (!readFiles.has(canonical)) {
    throw new Error(
      `read-before-edit: ${toolName} blocked. ` +
        `You must read ${canonical} before modifying it. ` +
        `Set OPENCODE_READ_B4_EDIT_DISABLE=1 to bypass.`
    );
  }
}

export default async function readBeforeEdit({ directory }) {
  if (DISABLED) return {};

  return {
    "tool.execute.before": async (input, output) => {
      const toolName = input.tool;

      if (toolName === READ_TOOL) {
        const filePath = output?.args?.filePath;
        if (typeof filePath === "string" && filePath) {
          readFiles.add(await normalize(directory, filePath));
        }
        return;
      }

      if (!MUTATING_TOOLS.has(toolName)) return;

      if (toolName === "apply_patch") {
        const patchText = output?.args?.patchText;
        if (typeof patchText !== "string" || !patchText) return;
        for (const target of extractPatchTargets(patchText)) {
          await assertRead(directory, target, toolName);
        }
        return;
      }

      const filePath = output?.args?.filePath;
      if (typeof filePath !== "string" || !filePath) return;
      await assertRead(directory, filePath, toolName);
    },
  };
}
