import "./register-test-typescript.mjs";
import assert from "node:assert/strict";

process.env.SAJU_REFERRAL_ENABLED = "true";
process.env.SAJU_REFERRAL_REALM = "live";
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const { validateReferralInvite } = await import("../src/lib/referral-store.ts");
const originalError = console.error;
const logs = [];
console.error = (...args) => logs.push(args.join(" "));
try {
  const result = await validateReferralInvite({
    token: "A".repeat(43),
    inviterSessionId: "saju-session-test",
  });
  assert.equal(result, "unavailable");
} finally {
  console.error = originalError;
}

assert.equal(logs.length, 1);
const diagnostic = JSON.parse(logs[0].replace("[referral-store-unavailable] ", ""));
assert.equal(diagnostic.code, "config_missing");
assert.deepEqual(diagnostic, {
  code: "config_missing",
  status: null,
  errorCode: null,
  exceptionName: null,
  fetchCategory: null,
  causeCode: null,
  timedOut: false,
  enabled: true,
  realmConfigured: true,
  realmValid: true,
  urlConfigured: false,
  publishableKeyConfigured: false,
  serviceRoleKeyConfigured: false,
});
assert.ok(!logs[0].includes("saju-session-test"));
assert.ok(!logs[0].includes("A".repeat(43)));
assert.ok(!logs[0].includes("SUPABASE_SERVICE_ROLE_KEY"));
console.log("PASS referral diagnostics: allowlisted reason and boolean config flags only");
