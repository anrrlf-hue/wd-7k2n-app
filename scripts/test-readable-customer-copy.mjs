import assert from "node:assert/strict";
import "./register-test-typescript.mjs";

const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
import fs from "node:fs";

const input = { year: 2001, month: 2, day: 3, hour: 10, minute: 0, gender: "남" };
const facts = enrichSajuFacts(computeSajuFacts(input), input);
const free = buildFreeSajuReport(facts);
const premium = buildPremiumReport({ facts, referenceDate: new Date("2026-10-13T00:00:00Z") });
const customerText = [
  free.snapshot.text, free.temperament.text, free.relationshipStyle.text, free.loveStyle.text,
  free.lifeRhythm.text, free.wealthStructure.text, free.earningStyle.text,
  premium.summary, ...premium.overall.paragraphs, premium.annualIntroduction,
  premium.annualMethod ?? "", premium.periods[0]?.reading ?? "",
].join("\n");

assert.doesNotMatch(customerText, /원국|인성|식상|관성|비견|재성|대운|세운|천간|지지/);
assert.doesNotMatch(customerText, /壬辰|丙午|丁未/);
assert.ok(customerText.split("\n").every((line) => line.split(/[.!?。！？]/).every((sentence) => sentence.trim().length < 115)));
assert.match(free.snapshot.text, /설명|이해|직접/);
assert.match(premium.annualMethod ?? "", /쉽게|확인|살펴/);
const birthDateSource = fs.readFileSync("src/components/diagnosis/birth-date-step.tsx", "utf8");
assert.match(birthDateSource, /bg-\[\#fffaf0\]/);
assert.match(birthDateSource, /text-slate-900/);
assert.match(birthDateSource, /placeholder:text-slate-500/);
const premiumViewSource = fs.readFileSync("src/components/premium/premium-report-view.tsx", "utf8");
assert.doesNotMatch(premiumViewSource, /12개월 전체 흐름 펼쳐보기/);
assert.doesNotMatch(premiumViewSource, /aria-label=\"12개월 흐름\"/);
assert.match(premiumViewSource, /aria-label=\"1년의 주요 구간\"/);

const secondInput = { year: 1990, month: 11, day: 23, hour: null, minute: null, gender: "여" };
const secondFacts = computeSajuFacts(secondInput);
const secondFree = buildFreeSajuReport(secondFacts);
const secondPremium = buildPremiumReport({ facts: secondFacts, referenceDate: new Date("2026-10-13T00:00:00Z") });
const domainText = report => report.domains.map(domain => domain.paragraphs.join(" ")).join("\n");
assert.notEqual(domainText(premium), domainText(secondPremium), "premium domains must preserve case-specific meaning");
assert.notEqual(free.strengths.map(item => item.detail).join(" "), secondFree.strengths.map(item => item.detail).join(" "), "free strengths must preserve case-specific meaning");
assert.notEqual(free.cautions.map(item => item.detail).join(" "), secondFree.cautions.map(item => item.detail).join(" "), "free cautions must preserve case-specific meaning");
const highlighted = report => report.periods.filter(period => report.annualHighlights?.includes(period.months[0])).map(period => period.reading.replace(/\d{4}년 \d{1,2}월에는 /g, ""));
assert.notEqual(new Set(highlighted(premium)).size, 1, "highlight readings must not be the same after removing dates");
const visiblePremium = [premium.summary, premium.overall.paragraphs.join(" "), domainText(premium), ...highlighted(premium)].join(" ");
assert.doesNotMatch(visiblePremium, /원국|인성|식상|관성|비겁|재성|대운|세운|천간|별 개수/);

console.log("PASS readable customer copy: Saju and premium output avoids internal jargon and long sentences");
