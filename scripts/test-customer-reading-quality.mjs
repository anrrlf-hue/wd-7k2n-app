// Offline customer-quality contract for the two reviewed cases.
// Fixed reference date: 2026-10-13 UTC. No model, network, or photo upload.
import assert from "node:assert/strict";
import "./register-test-typescript.mjs";
import { palmFixture } from "./fixtures/palm-analysis.mjs";

const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");

const referenceDate = new Date("2026-10-13T00:00:00Z");
const cases = [
  { id: "A", year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { id: "B", year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
];
const leftPalm = { ...structuredClone(palmFixture), handSide: "left" };
const rightPalm = structuredClone(palmFixture);

const reviewed = cases.map(({ id, ...birth }) => {
  const facts = enrichSajuFacts(computeSajuFacts(birth), birth);
  const free = buildFreeSajuReport(facts, { mbti: null, check: null });
  const premium = buildPremiumReport({ facts, freeReport: free, referenceDate, leftPalm, rightPalm, dominantHand: "right" });
  return { id, facts, free, premium };
});

assert.notDeepEqual(reviewed[0].facts.keyRelations, reviewed[1].facts.keyRelations, "A/B must retain different calculated relations");
assert.notEqual(reviewed[0].premium.overall.paragraphs[1], reviewed[1].premium.overall.paragraphs[1], "overall outside-work reading must follow chart composition");
assert.match(reviewed[0].premium.overall.paragraphs[1], /배움|표현|쉬며|회복/, "A overall must include a chart-grounded life-outside-work lens");
assert.match(reviewed[0].premium.domains.find(domain => domain.key === "love_relationship").paragraphs.join(" "), /조언|약속|신뢰/, "A relationship must use trust/care combination");
assert.match(reviewed[1].premium.domains.find(domain => domain.key === "love_relationship").paragraphs.join(" "), /공간|생활|표현/, "B relationship must use space/expression combination");
assert.notEqual(reviewed[0].free.nextMove.text, reviewed[0].free.timingShift.text, "A current/next daeun conclusions must differ");
assert.notEqual(reviewed[1].free.nextMove.text, reviewed[1].free.timingShift.text, "B current/next daeun conclusions must differ");
for (const { free } of reviewed) {
  for (const paragraph of [free.nextMove.text, free.timingShift.text]) {
    assert.doesNotMatch(paragraph, /(.+?)과 \1을 함께 읽습니다/, "daeun prose must not repeat the same ten-god phrase");
  }
}

assert.notEqual(reviewed[0].free.leakPattern.text, reviewed[1].free.leakPattern.text, "A/B leak pattern must not leak");
assert.notEqual(reviewed[0].free.soloStrength.text, reviewed[1].free.soloStrength.text, "A/B solo strength must not leak");
assert.doesNotMatch(reviewed[0].free.snapshot.text, /나무의 쓰임/, "A has no wood element");
assert.match(reviewed[1].free.snapshot.text, /나무의 쓰임/, "B has observed wood element");

for (const { premium } of reviewed) {
  const body = JSON.stringify(premium);
  assert.doesNotMatch(body, /운명선 후보/, "candidate fate line is not a premium money/month basis");
  assert.doesNotMatch(body, /투자 결과가 확정|투자 성과가 확정|수익이 확정|건강이 좋아진다|수명이 늘어난다/);
  assert.equal(new Set(premium.periods.map(period => period.reading)).size, premium.periods.length, "monthly prose remains distinct");
  const monthly = premium.periods.map(period => period.reading).join(" ");
  assert.equal((monthly.match(/이미 할 수 있는 부분과 도움을 받아 더 편해질 부분을 같이 남길 여지를 줍니다/g) ?? []).length, 0);
  assert.equal((monthly.match(/도움받은 흔적이 자신의 만족을 작게 만들지는 않을 수 있습니다/g) ?? []).length, 0);
  const love = premium.domains.find(domain => domain.key === "love_relationship").paragraphs.join(" ");
  const money = premium.domains.find(domain => domain.key === "money").paragraphs.join(" ");
  const work = premium.domains.find(domain => domain.key === "work").paragraphs.join(" ");
  assert.match(love, /관계|상대|친밀함/);
  assert.match(money, /재물|대가|지출|유지/);
  assert.match(work, /일|환경|성과|업무/);
  assert.ok(premium.periods.every(period => period.symbols?.month?.ganzhi && period.basis.includes(period.symbols.month.ganzhi)), "each month retains its calculated month evidence");
}

const repeat = buildPremiumReport({ facts: reviewed[0].facts, freeReport: reviewed[0].free, referenceDate, leftPalm, rightPalm, dominantHand: "right" });
assert.deepEqual(repeat, reviewed[0].premium, "same chart/reference date must be deterministic");

console.log("PASS customer reading quality: A/B distinct free domains, evidence-gated element and palm prose, unique monthly closures, safe boundaries");
