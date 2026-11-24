/**
 * OpenCode V2 read-before-edit guard for local edit/write/patch tools.
 * Successful file reads count; grep/glob, listings and failed reads do not.
 * New files are allowed. Paths are relative to the session's current location,
 * not the plugin's location or the canonical Git checkout (worktrees differ).
 * Agents sharing this plugin runtime share state; unloading requires rereading.
 * OPENCODE_READ_B4_EDIT_DISABLE=1 disables the guard at setup time.
 * This is a tool policy, not a sandbox: shell and custom tools are out of scope.
 * Checks run BEFORE the executor's filesystem lock, not atomically with writes.
 * Another writer can create or retarget a checked path before the tool mutates
 * it. No supported V2 plugin API exposes the core FileMutation lock to this hook.
 * Remote workspaces/machine paths are unsupported and mutations fail closed.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { patchTargets } from "./read-before-edit-patch.mjs";

const MUTATING_TOOLS = new Set(["edit", "write", "patch"]);
const blocked = (message) => new Error(`read-before-edit: ${message}`);

async function canonical(filename) {
  try {
    return await fs.realpath(filename);
  } catch (error) {
    if (error.code === "ENOENT") return filename;
    throw error;
  }
}

export default {
  id: "read-before-edit",
  async setup(ctx) {
    if (process.env.OPENCODE_READ_B4_EDIT_DISABLE === "1") return;
    const readFiles = new Set();
    const pending = new Map();
    const key = (event) => JSON.stringify([event.sessionID, event.messageID, event.id]);
    const resolve = async (event, filename) => {
      if (typeof filename !== "string" || !filename || /^[\w+.-]+:/.test(filename)) {
        throw blocked("unsupported or missing local path");
      }
      const session = await ctx.session.get({ sessionID: event.sessionID });
      const location = session.location;
      if (ctx.location.workspaceID || location?.workspaceID || !path.isAbsolute(location?.directory ?? "")) {
        throw blocked("cannot resolve this session's local workspace");
      }
      const expanded = filename === "~" ? os.homedir()
        : filename.startsWith("~/") ? path.join(os.homedir(), filename.slice(2)) : filename;
      return path.resolve(location.directory, expanded);
    };
    const assertRead = async (event, filename) => {
      const target = await canonical(await resolve(event, filename));
      try {
        await fs.stat(target);
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      if (!readFiles.has(target)) {
        throw blocked(`${event.tool} blocked. You must read ${target} before modifying it. ` +
          "Set OPENCODE_READ_B4_EDIT_DISABLE=1 to bypass.");
      }
    };

    await ctx.tool.hook("execute.before", async (event) => {
      if (event.tool === "read") {
        // Remember the requested target before execution, not an unsuccessful read.
        // Unsupported/virtual reads remain usable but never authorize mutations.
        try {
          const filename = await resolve(event, event.input?.path);
          const target = await canonical(filename);
          if ((await fs.stat(target)).isFile()) pending.set(key(event), { filename, target });
        } catch {}
        return;
      }
      if (!MUTATING_TOOLS.has(event.tool)) return;
      if (event.tool !== "patch") {
        await assertRead(event, event.input?.path);
        return;
      }
      // Check every source AND destination before any operation can execute.
      const targets = patchTargets(event.input?.patchText);
      for (const target of targets) await assertRead(event, target);
    });

    await ctx.tool.hook("execute.after", async (event) => {
      if (event.tool !== "read") return;
      const requested = pending.get(key(event));
      pending.delete(key(event));
      if (!requested || event.status !== "completed" ||
          !["text", "media"].includes(event.result?.output?.type)) return;
      try {
        const target = await canonical(requested.filename);
        // A link retargeted during a read must not authorize the replacement.
        if (target === requested.target && (await fs.stat(target)).isFile()) readFiles.add(target);
      } catch {} // Missing/inaccessible targets earn no read authorization.
    });
    return () => { readFiles.clear(); pending.clear(); };
  },
};
