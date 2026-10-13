import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const { buildPremiumAnnualPlan } = await import("../src/lib/premium-annual-plan.ts");
const { PremiumReportView } = await import("../src/components/premium/premium-report-view.tsx");
const report = buildPremiumReport({ facts: computeSajuFacts({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" }), freeReport: {}, referenceDate: new Date("2026-10-13T00:00:00Z") });
for (const uniform of [false, true]) {
  const sample = structuredClone(report);
  if (uniform) sample.annual.months.forEach(m => m.comparisons.forEach(c => { c.emphasis = "유지"; }));
  else sample.annual.months.forEach((m, i) => m.comparisons.forEach(c => { c.emphasis = i === 0 || i === 4 ? "실험" : "유지"; }));
  const before = structuredClone(sample);
  const html = renderToStaticMarkup(createElement(PremiumReportView, { report: sample })).split('id="premium-annual"')[1];
  for (const d of sample.domains) {
    const plan = buildPremiumAnnualPlan(d, sample.annual);
    assert.equal(plan.periods.flatMap(p => p.months).length, 12);
    assert.equal(new Set(plan.actions.flatMap(a => a.months.map(m => m.label))).size, 12);
    for (const a of plan.actions) {
      assert.equal(html.split(a.text).length - 1, 1, "every field/action is rendered once, not once per month");
      for (const m of a.months) assert.ok(html.includes(m.basis));
    }
    if (uniform) { assert.equal(plan.periods.length, 1); assert.equal(plan.periods[0].label, "2026년 10월 ~ 2027년 9월"); }
    else assert.deepEqual(plan.actions.find(a => a.emphasis === "실험").periods, ["2026년 10월", "2027년 2월"]);
  }
  assert.deepEqual(sample, before);
}
console.log("PASS annual grouping: all fields, non-adjacent months separate, same action once, 12 months/bases intact, no mutation");
