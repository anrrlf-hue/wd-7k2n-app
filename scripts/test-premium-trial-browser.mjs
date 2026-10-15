// Referral-gated contract test. It deliberately expects fail-closed behavior
// when the local server has no configured persistent referral store. It does
// not claim a real delivery, acquisition, or multi-session reward.
import assert from "node:assert/strict";
import { birthFixture } from "./fixtures/palm-analysis.mjs";

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3105";
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const input = { ...birthFixture, mbti: null, leftPalmFacts: null, rightPalmFacts: null, dominantHand: null };

async function api(body, headers = {}) {
  const response = await fetch(BASE + "/api/premium-report", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { response, status: response.status, data: await response.json() };
}

const direct = await api(input);
assert.equal(direct.status, 503, "unavailable referral store fails closed distinctly");
const participation = await api({ ...input, trialAction: "participate", participation: "clipboard" });
assert.equal(participation.status, 400, "client participation strings cannot issue receipts");
assert.equal(participation.data.trialReceipt, undefined);
const unavailable = await api({ ...input, trialAction: "verify" });
assert.equal(unavailable.status, 503, "missing persistent store is reported as unavailable");
assert.equal(unavailable.data.trialReceipt, undefined);

const malformedCookie = await api(input, { cookie: "saju_referral_session=malformed" });
assert.equal(malformedCookie.status, 503);
assert.match(malformedCookie.response.headers.get("set-cookie") ?? "", /saju_referral_session=/, "malformed cookie is replaced");

console.log("PASS premium referral contract: participation=400, missing store=503, receipt absent, malformed cookie replaced");
