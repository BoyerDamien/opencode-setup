/**
 * auto-compact.js — triggers session compaction at a configurable % of the
 * model's context window, and customizes the compaction prompt.
 *
 * OpenCode's built-in auto-compaction only fires "when context is full"
 * (window minus `compaction.reserved`). It has no percentage knob. This plugin
 * adds one: it measures current token usage before each LLM call and, when it
 * crosses `OPENCODE_COMPACT_RATIO` (default 0.8 = 80%) of `model.limit.context`,
 * calls `client.session.summarize()` to compact early.
 *
 * Why 80%: Claude Code compacts at ~75% (150k/200k) and agent-context guidance
 * (Victor Dibia, "Context Engineering 101") recommends 80%. Compacting early
 * avoids "context rot" (precision degrades as the window fills) and leaves
 * headroom for the compaction + response itself.
 *
 * - Threshold: OPENCODE_COMPACT_RATIO (default 0.8). Clamped to (0, 1].
 * - Measurement: sums `tokens.input` of assistant messages via
 *   `client.session.messages()`. The most recent input count is the best proxy
 *   for current context size.
 * - Trigger: `client.session.summarize({ id })` (v1 compaction endpoint).
 * - Anti re-entrance: a per-session flag prevents overlapping compactions.
 * - Prompt: `experimental.session.compacting` injects a preserve/discard list
 *   following Anthropic's "recall first, precision second" guidance.
 * - Opt-out: OPENCODE_AUTO_COMPACT_DISABLE=1.
 */

import process from "node:process";

const DISABLED = process.env.OPENCODE_AUTO_COMPACT_DISABLE === "1";

// Parse and clamp the ratio to (0, 1]. Invalid values fall back to 0.8.
function parseRatio(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.8;
  return n;
}

const RATIO = parseRatio(process.env.OPENCODE_COMPACT_RATIO);

// Pure, testable: decide whether to compact given current tokens and window.
export function shouldCompact(tokens, contextLimit, ratio = RATIO) {
  if (!Number.isFinite(tokens) || !Number.isFinite(contextLimit)) return false;
  if (contextLimit <= 0) return false;
  return tokens >= contextLimit * ratio;
}

// Pure, testable: sum input tokens from a v1 messages response.
// Accepts either the raw array or a hey-api `{ data: [...] }` envelope.
export function sumInputTokens(messages) {
  const list = Array.isArray(messages) ? messages : messages?.data;
  if (!Array.isArray(list)) return 0;
  let total = 0;
  for (const m of list) {
    const t = m?.info?.tokens;
    if (t && Number.isFinite(t.input)) total += t.input;
  }
  return total;
}

export default async function autoCompact({ client }) {
  if (DISABLED) return {};

  const compacting = new Set();

  return {
    "chat.params": async (input) => {
      const { sessionID, model } = input;
      const limit = model?.limit?.context;
      if (!Number.isFinite(limit) || limit <= 0) return;
      if (compacting.has(sessionID)) return;

      let tokens = 0;
      try {
        const res = await client.session.messages({ path: { id: sessionID } });
        tokens = sumInputTokens(res);
      } catch {
        return; // cannot measure — skip rather than risk a bad trigger
      }

      if (!shouldCompact(tokens, limit)) return;

      compacting.add(sessionID);
      try {
        await client.session.summarize({ path: { id: sessionID } });
      } catch {
        // Compaction failed; leave the flag cleared and let the next call retry.
      } finally {
        compacting.delete(sessionID);
      }
    },

    "experimental.session.compacting": async (_input, output) => {
      output.context.push(
        "Preserve: architectural decisions, unresolved bugs, TODOs, " +
          "project conventions, and the state of modified files. " +
          "Discard: redundant tool outputs, debug messages, and content " +
          "already reflected in the files on disk."
      );
    },
  };
}
