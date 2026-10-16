import assert from "node:assert/strict";
import "./register-test-typescript.mjs";

const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");

const facts = computeSajuFacts({ year: 1995, month: 3, day: 12, hour: 9, minute: 0, gender: "남" });
const freeReport = buildFreeSajuReport(facts);
const connected = buildPremiumReport({ facts, freeReport, referenceDate: new Date("2026-10-16T00:00:00Z") });
const disconnected = buildPremiumReport({ facts, referenceDate: new Date("2026-10-16T00:00:00Z") });

assert.deepEqual(connected.overall.paragraphs, disconnected.overall.paragraphs);
assert.ok(connected.domains.every((domain) => domain.paragraphs.length === 2));
assert.ok(connected.domains.every((domain) => !domain.paragraphs.some((paragraph) => /장면 실제|장면 기준|자리 잘해|자리 책임/.test(paragraph))));

console.log("free-premium bridge: passed");
