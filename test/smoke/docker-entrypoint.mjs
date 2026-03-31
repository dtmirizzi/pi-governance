/**
 * Docker smoke test for https://github.com/dtmirizzi/pi-governance/issues/1
 *
 * Exercises the extension inside a minimal container where
 * ctx.workingDirectory is undefined — the exact failure scenario.
 *
 * Exit 0 = pass, non-zero = fail.
 */

import piGovernance from "@grwnd/pi-governance";

// Minimal mock of the Pi ExtensionAPI
const handlers = {
  session_start: [],
  session_shutdown: [],
  tool_call: [],
  tool_result: [],
};

const api = {
  on(event, handler) {
    handlers[event].push(handler);
  },
  registerCommand() {},
};

piGovernance(api);

// Simulate Docker context: workingDirectory is undefined
const ctx = {
  ui: {
    confirm: async () => true,
    notify: () => {},
    setStatus: () => {},
  },
  sessionId: "smoke-test-1",
  workingDirectory: undefined,
};

// session_start must not throw
for (const h of handlers.session_start) {
  await h({}, ctx);
}

// A basic tool_call must not throw
for (const h of handlers.tool_call) {
  await h({ toolName: "read", input: { path: "/tmp/test.ts" } }, ctx);
}

// session_shutdown must not throw
for (const h of handlers.session_shutdown) {
  await h({}, ctx);
}

console.log("Docker smoke test passed");
