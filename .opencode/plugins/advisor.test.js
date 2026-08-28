// Unit tests for advisor.js's waitForIdle(), using a fully mocked `client`.
//
// These exercise the SSE-subscribe-before-idle-check race fix (see the long
// comment above waitForIdle in advisor.js) without needing a real opencode
// server. Run with: node --test .opencode/plugins/advisor.test.js
//
// opts.waitMs / opts.pollMs let each case use short, deterministic budgets
// instead of the real 120s / 4s defaults.

import { test } from "node:test";
import assert from "node:assert/strict";
import { waitForIdle } from "./advisor.js";

// Builds a minimal async-iterable SSE stream from a list of events, each
// optionally delayed. Mimics the shape `client.event.subscribe()` resolves
// to: `{ stream }` where `stream` is an async iterable of event objects.
function fakeStream(events) {
  return (async function* () {
    for (const { delayMs = 0, event } of events) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      yield event;
    }
  })();
}

// Builds a mock client. `messagesSequence` is a queue of booleans consumed
// in order by successive `client.session.messages()` calls, each mapped to
// "last assistant message has time.completed set" (i.e. isAlreadyIdle's
// answer). `subscribe` is the fn called for `client.event.subscribe()`.
function fakeClient({ messagesSequence, subscribe }) {
  let i = 0;
  return {
    session: {
      async messages() {
        const completed = messagesSequence[Math.min(i, messagesSequence.length - 1)];
        i++;
        return {
          data: [
            {
              info: {
                role: "assistant",
                time: completed ? { completed: Date.now() } : {},
              },
              parts: [],
            },
          ],
        };
      },
    },
    event: {
      subscribe: subscribe ?? (async () => ({ stream: fakeStream([]) })),
    },
  };
}

test("already-idle case: returns {idle:true} immediately without waiting on any stream", async () => {
  const client = fakeClient({
    // First isAlreadyIdle check (post-subscribe) already sees completion.
    messagesSequence: [true],
    subscribe: async () => ({ stream: fakeStream([]) }),
  });

  const result = await waitForIdle(client, "s1", { waitMs: 5000, pollMs: 1000 });
  assert.deepEqual(result, { idle: true, retry: null });
});

test("race case: session goes idle (and event fires) in the gap between the idle check and the subscription being established", async () => {
  const client = fakeClient({
    // Post-subscribe isAlreadyIdle check: not yet idle. The session.idle
    // event arrives shortly after via the stream that was already
    // subscribed before that check ran.
    messagesSequence: [false, false],
    subscribe: async () => ({
      stream: fakeStream([
        {
          delayMs: 10,
          event: { type: "session.idle", properties: { sessionID: "s2" } },
        },
      ]),
    }),
  });

  const result = await waitForIdle(client, "s2", { waitMs: 5000, pollMs: 1000 });
  assert.deepEqual(result, { idle: true, retry: null });
});

test("fallback-poll case: SSE stream never emits idle, but the fallback poll observes completion via the idle check", async () => {
  const client = fakeClient({
    // post-subscribe check: false. Then poll ticks: false, then true.
    messagesSequence: [false, false, true],
    subscribe: async () => ({ stream: fakeStream([]) }), // stream ends immediately, no idle event
  });

  const result = await waitForIdle(client, "s3", { waitMs: 5000, pollMs: 20 });
  assert.deepEqual(result, { idle: true, retry: null });
});

test("timeout case: neither the stream nor the poll ever observes idle -> {idle:false} after the budget", async () => {
  const client = fakeClient({
    messagesSequence: [false],
    subscribe: async () => ({ stream: fakeStream([]) }),
  });

  const result = await waitForIdle(client, "s4", { waitMs: 150, pollMs: 1000 });
  assert.deepEqual(result, { idle: false, retry: null });
});

test("retry tracking: a session.status retry event is captured and returned on timeout", async () => {
  const client = fakeClient({
    messagesSequence: [false],
    subscribe: async () => ({
      stream: fakeStream([
        {
          delayMs: 10,
          event: {
            type: "session.status",
            properties: {
              sessionID: "s5",
              status: { type: "retry", attempt: 1, message: "rate limited" },
            },
          },
        },
      ]),
    }),
  });

  const result = await waitForIdle(client, "s5", { waitMs: 150, pollMs: 1000 });
  assert.equal(result.idle, false);
  assert.deepEqual(result.retry, { type: "retry", attempt: 1, message: "rate limited" });
});
