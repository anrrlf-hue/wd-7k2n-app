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
const { isRenderablePremiumReport } = await import("../src/lib/premium-report-validation.ts");
const { PremiumReportView } = await import("../src/components/premium/premium-report-view.tsx");
const oldSource = execFileSync("git", ["show", "c3392b1:src/lib/premium-report.ts"], { encoding: "utf8" });
const js = ts.transpileModule(oldSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { buildPremiumReport: previous } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const births = [
  { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: "여" },
];
const date = new Date("2026-10-13T00:00:00Z");
const prose = v => typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(prose) : [];
const out = ["# 무료 / 통합 프리미엄 비교 — 2026-10-13", "합성 입력 3개. 실제 계산·문장 생성·React 렌더 사용. 외부 API 없음. 중복은 무료/분야 풀이의 40자 이상 문자열이 프리미엄에 그대로 포함되는 개수이며 의미적 차별성이나 예측 정확도 점수가 아닙니다."];
const reports = [];
for (const [i, birth] of births.entries()) {
  const shallow = computeSajuFacts(birth);
  const facts = birth.hour === null ? shallow : enrichSajuFacts(shallow, birth);
  const freeReport = buildFreeSajuReport(facts, { mbti: null, check: null });
  const freeDomains = ["love_relationship", "money", "work", "wellbeing"].map(focus => buildFocusedSajuReport(facts, freeReport, focus));
  const input = { facts, freeReport, referenceDate: date };
  const report = buildPremiumReport(input);
  reports.push(report);
  assert.equal(isRenderablePremiumReport(report), true);
  assert.equal(isRenderablePremiumReport({ ...report, annual: null }), false);
  assert.equal(isRenderablePremiumReport({ ...report, domains: [] }), false);
  assert.equal(isRenderablePremiumReport({ ...report, annual: { ...report.annual, months: report.annual.months.slice(1) } }), false);
  const html = renderToStaticMarkup(createElement(PremiumReportView, { report }));
  const body = prose({ ...report, freeSummary: "" }).join("\n");
  const overlap = [...new Set(prose([freeReport, freeDomains]).filter(s => s.length >= 40))].filter(s => body.includes(s));
  assert.equal(overlap.length, 0);
  for (const focus of ["overall", "love_relationship", "money", "work", "wellbeing"]) assert.deepEqual(buildPremiumReport({ ...input, focus }), report, "legacy focus cannot omit or reprioritize fields");
  assert.deepEqual(report.annual, previous(input).annual, "preserve annual calculation, precision and every month's evidence");
  assert.equal(report.annual.months.length, 12);
  assert.equal(new Set(report.domains.map(d => d.experiment)).size, 4);
  assert.doesNotMatch(html, /2주|선택한 분야|분야 선택|유파마다|과거는 제외/);
  assert.ok(!html.includes(report.freeSummary), "do not repeat the free recap");
  const anchors = ['id="premium-overall"', 'id="premium-domain-love_relationship"', 'id="premium-domain-money"', 'id="premium-domain-work"', 'id="premium-annual"'];
  const positions = anchors.map(s => html.indexOf(s));
  assert.ok(positions.every((p, j) => p >= 0 && (!j || p > positions[j - 1])), "integrated reading order");
  assert.equal((html.match(/<tr/g) || []).length, 13);
  assert.equal((html.match(/<td/g) || []).length, 48);
  for (const domain of report.domains.filter(d => d.key !== "wellbeing")) {
    assert.ok(html.includes(domain.paragraphs[1]));
    assert.ok(html.includes(domain.experiment));
    assert.equal(html.split(domain.changeWhen).length - 1, 1);
  }
  if (!facts.hasTimeInput) assert.equal(report.annual.precision, "broad");
  out.push(`\n## 샘플 ${i + 1}: ${JSON.stringify(birth)}`, `무료 긴 문장 그대로 재사용: ${overlap.length}개.`,
    `무료 요약: ${freeReport.snapshot.text}`, `무료 직장: ${freeDomains[2].sections[0].paragraph.text}`,
    `프리미엄 요약: ${report.summary}`, `프리미엄 총운: ${report.corePatterns.join(" ")}`);
  for (const d of report.domains.filter(d => d.key !== "wellbeing")) out.push(`### ${d.label}`, d.headline, ...d.paragraphs, `행동 예시: ${d.experiment}`, `상황이 달라졌을 때: ${d.changeWhen}`);
  out.push("|월|연애·관계|재물|직장·일|생활 리듬|", "|---|---|---|---|---|", ...report.annual.months.map(m => `|${m.label}|${report.domains.map(d => m.comparisons.find(c => c.domain === d.key).emphasis).join("|")}|`));
  console.log(`PASS sample ${i + 1}: integrated order, all legacy focuses equal, zero verbatim free overlap, unchanged 12x4 calculation`);
}
assert.notEqual(reports[0].summary, reports[1].summary);
assert.notDeepEqual(reports[0].domains.map(d => d.paragraphs), reports[1].domains.map(d => d.paragraphs));
if (process.env.PREMIUM_SAMPLE_OUTPUT) fs.writeFileSync(process.env.PREMIUM_SAMPLE_OUTPUT, out.join("\n\n") + "\n");
