import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildFocusedSajuReport } = await import("../src/lib/free-saju-focus-report.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const { buildSajuAnnualOutlook } = await import("../src/lib/saju-timing.ts");
const { eulReul, gwaWa, iGa } = await import("../src/lib/korean-particle.ts");
const originalSource = execFileSync("git", ["show", "7b0c213aa87133cb7ec45615aed82c94fc891b66:src/lib/premium-report.ts"], { encoding: "utf8" });
const originalJs = ts.transpileModule(originalSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { buildPremiumReport: oldPremium } = await import(`data:text/javascript;base64,${Buffer.from(originalJs).toString("base64")}`);
const samples = [
  { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: "여" },
];
const prose = value => typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(prose) : [];
const reportDate = new Date("2026-10-12T00:00:00Z");
const output = ["# 무료 / 프리미엄 비교", "합성 생년월일만 사용. 기준: 2026-10-12, KST 월 구간. 외부 모델/API 호출 없음.", "중복 측정: 무료 전체·4개 분야 풀이의 40자 이상 문장이 프리미엄에 그대로 포함되는 개수(고유 문자열 기준). 의미적 유사도나 예측 정확도 지표는 아님."];
const reviewSamples = [];
for (const [index, birth] of samples.entries()) {
  const shallow = computeSajuFacts(birth);
  const facts = birth.hour === null ? shallow : enrichSajuFacts(shallow, birth);
  const free = buildFreeSajuReport(facts, { mbti: null, check: null });
  const focused = ["love_relationship", "work", "money", "wellbeing"].map(key => buildFocusedSajuReport(facts, free, key));
  const common = new Set(prose([free, focused]).filter(text => text.length >= 40));
  const input = { facts, freeReport: free, focus: "work", referenceDate: reportDate };
  const premium = buildPremiumReport(input);
  reviewSamples.push({ birth, free, focused, premium });
  const beforeText = prose(oldPremium(input)).join("\n");
  const afterText = prose(premium).join("\n");
  const beforeOverlap = [...common].filter(text => beforeText.includes(text));
  const afterOverlap = [...common].filter(text => afterText.includes(text));
  assert.ok(beforeOverlap.length > 10);
  assert.equal(afterOverlap.length, 0, `sample ${index}: free copy leaked`);
  assert.deepEqual(premium, buildPremiumReport(input));
  // Premium prose cannot silently fall back to the free narrative.
  const alternateFree = structuredClone(free);
  alternateFree.snapshot.text = "SENTINEL_FREE_SUMMARY";
  alternateFree.nextMove.text = "SENTINEL_FREE_ACTION";
  assert.deepEqual(premium, buildPremiumReport({ ...input, freeReport: alternateFree }));
  assert.equal(premium.domains[0].key, "work");
  const money = buildPremiumReport({ ...input, focus: "money" });
  assert.equal(money.domains[0].key, "money");
  assert.notEqual(money.actionPlan[0].text, premium.actionPlan[0].text);
  assert.equal(new Set(premium.domains.map(d => d.experiment)).size, 4);
  assert.equal(new Set(premium.domains.map(d => d.checkpoint)).size, 4);
  const domainParagraphs = premium.domains.flatMap(domain => domain.paragraphs);
  assert.equal(new Set(domainParagraphs).size, domainParagraphs.length, "do not repeat a generic bridge paragraph in every domain");
  assert.equal(premium.annual.months.length, 12);
  assert.equal(premium.annual.months[0].label, "2026년 10월");
  assert.equal(premium.annual.months[11].label, "2027년 9월");
  assert.equal(new Set(premium.annual.months.map(m => m.label)).size, 12);
  for (const month of premium.annual.months) {
    assert.equal(month.comparisons.length, 4);
    assert.ok(month.comparisons.every(c => ["실험", "유지", "점검"].includes(c.emphasis)));
  }
  if (!facts.hasTimeInput) {
    assert.equal(premium.annual.precision, "broad");
    assert.ok(premium.corePatterns[2].includes("생략"));
    const poisoned = { ...facts, currentDaeun: { stemTenGod: "정재", branchTenGod: "편재" } };
    assert.deepEqual(buildSajuAnnualOutlook(poisoned, reportDate), premium.annual);
  }
  output.push(`\n## 샘플 ${index + 1}: ${JSON.stringify(birth)}`, `중복: 수정 전 ${beforeOverlap.length}개 → 수정 후 ${afterOverlap.length}개`,
    `무료 요약: ${free.snapshot.text}`, `무료 일 분야: ${focused[1].sections[0].paragraph.text}`,
    `프리미엄 도입: ${premium.summary}`,
    `프리미엄 개인 해설: ${premium.corePatterns[0]}`, `프리미엄 일 분야: ${premium.domains[0].paragraphs.join(" ")}`,
    `2주 실험: ${premium.domains[0].experiment}`, `확인 기준: ${premium.domains[0].checkpoint}`,
    `돈 관심 분야로 전환 시 첫 실행: ${money.actionPlan[0].text}`,
    `보완 행동: ${premium.balance[0].whatItMeans} ${premium.balance[0].howToFill}`);
  output.push(["|월|관계|일|돈|생활|", "|---|---|---|---|---|",
    ...premium.annual.months.map(month => `|${month.label}|${month.comparisons.map(c=>c.emphasis).join("|")}|`),
  ].join("\n"));
  output.push(premium.note);
  console.log(`PASS sample ${index + 1}: duplicate long free prose ${beforeOverlap.length} -> ${afterOverlap.length}; 12 x 4 comparisons; focus changes plan`);
}
const base = computeSajuFacts(samples[0]);
// Exercise all five dynamic action labels, including quoted labels. The helper
// sees the Korean phrase itself, not its closing quotation mark.
const actions = [
  ["peerStarCount", "직접 정하고 실행하기"],
  ["outputStarCount", "만들어 보여주기"],
  ["wealthStarCount", "자원과 결과를 연결하기"],
  ["officerStarCount", "역할과 약속을 지키기"],
  ["resourceStarCount", "정보를 모으고 검토하기"],
];
for (const [field, meaning] of actions) {
  const facts = { ...base, ...Object.fromEntries(actions.map(([key]) => [key, 0])), [field]: 5 };
  const report = buildPremiumReport({ facts, freeReport: {}, referenceDate: reportDate });
  assert.ok(report.summary.includes(`‘${meaning}’와`));
  assert.ok(report.corePatterns[0].includes(`‘${meaning}’를 시도해볼 상황`));
  assert.doesNotMatch(prose(report).join("\n"), /기[’']?(?:을|과)/);
}
for (const [element, object, subject] of [["목", "을", "이"], ["화", "를", "가"], ["토", "를", "가"], ["금", "을", "이"], ["수", "를", "가"]]) {
  const report = buildPremiumReport({ facts: { ...base, missingElements: [element] }, freeReport: {}, referenceDate: reportDate });
  assert.ok(report.balance[0].title.startsWith(element + object));
  assert.ok(report.balance[0].whatItMeans.includes(`${element}${subject} 0개`));
}
for (const [focus, phrase] of [["overall", "네 분야를 함께 비교하며"], ["love_relationship", "연애·인간관계를 먼저"], ["work", "일·직업·사업을 먼저"], ["money", "돈·재물을 먼저"], ["wellbeing", "생활·건강을 먼저"]]) {
  assert.ok(buildPremiumReport({ facts: base, freeReport: {}, focus, referenceDate: reportDate }).summary.includes(phrase));
}
for (const [word, object, subject, conjunction] of [["실행하기", "를", "가", "와"], ["실행", "을", "이", "과"], ["검토하기 ", "를", "가", "와"]]) {
  assert.equal(eulReul(word), object);
  assert.equal(iGa(word), subject);
  assert.equal(gwaWa(word), conjunction);
}
console.log("PASS Korean particles: 5 action labels, 5 elements, 5 focuses, quoted/unquoted and consonant/vowel endings; no repeated domain bridge");
const a = buildPremiumReport({ facts: { ...base, outputStarCount: 5, officerStarCount: 0, resourceStarCount: 0 }, freeReport: {}, referenceDate: reportDate });
const b = buildPremiumReport({ facts: { ...base, peerStarCount: 0, outputStarCount: 0, officerStarCount: 5, resourceStarCount: 6, wealthStarCount: 0 }, freeReport: {}, referenceDate: reportDate });
assert.notDeepEqual(a.corePatterns, b.corePatterns);
assert.notEqual(a.domains[1].experiment, b.domains[1].experiment);
const uniform = buildSajuAnnualOutlook({ ...base, dayStem: "unknown", currentDaeun: null }, reportDate);
assert.ok(uniform.months.every(m=>m.comparisons.every(c=>c.emphasis==="유지")), "ties must not invent a peak");
const boundary = buildSajuAnnualOutlook(base, new Date("2026-12-31T15:01:00Z"));
assert.equal(boundary.startLabel, "2027년 1월");
assert.equal(boundary.endLabel, "2027년 12월");
console.log("PASS profile-sensitive experiments, equal-score ties, KST year rollover, missing birth time");
if (process.env.PREMIUM_SAMPLE_OUTPUT) fs.writeFileSync(process.env.PREMIUM_SAMPLE_OUTPUT, output.join("\n\n") + "\n");
if (process.env.PREMIUM_REVIEW_OUTPUT) fs.writeFileSync(process.env.PREMIUM_REVIEW_OUTPUT, JSON.stringify(reviewSamples, null, 2) + "\n");
