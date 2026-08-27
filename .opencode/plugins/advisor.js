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
import { tool } from "@opencode-ai/plugin";

const DISABLED = process.env.OPENCODE_ADVISOR_DISABLE === "1";

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

// Block until the child session is idle (or the budget elapses).
//
// GET /session/status (client.session.status()) only reports sessions that
// are currently busy/retrying — a session that has already finished simply
// isn't present in that map, so polling it can never observe
// `{type:"idle"}` and always burns the full timeout even when the advisor
// answered in seconds. Instead: check whether the session is already done
// (via its last message), and if not, listen on the SSE event stream for
// `session.idle` / `session.status` events, bounded by an AbortController
// tied to WAIT_MS so a stuck stream can't hang past the budget.
//
// Returns { idle: boolean, retry: {attempt, message, next} | null }, where
// `retry` (if present) is the most recent provider-retry status seen for
// this session, so a timeout can report *why* it's still running instead of
// a fully generic message.
async function waitForIdle(client, sessionID) {
  if (await isAlreadyIdle(client, sessionID)) {
    return { idle: true, retry: null };
  }

  const controller = new AbortController();
  let lastRetry = null;
  let timeoutID;

  const listen = async () => {
    const { stream } = await client.event.subscribe({ signal: controller.signal });
    for await (const event of stream) {
      if (event?.properties?.sessionID !== sessionID) continue;
      if (event.type === "session.idle") return { idle: true, retry: lastRetry };
      if (event.type === "session.status") {
        const status = event.properties?.status;
        if (status?.type === "idle") return { idle: true, retry: lastRetry };
        if (status?.type === "retry") lastRetry = status;
      }
    }
    // Stream ended without ever seeing this session go idle.
    return { idle: false, retry: lastRetry };
  };

  const timeout = new Promise((resolve) => {
    timeoutID = setTimeout(() => resolve({ idle: false, retry: lastRetry }), WAIT_MS);
  });

  try {
    return await Promise.race([listen(), timeout]);
  } catch {
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
