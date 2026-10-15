import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import http from "node:http";

process.env.SAJU_REFERRAL_ENABLED = "true";
process.env.SAJU_REFERRAL_REALM = "live";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

let mode = "slow-body";
let requests = 0;
const server = http.createServer((request, response) => {
  if (request.url?.startsWith("/rest/v1/referral_invites")) {
    requests += 1;
    if (mode === "retry") {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ code: "PGRST000", message: "temporary" }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.flushHeaders();
    setTimeout(() => response.end("[]"), 9_000);
    return;
  }
  response.writeHead(404);
  response.end();
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;

const { validateReferralInvite } = await import("../src/lib/referral-store.ts");
const originalError = console.error;
console.error = () => {};
try {
  const started = Date.now();
  assert.equal(await validateReferralInvite({ token: "A".repeat(43), inviterSessionId: "s" }), "unavailable");
  assert.ok(Date.now() - started < 8_700, "body timeout must cancel the response read");

  mode = "retry";
  requests = 0;
  assert.equal(await validateReferralInvite({ token: "B".repeat(43), inviterSessionId: "s" }), "unavailable");
  assert.equal(requests, 1, "referral GET must not retry after a transient response");
} finally {
  console.error = originalError;
  server.close();
}

console.log("PASS referral deadline: body-read abort is bounded and GET retry is disabled");
