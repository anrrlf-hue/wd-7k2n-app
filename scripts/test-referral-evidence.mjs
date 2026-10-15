import assert from "node:assert/strict";
import fs from "node:fs";
import "./register-test-typescript.mjs";
const { createAnonymousSessionId, createOpaqueReferralToken, getReferralRealm, hashReferralValue, isReferralEnabled, isReferralToken, REFERRAL_CAMPAIGN } = await import("../src/lib/referral.ts");

const token = createOpaqueReferralToken();
const session = createAnonymousSessionId();
assert.equal(isReferralToken(token), true);
assert.equal(token.length, 43);
assert.equal(session.length, 43);
assert.notEqual(hashReferralValue(token), token);
assert.equal(hashReferralValue(token), hashReferralValue(token));
delete process.env.SAJU_REFERRAL_ENABLED;
delete process.env.SAJU_REFERRAL_REALM;
assert.equal(isReferralEnabled(), false);
assert.equal(getReferralRealm(), null);
process.env.SAJU_REFERRAL_ENABLED = "true";
process.env.SAJU_REFERRAL_REALM = "test";
assert.equal(isReferralEnabled(), true);
assert.equal(getReferralRealm(), "test");

const migration = fs.readFileSync(new URL("../supabase/migrations/20261015000000_referral_evidence.sql", import.meta.url), "utf8");
for (const required of [
  "referral_invites", "referral_rewards", "realm", "expires_at", "recipient_session_hash",
  "unique (realm, campaign_key, inviter_session_hash)", "unique (realm, campaign_key, recipient_session_hash)",
  "self_referral", "claim_referral_reward", "for update",
]) assert.match(migration, new RegExp(required.replace(/[()]/g, "\\$&")), required);

const service = fs.readFileSync(new URL("../src/lib/referral-store.ts", import.meta.url), "utf8");
assert.match(service, /SUPABASE_SERVICE_ROLE_KEY/);
assert.match(service, /return \{ kind: "unavailable" \}/);
assert.match(service, /claim_referral_reward/);
assert.match(service, /p_realm/);
assert.match(service, /STORE_TIMEOUT_MS = 8000/);
assert.match(service, /withReferralDeadline/);
assert.match(service, /\.abortSignal\(signal\)/);
assert.match(service, /\.retry\(false\)/);
assert.match(service, /timedOut/);
assert.match(service, /SAFE_POSTGREST_ERROR_CODES/);
assert.match(service, /getReferralRewardStatus/);
const client = fs.readFileSync(new URL("../src/lib/referral-client.ts", import.meta.url), "utf8");
assert.match(client, /REFERRAL_CLIENT_TIMEOUT_MS = 10_000/);
assert.match(client, /controller\.abort\(\)/);

const premiumRoute = fs.readFileSync(new URL("../src/app/api/premium-report/route.ts", import.meta.url), "utf8");
assert.doesNotMatch(premiumRoute, /raw\.participation/);
assert.match(premiumRoute, /isReferralStoreConfigured/);
assert.match(premiumRoute, /status: "unavailable"/);
assert.match(premiumRoute, /status: "pending"/);
const sajuRoute = fs.readFileSync(new URL("../src/app/api/saju/route.ts", import.meta.url), "utf8");
assert.match(sajuRoute, /claimReferralReward/);
assert.match(sajuRoute, /qualifiesForReferral/);
assert.equal(REFERRAL_CAMPAIGN, "premium-referral-v1");
console.log("PASS referral token/session hashing, realm/rollout contract, fail-closed store contract, and server-side claim guard source checks");
