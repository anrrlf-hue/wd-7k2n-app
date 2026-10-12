import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildFocusedSajuReport } = await import("../src/lib/free-saju-focus-report.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const { PremiumReportView } = await import("../src/components/premium/premium-report-view.tsx");
const { buildSajuAnnualOutlook } = await import("../src/lib/saju-timing.ts");
const { eulReul, gwaWa, iGa } = await import("../src/lib/korean-particle.ts");
const originalSource = execFileSync("git", ["show", "7b0c213aa87133cb7ec45615aed82c94fc891b66:src/lib/premium-report.ts"], { encoding: "utf8" });
const originalJs = ts.transpileModule(originalSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { buildPremiumReport: oldPremium } = await import(`data:text/javascript;base64,${Buffer.from(originalJs).toString("base64")}`);
const priorSource = execFileSync("git", ["show", "ef6941463cb049e87bef6ceff36d818d96a8042d:src/lib/premium-report.ts"], { encoding: "utf8" });
const priorJs = ts.transpileModule(priorSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { buildPremiumReport: priorPremium } = await import(`data:text/javascript;base64,${Buffer.from(priorJs).toString("base64")}`);
const samples = [
  { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: "여" },
];
const prose = value => typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(prose) : [];
const reportDate = new Date("2026-10-12T00:00:00Z");
const output = ["# 무료 / 프리미엄 비교", "합성 생년월일만 사용. 기준: 2026-10-12, KST 월 구간. 외부 모델/API 호출 없음.", "중복 측정: 무료 전체·4개 분야 풀이의 40자 이상 문장이 프리미엄 본문에 그대로 포함되는 개수(고유 문자열 기준). 의도적으로 한 번 표시하는 무료 첫 문장 요약은 별도 검사한다. 의미적 유사도·유료 가치·예측 정확도 지표는 아니다."];
const reviewSamples = [];
for (const [index, birth] of samples.entries()) {
  const shallow = computeSajuFacts(birth);
  const facts = birth.hour === null ? shallow : enrichSajuFacts(shallow, birth);
  const free = buildFreeSajuReport(facts, { mbti: null, check: null });
  const focused = ["love_relationship", "work", "money", "wellbeing"].map(key => buildFocusedSajuReport(facts, free, key));
  const common = new Set(prose([free, focused]).filter(text => text.length >= 40));
  const input = { facts, freeReport: free, focus: "work", referenceDate: reportDate };
  const premium = buildPremiumReport(input);
  reviewSamples.push({ birth, facts, free, focused, premium });
  const beforeText = prose(oldPremium(input)).join("\n");
  const { freeSummary, ...premiumBody } = premium;
  const afterText = prose(premiumBody).join("\n");
  const beforeOverlap = [...common].filter(text => beforeText.includes(text));
  const afterOverlap = [...common].filter(text => afterText.includes(text));
  assert.ok(beforeOverlap.length > 10);
  assert.equal(afterOverlap.length, 0, `sample ${index}: free copy leaked`);
  assert.deepEqual(premium, buildPremiumReport(input));
  // Only the explicit one-sentence recap may change with free prose.
  const alternateFree = structuredClone(free);
  alternateFree.snapshot.text = "SENTINEL_FREE_SUMMARY";
  alternateFree.nextMove.text = "SENTINEL_FREE_ACTION";
  const { freeSummary: alternateSummary, ...alternateBody } = buildPremiumReport({ ...input, freeReport: alternateFree });
  assert.equal(alternateSummary, "SENTINEL_FREE_SUMMARY");
  assert.deepEqual(premiumBody, alternateBody);
  assert.equal(freeSummary, free.snapshot.text.split(/(?<=[.!?])\s+/)[0]);
  const html = renderToStaticMarkup(createElement(PremiumReportView, { report: premium }));
  assert.equal(html.split(freeSummary).length - 1, 1, "free recap is rendered once");
  assert.ok(html.indexOf("이번 계획의 우선순위") < html.indexOf("분야별 선택 근거"));
  assert.equal(premium.domains[0].key, "work");
  const money = buildPremiumReport({ ...input, focus: "money" });
  assert.equal(money.domains[0].key, "money");
  assert.notEqual(money.actionPlan[0].text, premium.actionPlan[0].text);
  assert.equal(new Set(premium.domains.map(d => d.experiment)).size, 4);
  assert.equal(new Set(premium.domains.map(d => d.checkpoint)).size, 4);
  assert.equal(new Set(premium.domains.map(d => d.changeWhen)).size, 4);
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
  const prior = priorPremium(input);
  assert.deepEqual(premium.annual, prior.annual, "annual calculation must remain unchanged");
  assert.equal(premium.domains[0].experiment, prior.domains[0].experiment, "work: shared reasons must keep shared experiments");
  const moneyExperiment = money.domains[0].experiment;
  const priorMoney = prior.domains.find(domain => domain.key === "money").experiment;
  if (index === 1) assert.notEqual(moneyExperiment, priorMoney, "equal counts need a neutral, combined check");
  else assert.equal(moneyExperiment, priorMoney, "do not invent differences for the other money branches");
  for (const report of [premium, money]) {
    const chosen = report.domains[0];
    const rendered = renderToStaticMarkup(createElement(PremiumReportView, { report }));
    const monthlyHtml = rendered.slice(rendered.indexOf("앞으로 12개월"));
    for (const emphasis of ["실험", "유지", "점검"]) assert.ok(monthlyHtml.includes(chosen.monthlyActions[emphasis]));
    for (const other of report.domains.slice(1)) {
      assert.ok(!monthlyHtml.includes(other.monthlyActions["실험"]), "monthly cards follow the chosen focus");
    }
    assert.equal(report.actionPlan[1].text, chosen.changeWhen);
    assert.ok(report.actionPlan[0].text.includes(chosen.monthlyActions[report.annual.months[0].comparisons.find(c => c.domain === chosen.key).emphasis]));
  }
  if (!facts.hasTimeInput) {
    assert.equal(premium.annual.precision, "broad");
    assert.ok(premium.corePatterns[2].includes("생략"));
    const poisoned = { ...facts, currentDaeun: { stemTenGod: "정재", branchTenGod: "편재" } };
    assert.deepEqual(buildSajuAnnualOutlook(poisoned, reportDate), premium.annual);
  }
  output.push(`\n## 샘플 ${index + 1}: ${JSON.stringify(birth)}`, `중복: 수정 전 ${beforeOverlap.length}개 → 수정 후 ${afterOverlap.length}개`,
    `무료 요약: ${free.snapshot.text}`, `무료 일 분야: ${focused[1].sections[0].paragraph.text}`,
    `프리미엄 내 무료 한 줄 요약(1회): ${freeSummary}`,
    `프리미엄 도입: ${premium.summary}`,
    `선택 근거: 식상 ${facts.outputStarCount} / 관성 ${facts.officerStarCount} · 재성 ${facts.wealthStarCount} / 인성 ${facts.resourceStarCount}`,
    `우선 계획: ${premium.actionPlan.map(item => `${item.title}: ${item.text}`).join(" ")}`,
    `프리미엄 일 분야: ${premium.domains[0].paragraphs.join(" ")}`,
    `2주 실험: ${premium.domains[0].experiment}`, `확인 기준: ${premium.domains[0].checkpoint}`,
    `돈 분야 근거: ${money.domains[0].paragraphs[1]}`,
    `돈 분야 2주 실험: ${money.domains[0].experiment}`,
    `돈 분야 변경 조건: ${money.domains[0].changeWhen}`,
    `돈 관심 분야로 전환 시 첫 실행: ${money.actionPlan[0].text}`,
    `보완 행동: ${premium.balance[0].whatItMeans} ${premium.balance[0].howToFill}`);
  output.push(["|월|관계|일|돈|생활|", "|---|---|---|---|---|",
    ...premium.annual.months.map(month => `|${month.label}|${month.comparisons.map(c=>c.emphasis).join("|")}|`),
  ].join("\n"));
  output.push(["|월|일 분야의 실행 제안|돈 분야의 실행 제안|", "|---|---|---|",
    ...premium.annual.months.map(month => `|${month.label}|${premium.domains[0].monthlyActions[month.comparisons.find(c=>c.domain==="work").emphasis]}|${money.domains[0].monthlyActions[month.comparisons.find(c=>c.domain==="money").emphasis]}|`),
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
const [, second, third] = reviewSamples;
assert.equal(second.premium.domains[0].experiment, third.premium.domains[0].experiment);
assert.deepEqual(second.premium.domains[0].monthlyActions, third.premium.domains[0].monthlyActions);
assert.notDeepEqual(second.premium.actionPlan[2], third.premium.actionPlan[2], "same work experiment, different month context");
assert.deepEqual(reviewSamples[0].premium.annual.months.map(m => m.comparisons.map(c=>c.emphasis)), second.premium.annual.months.map(m => m.comparisons.map(c=>c.emphasis)), "do not manufacture differences in equal monthly patterns");
const overall = buildPremiumReport({ facts: base, freeReport: {}, referenceDate: reportDate });
assert.ok(overall.actionPlan[0].text.includes("한 분야를 우선이라고 단정하지 않습니다"));
const overallHtml = renderToStaticMarkup(createElement(PremiumReportView, { report: overall }));
const overallMonths = overallHtml.slice(overallHtml.indexOf("앞으로 12개월"));
for (const domain of overall.domains) assert.ok(overallMonths.includes(domain.monthlyActions["실험"]));
const neutral = buildPremiumReport({ facts: { ...base, dayStem: "unknown", currentDaeun: null, wealthStarCount: 0, resourceStarCount: 0 }, freeReport: {}, focus: "money", referenceDate: reportDate });
assert.ok(neutral.domains[0].paragraphs[1].includes("동점"));
assert.ok(neutral.actionPlan[2].text.includes("전환할 달을 따로 권하지 않습니다"));
console.log("PASS shared work rationale, balanced money counts, current/next monthly actions, focus rendering, one free recap, no invented overall priority");
if (process.env.PREMIUM_SAMPLE_OUTPUT) fs.writeFileSync(process.env.PREMIUM_SAMPLE_OUTPUT, output.join("\n\n") + "\n");
if (process.env.PREMIUM_REVIEW_OUTPUT) fs.writeFileSync(process.env.PREMIUM_REVIEW_OUTPUT, JSON.stringify(reviewSamples, null, 2) + "\n");
