// Synthetic, offline reading comparison. These checks establish traceability
// and branch behavior, not predictive accuracy or reader value.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { palmFixture } from "./fixtures/palm-analysis.mjs";
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const { buildContextualMonthReading } = await import("../src/lib/premium-context-reading.ts");
const { buildPremiumPeriodPresentation } = await import("../src/lib/premium-period-presentation.ts");
const { buildPalmBilateralReading } = await import("../src/lib/palm-bilateral.ts");
const { buildPalmContextReading } = await import("../src/lib/palm-context-reading.ts");
const { buildTripleCompare } = await import("../src/lib/triple-compare.ts");
const { validateReadingPlan } = await import("../src/lib/reading-plan.ts");
const { isRenderablePremiumReport, isCurrentPremiumReport } = await import("../src/lib/premium-report-validation.ts");
const { PremiumReportView } = await import("../src/components/premium/premium-report-view.tsx");
const { TripleCompareSection } = await import("../src/components/palm/palm-reading-sections.tsx");
const baseline = "f0757a3cbe3235b5f86a3a047bc07168b8c6ebc0";
const oldSource = execFileSync("git", ["show", `${baseline}:src/lib/premium-report.ts`], { encoding: "utf8" });
const oldJs = ts.transpileModule(oldSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { buildPremiumReport: oldBuild } = await import(`data:text/javascript;base64,${Buffer.from(oldJs).toString("base64")}`);
const births = [
  { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: "여" },
  { year: 1975, month: 8, day: 21, hour: 20, minute: 0, gender: "남" },
  { year: 1997, month: 3, day: 8, hour: 9, minute: 10, gender: "여" },
  { year: 1964, month: 11, day: 11, hour: 2, minute: 0, gender: "남" },
];
const date = new Date("2026-10-13T00:00:00Z");
const left = { ...structuredClone(palmFixture), handSide: "left" }, right = structuredClone(palmFixture);
const samples = [];
for (const [i, birth] of births.entries()) {
  const shallow = computeSajuFacts(birth);
  const facts = birth.hour === null ? shallow : enrichSajuFacts(shallow, birth);
  const free = buildFreeSajuReport(facts, { mbti: null, check: null });
  const input = { facts, freeReport: free, referenceDate: date, leftPalm: left, rightPalm: right, dominantHand: "right" };
  const before = oldBuild(input), after = buildPremiumReport(input);
  assert.ok(isRenderablePremiumReport(before)); assert.ok(!isCurrentPremiumReport(before));
  const preserved = JSON.stringify(before);
  assert.ok(isCurrentPremiumReport(after));
  assert.deepEqual(after.annual, before.annual, "narrative changes must not silently alter the calculation");
  assert.equal(JSON.stringify(before), preserved, "previous edition remains immutable");
  assert.deepEqual(buildPremiumReport(input), after, "same evidence and period must give stable prose");
  assert.deepEqual(after.periods.flatMap(p => p.months), after.annual.months.map(m => m.label));
  const selectedPeriods = after.periods.filter(p => after.annualHighlights.includes(p.months[0]));
  assert.equal(selectedPeriods.length, after.annualHighlights.length, "each highlighted month resolves to an actual calculated period");
  assert.doesNotMatch(after.annualIntroduction, /공통 기준|맥락으로 삼|선택한.*구간|대표 구간/);
  assert.doesNotMatch(JSON.stringify(after), /(?:감각|힘)[’']?를|태도과|(?:경계|달)[’']?으로|(?:신강|신약|태약)[’']?를|일지 [甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
  for (const p of after.periods) validateReadingPlan(p.interpretation);
  assert.ok(after.palmConnections.length > 0, "no self-response is required for independent palm/saju reading");
  const html = renderToStaticMarkup(createElement(PremiumReportView, { report: after }));
  assert.ok(html.indexOf("premium-overall") < html.indexOf("1년의 주요 구간"));
  assert.ok(!html.includes('aria-label="손금과 사주를 연결해 읽기"'), "v5 integrates observations into the corresponding reading rather than repeating a separate card");
  for (const connection of after.palmConnections) {
    const passage = connection.text.split("\n\n")[0];
    assert.ok(html.includes(passage), "the integrated passage remains visible in the report body");
  }
  assert.ok(html.indexOf("1년의 주요 구간") < html.indexOf("12개월 전체 흐름 펼쳐보기"));
  const displayed = buildPremiumPeriodPresentation(after);
  const presentation = after.periods.map(p => ({ label: p.label, months: p.months, highlight: after.annualHighlights.includes(p.months[0]),
    paragraphs: displayed.get(p).paragraphs, shared: displayed.get(p).shared.map(other => other.label), daeun: displayed.get(p).daeun }));
  for (const item of presentation.filter(p => !p.highlight)) assert.ok(item.paragraphs.some(text => text.length > 30), "every auxiliary month keeps readable prose before its detail links");
  const daeun = presentation.map(p => p.daeun).filter(Boolean);
  assert.equal(daeun.length, new Set(daeun).size, "the same background paragraph is never repeated across highlights");
  if ([1, 4].includes(i)) {
    assert.ok(after.annualBackground);
    assert.equal(daeun.length, 0, "samples 2/5 use their annual background once without an unexplained direction/preparation relation");
  }
  // Opening the auxiliary calendar must not repeat the same full paragraphs.
  const decode = html.replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&amp;", "&");
  for (const item of presentation) {
    for (const text of item.paragraphs) assert.equal(decode.split(text).length - 1, 1, "displayed monthly prose, including recaps, appears exactly once in the actual report HTML");
  }
  if (after.annualBackground) assert.equal(decode.split(after.annualBackground).length - 1, 1);
  const displayedSentences = presentation.flatMap(item => item.paragraphs.flatMap(text => text.split(/(?<=\.)\s+/)));
  assert.equal(new Set(displayedSentences).size, displayedSentences.length, "each shared monthly sentence appears once with references");
  if (!facts.dayStrengthReliable) {
    assert.equal(after.annualBackground, null);
    assert.ok(after.periods.every(p => !p.interpretation.passages.some(s => s.id === "strength-context" || s.id === "daeun-context")));
  }
  samples.push({ id: i + 1, birth, facts, free, before, after, presentation, palm: buildPalmBilateralReading(left, right, "right") });
}
assert.deepEqual(samples[0].before.periods, samples[1].before.periods, "reproduce the published collision");
assert.notDeepEqual(samples[0].after.periods, samples[1].after.periods);
assert.notEqual(samples[0].after.overall.paragraphs[0], samples[1].after.overall.paragraphs[0]);
assert.notEqual(samples[0].after.overall.paragraphs[0], samples[4].after.overall.paragraphs[0], "the same three themes with different strength must not collapse to identical prose");
assert.equal(samples[3].after.profileRule, "duty-with-support");
assert.equal(samples[5].after.profileRule, "agency-value-understanding");
assert.doesNotMatch(samples[5].after.domains.find(d => d.key === "work").paragraphs.join(" "), /자신의 생각을 보여주는 힘과 맡은 역할을 지키려는 마음이 비슷/);
const feb1 = samples[0].after.periods.find(p => p.months.includes("2027년 2월"));
const feb2 = samples[1].after.periods.find(p => p.months.includes("2027년 2월"));
assert.match(feb1.headline, /익숙한 즐거움.*누군가에게 닿을 때/);
assert.match(feb2.headline, /작은 수정.*내 하루/);
assert.notEqual(feb1.reading, feb2.reading);
const december4 = samples[3].after.periods.find(p => p.months.includes("2026년 12월"));
assert.ok(buildContextualMonthReading(samples[3].facts, samples[3].after.annual.months.find(m => m.label === "2026년 12월")).passages.some(p => p.id === "duty-to-return"), "the original broad-group rule is retained as evidence");
assert.ok(december4.symbols.month.stemTenGod && december4.symbols.month.branchTenGod);
assert.ok(buildContextualMonthReading(samples[1].facts, samples[1].after.annual.months.find(m => m.label === "2027년 2월")).passages.some(p => p.id === "output-return-with-support"));
for (const sample of samples) {
  assert.equal(sample.presentation.length, 12);
  assert.equal(new Set(sample.presentation.map(item => item.paragraphs.join(" "))).size, 12, "each displayed month adds its own meaning");
}
for (const sample of samples.slice(0, 2)) {
  for (const [a, b] of [["2027년 2월", "2027년 3월"], ["2027년 8월", "2027년 9월"]]) {
    const first = sample.after.periods.find(p => p.months.includes(a));
    const second = sample.after.periods.find(p => p.months.includes(b));
    assert.notEqual(first.symbols.month.stemTenGod, second.symbols.month.stemTenGod);
    assert.notEqual(first.symbols.month.branchTenGod, second.symbols.month.branchTenGod);
    assert.notEqual(first.reading, second.reading);
    assert.ok(second.interpretation.passages.some(p => p.evidenceIds.includes("year-branch")), "use the actual annual context in the new monthly conclusion");
  }
}
for (const sample of [samples[3], samples[4]]) {
  const april = sample.presentation.find(p => p.months.includes("2027년 4월"));
  assert.match(sample.after.periods.find(p => p.months.includes("2027년 4월")).basis, /월운/);
  assert.ok(april.paragraphs.some(text => text.length > 30));
}
for (const field of ["peerStarCount", "officerStarCount", "resourceStarCount"]) {
  const counterfactual = { ...samples[1].facts, [field]: 4 };
  const month = samples[1].after.annual.months.find(m => m.label === "2027년 2월");
  assert.ok(!buildContextualMonthReading(counterfactual, month).passages.some(p => p.id === "output-return-with-support"), `${field} dominance must not be overridden by mere presence of output/wealth`);
}
const first = samples[0];
const changedStrength = { ...first.facts, dayStrength: "weak" };
assert.notDeepEqual(buildContextualMonthReading(changedStrength, first.after.annual.months[0]), first.after.periods[0].interpretation);
const withoutDaeun = { ...first.facts, currentDaeun: null };
assert.ok(!buildContextualMonthReading(withoutDaeun, first.after.annual.months[0]).passages.some(p => p.id === "daeun-context"));
const changedDaeun = { ...first.facts, currentDaeun: { ...first.facts.currentDaeun, stemTenGod: "편인", branchTenGod: "정인" } };
assert.ok(!buildContextualMonthReading(changedDaeun, first.after.annual.months[0]).passages.some(p => p.id === "daeun-context"), "no generic relation is invented for an unauthored combination");
const noTime = { ...first.facts, hasTimeInput: false, dayStrengthReliable: false };
assert.ok(!buildContextualMonthReading(noTime, first.after.annual.months[0]).passages.some(p => p.id === "daeun-context" || p.id === "strength-context"));
const bad = structuredClone(first.after); bad.periods[0].interpretation.passages[0].evidenceIds = ["invented"];
assert.ok(!isRenderablePremiumReport(bad));
bad.periods[0].interpretation = { passages: null };
assert.ok(!isRenderablePremiumReport(bad), "bad stored plan must not crash the renderer");

const palmCases = [];
for (const [name, hand] of [["same", right], ["different", structuredClone(right)], ["missing", structuredClone(right)], ["faint", structuredClone(right)]]) {
  if (name === "different") { hand.onnxLines.headLine.curve = "직선에 가까움"; hand.onnxLines.headLine.length = "김"; }
  if (name === "missing") { hand.onnxLines.headLine.detected = false; hand.onnxLines.headLine.curve = null; hand.onnxLines.headLine.length = null; }
  if (name === "faint") hand.onnxLines.headLine.depthStrength = "약함";
  const plan = buildPalmContextReading(left, hand, "right"); validateReadingPlan(plan);
  const report = buildPalmBilateralReading(left, hand, "right");
  palmCases.push({ name, left, right: hand, plan, report });
}
assert.notEqual(palmCases[0].report.summary, palmCases[1].report.summary);
assert.ok(!palmCases[0].plan.passages.some(p => p.id.endsWith("bilateral-difference")));
assert.ok(palmCases[1].plan.passages.some(p => p.id.endsWith("bilateral-difference")));
assert.match(palmCases[2].report.items[0].text, /왼손 사진을 기준/);
assert.match(palmCases[2].report.note, /건강·수명|수명·건강/, "partial readings retain the non-diagnostic limit");
assert.ok(!palmCases[2].plan.passages.some(p => p.id === "head-heart-composition"));
assert.match(palmCases[2].report.items[1].text, /가까운 사람.*감정/, "partial medium-length lines may use the observed segment without inventing the missing combination");
assert.equal(palmCases[0].report.summary, palmCases[3].report.summary, "photo contrast is not strength of personality");
assert.doesNotMatch(JSON.stringify(palmCases), /37~41|운명이 바뀌었|보통 범위여서/);
const compare = buildTripleCompare(first.facts, right.onnxLines, null);
const compareHtml = renderToStaticMarkup(createElement(TripleCompareSection, { items: compare, withSelf: false }));
assert.ok(compareHtml.includes("사주와 손금을 함께 읽으면"));
assert.match(compareHtml, /가령.*도움|가령.*추천/);
assert.equal(buildPremiumReport({ facts: first.facts, referenceDate: date }).palmConnections.length, 0);
console.log("PASS 6 calculated synthetic charts; unchanged calculation; context-sensitive periods; immutable v2; evidence validation; major-year sections; no-self palm comparison; same/different/missing/faint observations");
if (process.env.CONTEXT_SAMPLE_OUTPUT) {
  fs.writeFileSync(process.env.CONTEXT_SAMPLE_OUTPUT, JSON.stringify({ generatedAt: new Date().toISOString(), baseline, referenceDate: date.toISOString(), synthetic: true, actualRecognition: false, samples, palmCases }, null, 2));
}
