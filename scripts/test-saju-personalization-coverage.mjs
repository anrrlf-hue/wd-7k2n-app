import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
const { computeSajuFacts, TEN_GOD_GROUP } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildCustomerFreeNarrative, buildCustomerPremiumNarrative } = await import("../src/lib/saju-customer-narrative.ts");
const { buildPremiumMonthNarrative } = await import("../src/lib/premium-month-narrative.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const { describeAnnualMonthSymbols } = await import("../src/lib/saju-timing.ts");

const weakConnection = "이 마음을 혼자 지켜 내야 한다는 긴장이 함께하는 사람들 속에서 조금 풀릴 수 있지만, 서로 힘이 되는 것과 모두의 바람까지 내 몫으로 받아들이는 일은 다르게 남습니다.";
const strongConnection = "설명이 늘어날수록 처음 정한 답만 더 단단해질 수 있어, 직접 겪고 편해졌던 한 순간이 다른 답을 가리킨다면 그 차이도 자기 판단 안에 들어올 자리가 필요합니다.";

const births = [
  { pair: "1975-08-21 20:00 남/1964-11-11 02:00 남", values: [
    { year: 1975, month: 8, day: 21, hour: 20, minute: 0, gender: "남" },
    { year: 1964, month: 11, day: 11, hour: 2, minute: 0, gender: "남" },
  ] },
  { pair: "1997-03-08 09:10 여/21:10 여", values: [
    { year: 1997, month: 3, day: 8, hour: 9, minute: 10, gender: "여" },
    { year: 1997, month: 3, day: 8, hour: 21, minute: 10, gender: "여" },
  ] },
  { pair: "2001-02-03 12:00 남/여", values: [
    { year: 2001, month: 2, day: 3, hour: 12, minute: 0, gender: "남" },
    { year: 2001, month: 2, day: 3, hour: 12, minute: 0, gender: "여" },
  ] },
];
const referenceDate = new Date("2026-10-13T00:00:00Z");
const read = birth => {
  const shallow = computeSajuFacts(birth);
  return birth.hour == null ? shallow : enrichSajuFacts(shallow, birth);
};
const samples = births.flatMap(({ pair, values }) => values.map((birth, index) => {
  const facts = read(birth);
  const free = buildFreeSajuReport(facts, { mbti: null, check: null });
  const customerFree = buildCustomerFreeNarrative(facts);
  const customerPremium = buildCustomerPremiumNarrative(facts);
  const report = buildPremiumReport({ facts, freeReport: free, referenceDate });
  const firstMonth = report.annual.months[0];
  const month = buildPremiumMonthNarrative(facts, firstMonth, null).plan;
  const monthlyPlans = report.annual.months.map((annualMonth, monthIndex) =>
    buildPremiumMonthNarrative(facts, annualMonth, report.annual.months[monthIndex - 1] ?? null).plan
  );
  assert.ok(month.evidence.some(e => e.id === "peerStarCount" || e.id === "strength" || e.id === "daeun"), "customer month keeps calculated context evidence");
  for (const plan of monthlyPlans) {
    if (plan.evidence.some(e => e.id === "natal-anchor")) {
      assert.ok(plan.passages.some(p => p.evidenceIds.includes("natal-anchor")), "the preserved natal anchor is used by customer prose");
    }
  }
  report.annual.months.forEach((annualMonth, monthIndex) => {
    const symbols = describeAnnualMonthSymbols(facts, annualMonth);
    const expectedWeak = facts.dayStrengthReliable && facts.dayStrength === "weak" &&
      TEN_GOD_GROUP[symbols.month.stemTenGod] === "비겁" && TEN_GOD_GROUP[symbols.month.branchTenGod] === "비겁";
    const expectedStrong = facts.dayStrengthReliable && facts.dayStrength === "strong" &&
      symbols.month.stemTenGod === "편인" && symbols.month.branchTenGod === "비견";
    const text = monthlyPlans[monthIndex].passages.find(p => p.id === "month-lived-scene")?.text ?? "";
    assert.equal(text.includes(weakConnection), expectedWeak, "weak connection is limited to calculated peer/peer months");
    assert.equal(text.includes(strongConnection), expectedStrong, "strong connection is limited to calculated 편인/비견 months");
  });
  return {
    pair, index: index + 1, birth, calculated: {
      dayStem: facts.dayStem, dayElement: facts.dayElement, counts: {
        peer: facts.peerStarCount, output: facts.outputStarCount, wealth: facts.wealthStarCount,
        officer: facts.officerStarCount, resource: facts.resourceStarCount,
      }, dayStrength: facts.dayStrengthReliable ? facts.dayStrength : null,
      currentDaeun: facts.currentDaeun ? { ganzhi: facts.currentDaeun.ganzhi, stemTenGod: facts.currentDaeun.stemTenGod, branchTenGod: facts.currentDaeun.branchTenGod } : null,
    },
    customerOutput: {
      relationship: customerFree.relationshipStyle.text,
      love: customerFree.loveStyle.text,
      wealthStructure: customerFree.wealthStructure.text,
      earning: customerFree.earningStyle.text,
      premiumLove: customerPremium.love[0], premiumMoney: customerPremium.money[0],
      firstMonth: { headline: month.headline, passages: month.passages.map(p => ({ id: p.id, text: p.text })) },
      monthly: monthlyPlans.map(plan => ({ headline: plan.headline, passages: plan.passages.map(p => ({ id: p.id, text: p.text })) })),
      keyMonths: Object.fromEntries(["2026년 10월", "2027년 2월", "2027년 6월"].map(label => {
        const index = report.annual.months.findIndex(month => month.label === label);
        const plan = monthlyPlans[index];
        return [label, { headline: plan.headline, passages: plan.passages.map(p => ({ id: p.id, text: p.text })) }];
      })),
    },
  };
}));

for (const [left, right] of [[samples[0], samples[1]], [samples[2], samples[3]], [samples[4], samples[5]]]) {
  const daeunDiffers = JSON.stringify(left.calculated.currentDaeun) !== JSON.stringify(right.calculated.currentDaeun);
  const countsDiffer = JSON.stringify(left.calculated.counts) !== JSON.stringify(right.calculated.counts);
  const strengthDiffers = left.calculated.dayStrength !== right.calculated.dayStrength;
  const outputFields = ["relationship", "love", "wealthStructure", "earning", "premiumLove", "premiumMoney"];
  const changedOutputs = outputFields.filter(field => left.customerOutput[field] !== right.customerOutput[field]);
  const monthlyBodyDiffers = JSON.stringify(left.customerOutput.monthly.map(month => month.passages.map(p => p.text))) !==
    JSON.stringify(right.customerOutput.monthly.map(month => month.passages.map(p => p.text)));
  if (monthlyBodyDiffers) changedOutputs.push("monthlyBody");
  const outputDiffers = changedOutputs.length > 0;
  const establishedConditions = [
    daeunDiffers ? "currentDaeun" : null,
    countsDiffer ? "natalProportions" : null,
    strengthDiffers ? "dayStrength" : null,
  ].filter(Boolean);
  left.comparison = {
    conditions: { daeunDiffers, countsDiffer, strengthDiffers },
    establishedConditions,
    changedOutputs,
    monthlyBodyDiffers,
    outputDiffers,
    status: establishedConditions.length === 0 ? "unverified" : outputDiffers ? "verified" : "failed",
  };
  assert.notEqual(left.comparison.status, "failed", `${left.pair}: established input condition changed but customer body did not`);
}
const zeroOutput = samples.filter(s => s.calculated.counts.output === 0 && s.calculated.counts.wealth > 0);
for (const sample of zeroOutput) {
  assert.doesNotMatch(sample.customerOutput.earning, /표현|만든|창작|취향을 담아/);
  assert.doesNotMatch(sample.customerOutput.premiumMoney, /표현|만든|창작|취향을 담아/);
  assert.doesNotMatch(sample.customerOutput.wealthStructure, /표현한 것|좋아서 만든 것|창작/);
}
const artifact = process.env.SAJU_PERSONALIZATION_ARTIFACT ?? "docs/verification/saju-personalization-coverage-2026-10-14.json";
fs.writeFileSync(artifact, JSON.stringify({ generatedAt: new Date().toISOString(), referenceDate: referenceDate.toISOString(), synthetic: true, mbti: null,
  strengthContextBoundary: "Only reliable weak + monthly peer/peer and reliable strong + monthly 편인/비견 connections are verified; other strength/month combinations remain unverified and retain their existing reading.", samples }, null, 2));
console.log(`PASS ${samples.length} requested synthetic charts; calculated daeun comparisons; customer relationship/money/month outputs; artifact ${artifact}`);
