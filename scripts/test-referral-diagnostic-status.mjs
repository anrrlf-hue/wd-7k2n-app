import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import http from "node:http";

process.env.SAJU_REFERRAL_ENABLED = "true";
process.env.SAJU_REFERRAL_REALM = "live";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

const server = http.createServer((request, response) => {
  if (!request.url?.startsWith("/rest/v1/referral_invites")) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(401, { "content-type": "application/json" });
  response.end(JSON.stringify({ code: "42501", message: "denied" }));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;

const { parseSafeFetchDiagnostic, validateReferralInvite } = await import("../src/lib/referral-store.ts");
assert.deepEqual(parseSafeFetchDiagnostic("TypeError: Cannot convert argument to a ByteString because the character at index 0 has a value greater than 255"), {
  exceptionName: "TypeError",
  category: "invalid-header-bytestring",
  causeCode: null,
});
assert.deepEqual(parseSafeFetchDiagnostic("TypeError: Invalid header value"), {
  exceptionName: "TypeError",
  category: "invalid-header-value",
  causeCode: null,
});
const originalError = console.error;
const originalFetch = globalThis.fetch;
const logs = [];
console.error = (...args) => logs.push(JSON.parse(args.join(" ").replace("[referral-store-unavailable] ", "")));
try {
  assert.equal(await validateReferralInvite({ token: "A".repeat(43), inviterSessionId: "session" }), "unavailable");
  assert.deepEqual(logs.at(-1), {
    code: "query_error",
    status: 401,
    errorCode: "42501",
    exceptionName: null,
    fetchCategory: null,
    causeCode: null,
    timedOut: false,
    enabled: true,
    realmConfigured: true,
    realmValid: true,
    urlConfigured: true,
    publishableKeyConfigured: true,
    serviceRoleKeyConfigured: true,
  });

  globalThis.fetch = async () => ({ status: 0, statusText: "", ok: false, text: async () => "" });
  assert.equal(await validateReferralInvite({ token: "B".repeat(43), inviterSessionId: "session" }), "unavailable");
  assert.equal(logs.at(-1).status, 0);
  assert.equal(logs.at(-1).exceptionName, null);
  assert.equal(logs.at(-1).errorCode, null);
} finally {
  console.error = originalError;
  globalThis.fetch = originalFetch;
  server.close();
}

console.log("PASS referral diagnostics: top-level HTTP status 401/0 is preserved safely");
