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

// Poll interval and total budget for read_advisor's internal wait.
const POLL_MS = 500;
const WAIT_MS = 120000;

// Per-parent-session call counter (in-process).
const callCount = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

// Block until the child session is idle (or the budget elapses), polling the
// session status endpoint. Returns true if idle, false on timeout.
async function waitForIdle(client, sessionID) {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    let status;
    try {
      status = await client.session.status();
    } catch {
      return false;
    }
    const s = status?.data?.[sessionID] ?? status?.[sessionID];
    if (s?.type === "idle") return true;
    await sleep(POLL_MS);
  }
  return false;
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
          const idle = await waitForIdle(client, args.sessionID);
          if (!idle) {
            return {
              title: "advisor timeout",
              output:
                "The advisor did not finish within " + WAIT_MS / 1000 +
                "s. Call read_advisor again to retry.",
            };
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
