import "./register-test-typescript.mjs";
import assert from "node:assert/strict";

process.env.SAJU_REFERRAL_ENABLED = "true";
process.env.SAJU_REFERRAL_REALM = "live";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

const { validateReferralInvite } = await import("../src/lib/referral-store.ts");
const originalError = console.error;
const originalFetch = globalThis.fetch;
const logs = [];
console.error = (...args) => logs.push(JSON.parse(args.join(" ").replace("[referral-store-unavailable] ", "")));
try {
  globalThis.fetch = async () => {
    throw Object.assign(new TypeError("Headers.append: invalid header value"), { cause: { code: "ERR_INVALID_CHAR" } });
  };
  assert.equal(await validateReferralInvite({ token: "A".repeat(43), inviterSessionId: "session" }), "unavailable");
  assert.equal(logs.at(-1).status, 0);
  assert.equal(logs.at(-1).exceptionName, "TypeError");
  assert.equal(logs.at(-1).fetchCategory, "invalid-header-value");
  assert.equal(logs.at(-1).causeCode, null);

  globalThis.fetch = async () => {
    throw new TypeError("ByteString conversion failed");
  };
  assert.equal(await validateReferralInvite({ token: "C".repeat(43), inviterSessionId: "session" }), "unavailable");
  assert.equal(logs.at(-1).fetchCategory, "invalid-header-bytestring");
  assert.equal(logs.at(-1).causeCode, null);

  globalThis.fetch = async () => {
    throw new TypeError("Invalid header value");
  };
  assert.equal(await validateReferralInvite({ token: "D".repeat(43), inviterSessionId: "session" }), "unavailable");
  assert.equal(logs.at(-1).fetchCategory, "invalid-header-value");
  assert.equal(logs.at(-1).causeCode, null);

  globalThis.fetch = async () => {
    throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
  };
  assert.equal(await validateReferralInvite({ token: "B".repeat(43), inviterSessionId: "session" }), "unavailable");
  assert.equal(logs.at(-1).status, 0);
  assert.equal(logs.at(-1).exceptionName, "TypeError");
  assert.equal(logs.at(-1).fetchCategory, "fetch-failed");
  assert.equal(logs.at(-1).causeCode, "ENOTFOUND");
  assert.ok(!JSON.stringify(logs.at(-1)).includes("invalid header value"));
  assert.ok(!JSON.stringify(logs.at(-1)).includes("example.supabase.co"));
} finally {
  console.error = originalError;
  globalThis.fetch = originalFetch;
}

console.log("PASS referral fetch diagnostics: safe invalid-header/network categories and cause allowlist");
