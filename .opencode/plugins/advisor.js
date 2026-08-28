/**
 * advisor.js — lets the main agent ask a read-only "advisor" for a review or
 * second opinion, on demand.
 *
 * Design (agreed):
 * - queue: `ask_advisor` creates a child session and prompts it without
 *   blocking; the agent reads the answer later via `read_advisor`.
 * - child session: the advisor runs in a child session (navigable via
 *   `session_child_first`), not inline in the main flow.
 * - read-only: the `advisor` agent has `edit: deny`; it may run read-only
 *   commands but never modifies anything.
 * - max 3 calls per parent session (OPENCODE_ADVISOR_MAX, default 3).
 *
 * Two tools:
 * - ask_advisor(question)  -> creates child session, prompts advisor, returns
 *   the child session ID.
 * - read_advisor(sessionID) -> blocks until the advisor is idle, then returns
 *   its latest text answer (no shell `sleep` needed).
 *
 * Opt-out: OPENCODE_ADVISOR_DISABLE=1.
 */

import process from "node:process";
import { appendFileSync } from "node:fs";
import { tool } from "@opencode-ai/plugin";

const DISABLED = process.env.OPENCODE_ADVISOR_DISABLE === "1";

// Debug sink for waitForIdle's SSE-subscription tracing. opencode.log does
// NOT capture plugin console.error output (confirmed empirically — a plugin
// crash mid-request leaves no ERROR-level line at all), so this appends
// timestamped lines to a fixed file on disk instead. Never throws: a failure
// to write the debug file must not take down the tool call it's tracing.
const DEBUG_LOG_PATH = "/tmp/opencode-advisor-debug.log";
function debugLog(message) {
  try {
    appendFileSync(DEBUG_LOG_PATH, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // swallow — debug logging must never be the reason a tool call fails
  }
}

function parseMax(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 3;
  return Math.floor(n);
}
const MAX_CALLS = parseMax(process.env.OPENCODE_ADVISOR_MAX);

// Total budget for read_advisor's internal wait for the advisor to go idle.
const WAIT_MS = 120000;

// Per-parent-session call counter (in-process).
const callCount = new Map();

// Extract the advisor's text answer from a v1 messages response.
// Accepts either the raw array or a hey-api `{ data: [...] }` envelope.
export function extractAdvice(messages) {
  const list = Array.isArray(messages) ? messages : messages?.data;
  if (!Array.isArray(list)) return "";
  const texts = [];
  for (const m of list) {
    if (m?.info?.role !== "assistant") continue;
    for (const p of m.parts ?? []) {
      if (p?.type === "text" && p.text) texts.push(p.text);
    }
  }
  return texts.join("\n\n").trim();
}

// True if the session's last assistant message has already completed.
// Checked first so a session that finished before read_advisor was even
// called doesn't need to wait on an SSE event that already fired (and never
// will again).
async function isAlreadyIdle(client, sessionID) {
  let res;
  try {
    res = await client.session.messages({ path: { id: sessionID } });
  } catch {
    return false;
  }
  const list = Array.isArray(res) ? res : res?.data;
  if (!Array.isArray(list)) return false;
  for (let i = list.length - 1; i >= 0; i--) {
    const info = list[i]?.info ?? list[i];
    if (info?.role !== "assistant") continue;
    return Boolean(info?.time?.completed);
  }
  return false;
}

// Default interval for the fallback poll in waitForIdle. Tests override
// this via opts.pollMs to avoid real multi-second waits.
const POLL_MS = 4000;

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const id = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(id);
        resolve();
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

// Block until the child session is idle (or the budget elapses).
//
// GET /session/status (client.session.status()) only reports sessions that
// are currently busy/retrying — a session that has already finished simply
// isn't present in that map, so polling it can never observe
// `{type:"idle"}` and always burns the full timeout even when the advisor
// answered in seconds. So instead we listen on the SSE event stream for
// `session.idle` / `session.status` events, bounded by an AbortController
// tied to `waitMs` so a stuck stream can't hang past the budget.
//
// This is the SECOND race in this same detection path (the first, fixed in
// 42d7bb6, was the status-polling problem described above). The second
// race was: the previous implementation checked `isAlreadyIdle()` first and
// only subscribed to the event stream if that check came back false. If the
// session transitioned to idle in the gap between that check returning and
// the subscription actually being established, `session.idle` fired with
// nobody listening yet — SSE has no replay, so the event was lost forever,
// and read_advisor burned the full `waitMs` budget even though the answer
// had been ready almost immediately (observed live: a ~93s silent gap
// against a 120s budget). The fix is to subscribe FIRST, and only check
// `isAlreadyIdle()` once that subscription is live — any transition from
// that point on is covered by the listener, closing the window entirely.
// If the post-subscribe check comes back true (session already finished
// before we even started), we abort the subscription immediately rather
// than waiting on an event that will never come.
//
// As defense in depth against any other detection gap we haven't thought
// of, a periodic fallback poll of `isAlreadyIdle()` (every `pollMs`, default
// POLL_MS) races alongside the SSE listener, so a dropped/undelivered event
// still surfaces completion within seconds instead of the full budget.
//
// Returns { idle: boolean, retry: {attempt, message, next} | null }, where
// `retry` (if present) is the most recent provider-retry status seen for
// this session, so a timeout can report *why* it's still running instead of
// a fully generic message.
export async function waitForIdle(client, sessionID, opts = {}) {
  const waitMs = opts.waitMs ?? WAIT_MS;
  const pollMs = opts.pollMs ?? POLL_MS;

  const controller = new AbortController();
  let lastRetry = null;
  let timeoutID;

  debugLog(`waitForIdle(${sessionID}): subscribing before idle check`);
  let stream = null;
  try {
    ({ stream } = await client.event.subscribe({ signal: controller.signal }));
  } catch (err) {
    debugLog(
      `waitForIdle(${sessionID}): event.subscribe failed: ` +
        `${String(err?.message ?? err)}; falling back to polling only`,
    );
  }

  if (await isAlreadyIdle(client, sessionID)) {
    debugLog(`waitForIdle(${sessionID}): already idle post-subscribe; aborting stream`);
    controller.abort();
    return { idle: true, retry: lastRetry };
  }

  // Consumes the already-established `stream` (registered above, before the
  // idle check ran) so no event delivered from this point on can be missed.
  // Deliberately never resolves to {idle:false} on its own — if the stream
  // fails or ends without observing idle, it just hangs, so only the
  // fallback poll or the final timeout (never a coincidental disconnect)
  // decides the "not idle" outcome.
  const listen = async () => {
    if (!stream) return new Promise(() => {});
    for await (const event of stream) {
      if (event?.properties?.sessionID !== sessionID) continue;
      if (event.type === "session.idle") {
        debugLog(`waitForIdle(${sessionID}): session.idle event received`);
        return { idle: true, retry: lastRetry };
      }
      if (event.type === "session.status") {
        const status = event.properties?.status;
        if (status?.type === "idle") {
          debugLog(`waitForIdle(${sessionID}): session.status idle event received`);
          return { idle: true, retry: lastRetry };
        }
        if (status?.type === "retry") lastRetry = status;
      }
    }
    debugLog(`waitForIdle(${sessionID}): event stream ended without idle`);
    return new Promise(() => {});
  };

  // Fallback poll: same never-resolve-on-"not yet" discipline as listen()
  // above, so only a genuine idle observation or the final timeout can
  // settle the race — a poll tick that merely finds "not idle yet" must
  // not prematurely report failure while the stream or a later poll tick
  // could still succeed within budget.
  const poll = async () => {
    while (!controller.signal.aborted) {
      await sleep(pollMs, controller.signal);
      if (controller.signal.aborted) break;
      if (await isAlreadyIdle(client, sessionID)) {
        debugLog(`waitForIdle(${sessionID}): fallback poll observed idle`);
        return { idle: true, retry: lastRetry };
      }
    }
    return new Promise(() => {});
  };

  const timeout = new Promise((resolve) => {
    timeoutID = setTimeout(() => {
      debugLog(`waitForIdle(${sessionID}): timed out after ${waitMs}ms`);
      resolve({ idle: false, retry: lastRetry });
    }, waitMs);
  });

  try {
    return await Promise.race([listen(), poll(), timeout]);
  } catch (err) {
    debugLog(`waitForIdle(${sessionID}): unexpected error: ${String(err?.message ?? err)}`);
    return { idle: false, retry: lastRetry };
  } finally {
    controller.abort();
    clearTimeout(timeoutID);
  }
}

export default async function advisor({ client }) {
  if (DISABLED) return {};

  return {
    tool: {
      ask_advisor: tool({
        description:
          "Ask the read-only advisor for a review or second opinion. " +
          "Creates a child session and queues the question; use read_advisor to " +
          "retrieve the answer. Max " + MAX_CALLS + " calls per session.",
        args: {
          question: tool.schema.string().describe("The question or review request"),
        },
        async execute(args, context) {
          const parentID = context.sessionID;
          const used = callCount.get(parentID) ?? 0;
          if (used >= MAX_CALLS) {
            return {
              title: "advisor limit reached",
              output:
                "Advisor call limit (" + MAX_CALLS + ") reached for this session. " +
                "Proceed with your own judgment.",
            };
          }

          let childID;
          try {
            const created = await client.session.create({
              body: { parentID, title: "advisor" },
            });
            childID = created?.data?.id ?? created?.id;
          } catch (err) {
            return {
              title: "advisor error",
              output: "Failed to create advisor session: " + String(err?.message ?? err),
            };
          }

          callCount.set(parentID, used + 1);

          try {
            await client.session.promptAsync({
              path: { id: childID },
              body: {
                agent: "advisor",
                parts: [{ type: "text", text: args.question }],
              },
            });
          } catch (err) {
            return {
              title: "advisor error",
              output: "Advisor session created (" + childID + ") but prompt failed: " +
                String(err?.message ?? err),
            };
          }

          return {
            title: "advisor asked",
            output:
              "Advisor session queued: " + childID + ". " +
              "Call read_advisor with this session ID to retrieve the answer.",
          };
        },
      }),

      read_advisor: tool({
        description:
          "Read the advisor's answer from a child session created by ask_advisor. " +
          "Blocks until the advisor finishes, then returns its answer.",
        args: {
          sessionID: tool.schema.string().describe("The advisor child session ID"),
        },
        async execute(args) {
          const { idle, retry } = await waitForIdle(client, args.sessionID);
          if (!idle) {
            const output = retry
              ? "The advisor's request is still being retried upstream (attempt " +
                retry.attempt + ": " + retry.message + "). This is a provider-side " +
                "retry, not a tool bug — call read_advisor again in a bit, or ask a " +
                "narrower question."
              : "The advisor did not finish within " + WAIT_MS / 1000 +
                "s. Call read_advisor again to retry.";
            return { title: "advisor timeout", output };
          }

          let res;
          try {
            res = await client.session.messages({ path: { id: args.sessionID } });
          } catch (err) {
            return {
              title: "advisor error",
              output: "Failed to read advisor session: " + String(err?.message ?? err),
            };
          }
          const advice = extractAdvice(res);
          if (!advice) {
            return {
              title: "advisor empty",
              output: "The advisor finished but produced no text answer.",
            };
          }
          return { title: "advisor answer", output: advice };
        },
      }),
    },
  };
}
