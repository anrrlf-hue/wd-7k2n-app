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
const { buildPremiumAnnualPlan } = await import("../src/lib/premium-annual-plan.ts");
const { PremiumReportView } = await import("../src/components/premium/premium-report-view.tsx");

// Render the immutable previous view with the same reports; no browser, server,
// model or paid API is needed to measure this presentation change.
const source = execFileSync("git", ["show", "ca6129c1b4ab9473931b9761068d05caae358f93:src/components/premium/premium-report-view.tsx"], { encoding: "utf8" });
const oldJs = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText.replace(/from "(react\/jsx-runtime|lucide-react)"/g, (_, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const { PremiumReportView: PriorView } = await import(`data:text/javascript;base64,${Buffer.from(oldJs).toString("base64")}`);

const births = [
  { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: "여" },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: "여" },
];
const referenceDate = new Date("2026-10-12T00:00:00Z");
const render = (View, report) => renderToStaticMarkup(createElement(View, { report }));
const textHtml = text => renderToStaticMarkup(createElement("p", null, text)).slice(3, -4);
const count = (html, text) => html.split(textHtml(text)).length - 1;
const annualPart = html => html.slice(html.indexOf("앞으로 12개월"));
const evidence = [];

for (const [sample, birth] of births.entries()) {
  const shallow = computeSajuFacts(birth);
  const facts = birth.hour === null ? shallow : enrichSajuFacts(shallow, birth);
  const freeReport = buildFreeSajuReport(facts, { mbti: null, check: null });
  for (const focus of ["work", "money", "love_relationship", "wellbeing", "overall"]) {
    const report = buildPremiumReport({ facts, freeReport, focus, referenceDate });
    const before = structuredClone(report);
    const oldAnnual = annualPart(render(PriorView, report));
    const html = render(PremiumReportView, report);
    const annualHtml = annualPart(html);
    const selected = focus === "overall" ? report.domains : report.domains.filter(d => d.key === focus);
    let previousCount = 0;
    let currentCount = 0;
    for (const domain of selected) {
      const plan = buildPremiumAnnualPlan(domain, report.annual);
      assert.ok(plan.actions.length >= 1 && plan.actions.length <= 3);
      const sourceMonths = report.annual.months.map(month => ({
        label: month.label, basis: month.comparisons.find(c => c.domain === domain.key).basis,
      }));
      assert.deepEqual(plan.periods.flatMap(period => period.months), sourceMonths, "chronological coverage and original basis survive grouping");
      assert.equal(plan.actions.flatMap(action => action.months).length, 12);
      assert.equal(new Set(plan.actions.flatMap(action => action.months.map(month => month.label))).size, 12);
      for (const action of plan.actions) {
        const expected = report.annual.months.filter(m => m.comparisons.find(c => c.domain === domain.key).emphasis === action.emphasis);
        assert.equal(action.months.length, expected.length);
        assert.equal(count(oldAnnual, action.text), expected.length);
        assert.equal(count(annualHtml, action.text), 1, "each action appears once per field, including non-adjacent months");
        previousCount += expected.length;
        currentCount += 1;
        for (const period of action.periods) assert.ok(annualHtml.includes(textHtml(period)));
        for (const month of action.months) assert.ok(annualHtml.includes(textHtml(month.basis)));
      }
      assert.ok(annualHtml.includes(`href="#premium-domain-${domain.key}"`));
      assert.ok(html.includes(`id="premium-domain-${domain.key}"`));
      assert.ok(html.includes(textHtml(domain.checkpoint)));
      assert.ok(html.includes(textHtml(domain.changeWhen)));
      if (focus === "work" && sample === 1) {
        assert.deepEqual(plan.actions.find(a => a.emphasis === "실험").periods, ["2026년 12월", "2027년 2월 ~ 2027년 3월"], "January must not be swallowed into an experiment period");
        evidence.push({ birth, freeWork: freeReport.jobOrientation.text, experiment: domain.experiment, checkpoint: domain.checkpoint, changeWhen: domain.changeWhen, plan });
      }
      if (focus === "work" && sample === 2) {
        assert.deepEqual(plan.actions.find(a => a.emphasis === "실험").periods, ["2027년 7월 ~ 2027년 9월"]);
      }
    }
    for (const excluded of report.domains.filter(d => !selected.includes(d))) {
      assert.ok(!annualHtml.includes(textHtml(excluded.monthlyActions["실험"])), "respect selected focus");
    }
    assert.equal(count(html, report.freeSummary), 1);
    assert.deepEqual(report, before, "rendering must not mutate calculations, plans, or source copy");
    console.log(`PASS sample ${sample + 1} / ${focus}: annual action paragraphs ${previousCount} -> ${currentCount}; all 12 months and bases preserved`);
  }
}

// Display boundaries only: no recalculation of the already-tested timing engine.
const base = buildPremiumReport({ facts: computeSajuFacts(births[0]), freeReport: {}, focus: "work", referenceDate });
const domain = base.domains[0];
const uniform = structuredClone(base);
uniform.annual.months.forEach(m => { m.comparisons.find(c => c.domain === "work").emphasis = "유지"; });
const single = buildPremiumAnnualPlan(domain, uniform.annual);
assert.equal(single.actions.length, 1);
assert.equal(single.periods.length, 1);
assert.equal(single.periods[0].label, "2026년 10월 ~ 2027년 9월");
assert.equal(single.actions[0].months.length, 12);
assert.ok(!annualPart(render(PremiumReportView, uniform)).includes(textHtml(domain.monthlyActions["실험"])));
const boundary = structuredClone(uniform.annual);
boundary.months[0].comparisons.find(c => c.domain === "work").emphasis = "점검";
boundary.months[4].comparisons.find(c => c.domain === "work").emphasis = "실험";
const periods = buildPremiumAnnualPlan(domain, boundary).periods;
assert.equal(periods[1].label, "2026년 11월 ~ 2027년 1월");
assert.equal(periods[2].label, "2027년 2월");
assert.equal(periods[3].label, "2027년 3월 ~ 2027년 9월");
console.log("PASS repeated/non-adjacent stages, single-stage year, cross-year labels, priority/checkpoint links, recap once, source immutability");
if (process.env.PREMIUM_GROUPING_OUTPUT) fs.writeFileSync(process.env.PREMIUM_GROUPING_OUTPUT, JSON.stringify(evidence, null, 2) + "\n");
