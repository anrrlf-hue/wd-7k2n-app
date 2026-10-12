import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
const { acceptAnalytics } = await import("../src/lib/analytics-ingest.ts");
const { track } = await import("../src/lib/analytics.ts");

const row = { event: "reading_started", eventId: "e".repeat(20), sessionId: "s".repeat(20), readingId: "r".repeat(20), path: "/palm", props: { flow: "palm" } };
const request = value => new Request("http://localhost/api/analytics", { method: "POST", body: JSON.stringify(value) });
const emitted = [];
const emit = value => emitted.push(value);
assert.equal((await acceptAnalytics({ get body() { throw Error("OFF MUST NOT READ BODY"); } }, {}, emit)).status, 204);
assert.equal((await acceptAnalytics(request(row), { enabled: "true" }, emit)).status, 204);
assert.equal(emitted.length, 0);
for (const realm of ["TEST", "LIVE"]) {
  assert.equal((await acceptAnalytics(request(row), { enabled: "true", realm }, emit)).status, 204);
  assert.equal(emitted.at(-1).realm, realm);
}
for (const value of [{ ...row, birthDate: "PRIVATE_CANARY" }, { ...row, path: "/palm?birthDate=PRIVATE_CANARY" },
  { ...row, props: { question: "PRIVATE_CANARY" } }, { ...row, realm: "LIVE" }]) {
  assert.equal((await acceptAnalytics(request(value), { enabled: "true", realm: "TEST" }, emit)).status, 400);
}
assert.equal((await acceptAnalytics(request({ ...row, raw: "x".repeat(5000) }), { enabled: "true", realm: "TEST" }, emit)).status, 413);

let storageReads = 0;
const state = new Map();
globalThis.window = { location: { pathname: "/palm" } };
globalThis.sessionStorage = { getItem(k) { storageReads++; return state.get(k) ?? null; }, setItem(k, v) { state.set(k, v); } };
const bodies = [];
Object.defineProperty(globalThis, "navigator", { configurable: true, value: { sendBeacon(_url, body) { bodies.push(body); return true; } } });
delete process.env.NEXT_PUBLIC_SAJU_ANALYTICS_ENABLED;
track("landing_viewed");
assert.equal(storageReads, 0);
assert.equal(bodies.length, 0);
process.env.NEXT_PUBLIC_SAJU_ANALYTICS_ENABLED = "true";
track("reading_started", { flow: "palm", birthDate: "PRIVATE_CANARY", focus: "PRIVATE_CANARY" });
track("reading_started"); // Second hand belongs to same reading.
track("analysis_retry");
track("free_report_completed");
track("result_viewed");
track("link_copied");
track("reading_started");
const payloads = await Promise.all(bodies.map(async b => JSON.parse(await b.text())));
assert.equal(payloads[0].readingId, payloads[1].readingId);
assert.equal(payloads[0].readingId, payloads[5].readingId);
assert.notEqual(payloads[0].readingId, payloads[6].readingId);
assert.equal(new Set(payloads.map(x => x.eventId)).size, payloads.length);
assert.equal(JSON.stringify(payloads).includes("PRIVATE_CANARY"), false);
const key = [...state.keys()][0];
const expired = JSON.parse(state.get(key));
expired.lastAt -= 31 * 60 * 1000;
state.set(key, JSON.stringify(expired));
track("landing_viewed");
const fresh = JSON.parse(await bodies.at(-1).text());
assert.notEqual(fresh.sessionId, expired.id);
assert.equal(fresh.readingId, null);
let fallbackCalls = 0;
navigator.sendBeacon = () => false;
globalThis.fetch = async () => { fallbackCalls++; return new Response(null, { status: 204 }); };
track("share_cancelled");
assert.equal(fallbackCalls, 1);
delete process.env.NEXT_PUBLIC_SAJU_ANALYTICS_ENABLED;
console.log("PASS analytics: OFF has no reads/logs/sends; TEST/LIVE server provenance; PII/size rejection; reading continuity, expiry, beacon fallback.");
