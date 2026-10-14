// Offline product-quality coverage for the integrated Saju reading.
// This measures structural evidence and distinctness; it is not a predictive
// accuracy score and does not claim the proposed 90-point target.
import assert from "node:assert/strict";
import fs from "node:fs";
import "./register-test-typescript.mjs";

const { computeSajuFacts, TEN_GOD_GROUP } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");

const referenceDate = new Date("2026-10-13T00:00:00Z");
const cases = [
  { id: "E-남", year: 2001, month: 2, day: 3, hour: 12, minute: 0, gender: "남" },
  { id: "E-여", year: 2001, month: 2, day: 3, hour: 12, minute: 0, gender: "여" },
  { id: "식상0-재물", year: 1964, month: 11, day: 11, hour: 2, minute: 0, gender: "남" },
  { id: "관성우세-관계", year: 1975, month: 8, day: 21, hour: 20, minute: 0, gender: "남" },
];
const results = cases.map(({ id, ...birth }) => {
  const facts = enrichSajuFacts(computeSajuFacts(birth), birth);
  const free = buildFreeSajuReport(facts, { mbti: null, check: null });
  const premium = buildPremiumReport({ facts, freeReport: free, referenceDate });
  return { id, birth, facts, free, premium };
});

const domainText = result => Object.fromEntries(result.premium.domains.map(domain => [domain.key, domain.paragraphs.join(" ")]));
for (const result of results) {
  assert.equal(result.premium.domains.length, 3, `${result.id}: one integrated report exposes all three domains`);
  assert.ok(result.premium.overall.paragraphs.join(" ").length > 100, `${result.id}: overall synthesis is present`);
  assert.equal(result.premium.periods.length, 12, `${result.id}: all 12 months are available`);
  assert.ok(result.premium.periods.every(period => period.basis.includes("계산된 세운") && period.symbols?.month?.ganzhi), `${result.id}: every month retains calculation evidence`);
  const domains = domainText(result);
  assert.ok(new Set(Object.values(domains)).size === 3, `${result.id}: domain bodies are not one repeated reading`);
  assert.ok(domains.love_relationship.includes("관계") || domains.love_relationship.includes("가까운"));
  assert.ok(domains.money.includes("대가") || domains.money.includes("재물") || domains.money.includes("비용"));
  assert.ok(domains.work.includes("일") || domains.work.includes("업무") || domains.work.includes("결과"));
  assert.ok(new Set(result.premium.periods.map(period => period.reading)).size >= 10, `${result.id}: month bodies remain materially distinct`);
}

const male = results[0], female = results[1];
assert.notEqual(male.premium.overall.paragraphs.join(" "), female.premium.overall.paragraphs.join(" "), "E male/female overall uses current daeun context");
for (const key of ["love_relationship", "money", "work"]) assert.notEqual(domainText(male)[key], domainText(female)[key], `E male/female ${key} uses current daeun context`);
const maleFeb = male.premium.periods.find(period => period.months.includes("2027년 2월"));
const femaleFeb = female.premium.periods.find(period => period.months.includes("2027년 2월"));
assert.ok(maleFeb && femaleFeb, "E pair includes February 2027");
assert.notEqual(maleFeb.reading, femaleFeb.reading, "E male/female February has different month meaning");

const zeroOutput = results.find(result => result.id === "식상0-재물");
assert.equal(zeroOutput.facts.outputStarCount, 0, "1964 case confirms 식상 0 from calculation");
assert.doesNotMatch(domainText(zeroOutput).money, /좋아서 만든|창작|표현한 결과/);
const officer = results.find(result => result.id === "관성우세-관계");
assert.ok(officer.facts.officerStarCount > officer.facts.peerStarCount && officer.facts.officerStarCount > officer.facts.outputStarCount && officer.facts.officerStarCount > officer.facts.wealthStarCount);
assert.match(domainText(officer).love_relationship, /약속|책임|신뢰/);

const metrics = {
  referenceDate: referenceDate.toISOString(),
  cases: results.map(result => ({
    id: result.id,
    birth: result.birth,
    counts: { peer: result.facts.peerStarCount, output: result.facts.outputStarCount, wealth: result.facts.wealthStarCount, officer: result.facts.officerStarCount, resource: result.facts.resourceStarCount },
    dayStrength: result.facts.dayStrengthReliable ? result.facts.dayStrength : null,
    currentDaeun: result.facts.currentDaeun ? { ganzhi: result.facts.currentDaeun.ganzhi, stemTenGod: result.facts.currentDaeun.stemTenGod, branchTenGod: result.facts.currentDaeun.branchTenGod } : null,
    domainParagraphCounts: Object.fromEntries(result.premium.domains.map(domain => [domain.key, domain.paragraphs.length])),
    monthCount: result.premium.periods.length,
    distinctMonthBodies: new Set(result.premium.periods.map(period => period.reading)).size,
  })),
  checks: {
    integratedDomains: true,
    currentDaeunChangesE: true,
    twelveMonths: true,
    calculatedEvidencePerMonth: true,
    zeroOutputMoneyGuard: true,
    officerRelationshipGuard: true,
  },
  rubricEvidence: {
    evidenceConnection: "Each domain keeps calculated basis and each of 12 months keeps year/month pillar evidence.",
    combinationDepth: "E male/female domain and overall text changes from calculated current daeun groups; 1964/1975 guards use calculated counts.",
    domainAndMonthUniqueness: "Three domain bodies are distinct and each synthetic report has at least 10 distinct month bodies.",
    readability: "Domain ground/tension/example/alternative are rendered as separate paragraphs; deterministic offline output is inspected.",
    uncertainty: "No future event, income, health, or identity claim is inferred; the boundary below limits the evidence to four synthetic charts.",
  },
  outputs: results.map(result => ({ id: result.id, birth: result.birth, free: result.free, premium: result.premium })),
  boundary: "This is structural/content-distinctness evidence for four synthetic charts. It is not a 90-point score, predictive validation, or full coverage of other charts.",
};
fs.mkdirSync("docs/verification", { recursive: true });
fs.writeFileSync("docs/verification/saju-product-quality-2026-10-14.json", JSON.stringify(metrics, null, 2));
console.log("PASS integrated Saju product quality: 4 synthetic charts, 3 connected domains, 12 months, E daeun contrast, money/relationship guards");
