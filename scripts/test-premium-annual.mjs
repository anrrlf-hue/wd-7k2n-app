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
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const { isRenderablePremiumReport, isStoredPremiumReport } = await import("../src/lib/premium-report-validation.ts");
const { PremiumReportView } = await import("../src/components/premium/premium-report-view.tsx");
async function previous(path) {
  const source = execFileSync("git", ["show", `ae7e854:${path}`], { encoding: "utf8" });
  let js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  js = js.replace('"@fullstackfamily/manseryeok"', JSON.stringify(import.meta.resolve("@fullstackfamily/manseryeok")));
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}
const { buildPremiumReport: oldPremium } = await previous("src/lib/premium-report.ts");
const { buildSajuAnnualOutlook: oldAnnual } = await previous("src/lib/saju-timing.ts");
const births = [
  { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: "여" },
];
const referenceDate = new Date("2026-10-13T00:00:00Z");
const reports = [];
const out = ["# 해설 중심 리포트 실제 비교 — 2026-10 개정판", "합성 입력 3개, 실제 계산과 React 렌더. 외부 모델/API 없음. 수정 전은 ae7e854. 같은 입력·기준월·풀이판에서 결정론적이며, 같은 해석 요소는 같은 문장을 낼 수 있습니다. 유료 가치·예측 정확도 검증이 아닙니다."];
const prose = value => typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(prose) : [];
for (const [i, birth] of births.entries()) {
  const shallow = computeSajuFacts(birth);
  const facts = birth.hour === null ? shallow : enrichSajuFacts(shallow, birth);
  const freeReport = buildFreeSajuReport(facts, { mbti: null, check: null });
  const input = { facts, freeReport, referenceDate };
  const before = oldPremium(input);
  const report = buildPremiumReport(input);
  reports.push(report);
  assert.ok(isRenderablePremiumReport(report));
  assert.ok(isStoredPremiumReport(before), "old saved report still has a reader");
  assert.ok(!isRenderablePremiumReport(before));
  assert.ok(!isRenderablePremiumReport({ ...report, periods: [] }));
  const missingMonth = structuredClone(report); missingMonth.periods[0].months.shift();
  assert.ok(!isRenderablePremiumReport(missingMonth));
  assert.deepEqual(buildPremiumReport(input), report, "stable input/date/edition");
  for (const focus of ["overall", "love_relationship", "money", "work", "wellbeing"]) assert.deepEqual(buildPremiumReport({ ...input, focus }), report);
  const calculation = structuredClone(report.annual);
  calculation.months.forEach(m => m.comparisons.forEach(c => delete c.signals));
  assert.deepEqual(calculation, oldAnnual(facts, referenceDate), "new narrative must not alter annual scores, stages, dates, or precision");
  assert.deepEqual(report.periods.flatMap(p => p.months), report.annual.months.map(m => m.label));
  const html = renderToStaticMarkup(createElement(PremiumReportView, { report }));
  const readerBody = [report.summary, ...report.overall.paragraphs, ...report.domains.flatMap(d => d.paragraphs), ...report.periods.map(p => p.reading)].join(" ");
  assert.doesNotMatch(readerBody, /반드시|확정된 미래|실제 수입이 늘어납니다/);
  // The exact monthly symbols are now visible so adjacent months with the
  // same five-group theme can still explain their 정/편 and position changes.
  assert.ok(report.periods.every(p => p.symbols && p.basis.includes(p.symbols.month.ganzhi) && html.includes(p.symbols.month.ganzhi)));
  assert.ok(html.includes("1년의 주요 구간"));
  assert.equal(html.split(report.note).length - 1, 1, "uncertainty notice in one place");
  assert.ok(!html.includes("<table"), "annual content cannot be just a stage table");
  for (const period of report.periods) assert.ok(html.includes(period.basis));
  for (const d of report.domains) {
    if (d.tip) assert.ok(html.indexOf(d.paragraphs[0]) < html.indexOf(d.tip));
    assert.equal(d.paragraphs.length, d.key === "money" ? 3 : 1,
      "money separates earning, management and spending; other domains keep one scene");
    assert.equal(new Set(d.paragraphs).size, d.paragraphs.length, "each passage contributes a distinct explanation");
    for (const text of d.paragraphs) assert.equal(html.split(text).length - 1, 1, "every passage is rendered once");
    if (d.key === "money") {
      assert.match(d.paragraphs[0], /획득에서는/);
      assert.match(d.paragraphs[1], /관리에서는.*가령/);
      assert.match(d.paragraphs[2], /지출에서는.*가령/);
    }
    assert.equal(d.opportunity, "", "the same example is not repeated in a second card");
    assert.equal(d.caution, "", "the already explained caution is not repeated below");
  }
  const copy = prose({ summary:report.summary, overall:report.overall, domains:report.domains, periods:report.periods }).join("\n");
  // A shared core caution/evidence is intentional continuity. Deep paragraphs
  // must still add their own explanation rather than repeat the free sections.
  const sharedCore = new Set([report.overall, ...report.domains].flatMap(d => [d.caution, d.basis]));
  const overlap = [...new Set(prose(freeReport).filter(s => s.length >= 40 && !sharedCore.has(s)))].filter(s => copy.includes(s));
  assert.equal(overlap.length, 0);
  if (!facts.hasTimeInput) { assert.equal(report.annualBackground, null); assert.ok(report.annualMethod.includes("출생시간")); }
  out.push(`## 샘플 ${i + 1} · ${JSON.stringify(birth)}`, `무료 원문: ${freeReport.snapshot.text}`, `수정 전 총운: ${before.corePatterns.join(" ")}`, `수정 전 재물: ${before.domains.find(d => d.key === "money").experiment}`, `수정 전 직장: ${before.domains.find(d => d.key === "work").experiment}`, `### 새 요약\n${report.summary}`);
  for (const [name, reading] of [["총운", report.overall], ...report.domains.map(d => [d.label, d])]) out.push(`### ${name}\n${reading.headline}`, ...reading.paragraphs, `기회: ${reading.opportunity}`, `주의: ${reading.caution}`, `접힌 쉬운 근거: ${reading.basis}`, `선택적 짧은 참고: ${reading.tip}`);
  out.push("### 연간 흐름", report.annualIntroduction, report.annualBackground || "시간 미상으로 큰 운 배경 생략");
  for (const period of report.periods) out.push(`**${period.label} · ${period.headline}**`, period.reading, `이 시기로 읽은 이유: ${period.basis}`, ...period.domains.map(d => `${d.label}: ${d.text}`));
  out.push(report.note, `무료의 40자 이상 문자열 동일 재사용 ${overlap.length}개. 의미적 차별성 점수는 아님.`);
  console.log(`PASS sample ${i+1}: narrative before optional tips, plain rationale, ${report.periods.length} explained periods cover 12 months, unchanged calculation, stable edition, no verbatim free overlap`);
}
assert.notDeepEqual(reports[0].domains, reports[1].domains);
// Same monthly signals can have a different natal context; verify the context is used.
assert.notDeepEqual(reports[0].periods, reports[1].periods, "different natal composition and background must survive the monthly layer");
assert.notDeepEqual(reports[1].periods, reports[2].periods);
if (process.env.PREMIUM_SAMPLE_OUTPUT) fs.writeFileSync(process.env.PREMIUM_SAMPLE_OUTPUT, out.join("\n\n") + "\n");
