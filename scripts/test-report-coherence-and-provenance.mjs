import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import { birthFixture, palmFixture } from "./fixtures/palm-analysis.mjs";

const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { validateFreeSajuReport } = await import("../src/lib/free-report-schema.ts");
const { buildComprehensiveVerdict } = await import("../src/lib/real-world-personalization.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const { buildPremiumEditorialPlan } = await import("../src/lib/premium-editorial-plan.ts");
const { buildPalmBilateralReading } = await import("../src/lib/palm-bilateral.ts");
const { buildPalmContextReading } = await import("../src/lib/palm-context-reading.ts");
const { buildPalmReadingSections } = await import("../src/lib/palm-observation-text.ts");
const { normalizePalmFactsObservation } = await import("../src/lib/palm-facts.ts");
const { palmFactsSchema } = await import("../src/lib/palm-input-schema.ts");
const { buildTripleCompare } = await import("../src/lib/triple-compare.ts");

// An invented chart with a strict duty lead and three distinct supporting
// groups. No person's birth input or saved observation is used in this test.
const facts = computeSajuFacts(birthFixture);
Object.assign(facts, {
  peerStarCount: 1, outputStarCount: 1, wealthStarCount: 1, officerStarCount: 3, resourceStarCount: 1,
  dayStrength: "weak", dayStrengthReliable: true, dayStrengthGrade: "신약",
});
const gods = [["편관", "정인"], ["정관", "식신"], ["비견", "편관"], ["정재", "비견"]];
facts.pillars.forEach((pillar, index) => {
  pillar.stemTenGod = gods[index][0];
  pillar.branchTenGod = gods[index][1];
});
assert.equal(buildPremiumEditorialPlan(facts).id, "duty-translation");
const free = buildFreeSajuReport(facts);
const verdict = buildComprehensiveVerdict(facts, null, null);
const premium = buildPremiumReport({ facts, freeReport: free, referenceDate: new Date("2026-10-13T00:00:00Z") });
assert.deepEqual(validateFreeSajuReport(free).violations, []);
assert.match(free.snapshot.text, /중심|믿음직/);
assert.match(free.temperament.text, /기대|평가/);
assert.match(free.decisionStyle.text, /선택|경험/);
assert.ok(free.strengths.some(item => /어려운 곳|사람과 쓰임/.test(item.title)));
assert.ok(free.cautions.every(item => !/균형 구조/.test(item.evidence)));
assert.ok(free.strengths.every(item => !/직접 밀어붙이는 추진력/.test(item.title)));
assert.match(verdict.text, /기준으로 선택|맡은 범위/);
assert.doesNotMatch(verdict.text, /큰 나무처럼|당신은 .* 사람입니다/);
assert.match(premium.summary, /취향.*쓰임|기준.*결과/,
  "the premium lead must carry understanding into communication");
assert.match(premium.summary, /쓰임|도움/,
  "the premium lead must keep the other person's benefit in view");
assert.match(premium.overall.paragraphs[0], /맡은 역할.*신뢰|약속.*책임/,
  "the overall reading must connect the duty lead to its outward expression");
assert.match(premium.overall.basis, /관성 3|정관/,
  "the reading must retain the invented chart's computed duty evidence");
assert.equal(premium.periods.length, 12);
const cautionTexts = free.cautions.map(item => item.detail);
assert.equal(new Set(cautionTexts).size, 3);
assert.ok(cautionTexts.every(text => text.length >= 70));
assert.doesNotMatch(free.snapshot.text, /해보세요|물어보세요|수정할 범위/,
  "the opening owns the natal structure rather than repeating the later action");
assert.match(free.decisionStyle.text, /실제로 써 보며|경험/,
  "missing decision information and a pending execution commitment need different next steps");
assert.deepEqual(free.cautions.map(item => item.title), ["마음보다 앞선 자기 평가", "반응에 맡긴 즐거움", "정성이 부담으로 남을 때"]);
assert.match(free.strengths[0].detail, /중심.*정성/);
assert.match(free.strengths[1].detail, /요구.*익힌/);
assert.match(free.strengths[2].detail, /쓰임/);
const freeText = JSON.stringify(free);
assert.doesNotMatch(freeText, /움직이는 시간과 혼자 정리하는 시간이 모두 필요한 편|상황에 맞춰 대응하는 폭이 넓은 편|능력이 강점/);
assert.match(free.keepingStyle.text, /돈을 남기는.*생활/);
assert.match(free.leakPattern.text, /지출.*도구/);
const money = premium.domains.find(item => item.key === "money");
assert.equal(money.paragraphs.length, 3, "earning, management and spending retain separate readable passages");
assert.match(money.paragraphs[1], /자원.*생활/);
assert.match(money.paragraphs[2], /지출.*도구.*시험/);
for (const domain of premium.domains) {
  assert.doesNotMatch(domain.paragraphs[0].split(/[.!?]/)[0], /[\u3400-\u9fff]|편관|정관|정인|식신/,
    "the domain explanation must be understood before reading its technical basis");
}
console.log("PASS invented natal edge: free, verdict and premium share duty-translation while retaining distinct roles");

for (const [index, year] of [1988, 1991, 1994, 1997, 2000].entries()) {
  const chart = computeSajuFacts({ year, month: 3 + index, day: 12, hour: index === 0 ? null : 10, minute: index === 0 ? null : 0, gender: index % 2 ? "여" : "남" });
  const result = buildFreeSajuReport(chart);
  assert.deepEqual(validateFreeSajuReport(result).violations, [], `synthetic chart ${index + 1} must keep full free copy`);
  assert.equal(result.strengths.length, 3);
  assert.equal(result.cautions.length, 3);
}
console.log("PASS synthetic natal spread: coherent free sections remain complete with or without time");

const oldSaved = structuredClone(palmFixture);
delete oldSaved.onnxLines.heartLine.sourceVariant;
delete oldSaved.onnxLines.headLine.sourceVariant;
delete oldSaved.onnxLines.lifeLine.sourceVariant;
oldSaved.pipelineDiagnostics = {
  sourceWidth: 1000, sourceHeight: 1000, averageBrightness: 120, sharpness: 25, highlightRatio: 0.05,
  adaptiveMargin: 20, rawCropWidth: 800, rawCropHeight: 800, enhancedCropWidth: 800, enhancedCropHeight: 800,
  rawDetectedLineCount: 0, enhancedAttempted: true, enhancedDetectedLineCount: 3,
  rawPixelCount: { heartLine: 0, headLine: 0, lifeLine: 0 },
  enhancedPixelCount: { heartLine: 400, headLine: 350, lifeLine: 410 },
  chosenVariant: { heartLine: "enhanced", headLine: "enhanced", lifeLine: "enhanced" },
};
const parsed = palmFactsSchema.parse(oldSaved);
assert.ok(parsed.pipelineDiagnostics, "API parser must retain saved diagnostics");
const right = normalizePalmFactsObservation(parsed);
assert.deepEqual(normalizePalmFactsObservation(right), right, "normalization is idempotent");
for (const key of ["heartLine", "headLine", "lifeLine"]) {
  const line = right.onnxLines[key];
  assert.equal(line.sourceVariant, "enhanced");
  assert.equal(line.rawDetected, false);
  assert.equal(line.enhancedDetected, true);
  assert.equal(line.endpointEvidence, "segment_extrema");
  assert.equal(line.pathCompleteness, "not_verified");
  assert.deepEqual(line.attributeSupport, { length: "segment_only", curve: "segment_only", depth: "mask_signal_only" });
}
const left = { ...right, handSide: "left" };
const bilateral = buildPalmBilateralReading(left, parsed, "right");
assert.match(bilateral.items[0].observation, /밝기를 보완한 사진/);
const context = buildPalmContextReading(left, parsed, "right");
assert.ok(context.evidence.some(item => item.id === "right.headLine.sourceVariant" && item.value === "enhanced"));
const individual = buildPalmReadingSections(right.onnxLines, right.secondaryLines, { handSide: "right", handShape: right.handShape });
assert.ok(individual.some(item => /보정 영상/.test(item.observation)));
const compare = buildTripleCompare(facts, right.onnxLines, null);
assert.match(compare[0].text, /보정 영상.*두뇌선 검출 구간.*상대 길이/);
assert.doesNotMatch(compare[0].text, /두뇌선은 길이 보통/);
const withPalms = buildPremiumReport({ facts, leftPalm: left, rightPalm: parsed, dominantHand: "right", referenceDate: new Date("2026-10-13T00:00:00Z") });
assert.ok(withPalms.palmConnections.some(item => item.evidence?.some(entry => entry.id === "right.headLine.sourceVariant" && entry.value === "enhanced")));
assert.ok(withPalms.palmConnections.some(item => item.evidence?.some(entry => entry.id === "right.headLine.rawDetected" && entry.value === false)));
assert.ok(withPalms.palmConnections.some(item => item.evidence?.some(entry => entry.id === "right.headLine.pathCompleteness" && entry.value === "not_verified")));
console.log("PASS invented saved-facts edge: source and segment limits survive parser, both hands, comparison and premium");

if (process.env.TEST_BASE_URL) {
  const base = process.env.TEST_BASE_URL;
  assert.match(base, /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/);
  const body = { ...birthFixture, leftPalmFacts: left, rightPalmFacts: parsed, dominantHand: "right" };
  const response = await fetch(`${base}/api/palm/interpret`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, palmFacts: parsed }) });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.rightPalmFacts.onnxLines.headLine.sourceVariant, "enhanced");
  assert.equal(result.rightPalmFacts.onnxLines.headLine.rawDetected, false);
  assert.match(result.bilateralReading.items[0].observation, /밝기를 보완한 사진/);
  assert.match(result.tripleCompare[0].text, /보정 영상.*두뇌선 검출 구간/);
  assert.equal(result.annualReport, undefined, "free palm endpoint cannot bypass trial eligibility");
  const participation = await fetch(`${base}/api/premium-report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, trialAction: "participate", participation: "clipboard" }) });
  assert.equal(participation.status, 200);
  const { trialReceipt } = await participation.json();
  const annual = await fetch(`${base}/api/premium-report`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, trialReceipt }) });
  assert.equal(annual.status, 200);
  const annualBody = await annual.json();
  assert.ok(annualBody.report.palmConnections.some(item => item.evidence?.some(entry => entry.id === "right.headLine.rawDetected" && entry.value === false)));
  console.log("PASS actual local APIs retain synthetic saved-diagnostics provenance across both report routes");
}

