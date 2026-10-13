// Invented calendar fixtures. No customer birth input or saved report is used.
import './register-test-typescript.mjs';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const { computeSajuFacts } = await import('../src/lib/saju-facts.ts');
const { enrichSajuFacts } = await import('../src/lib/oh-my-saju-adapter.ts');
const { buildPremiumReport } = await import('../src/lib/premium-report.ts');
const { buildPremiumPeriodPresentation } = await import('../src/lib/premium-period-presentation.ts');
const { describeAnnualMonthSymbols } = await import('../src/lib/saju-timing.ts');
const { isRenderablePremiumReport, isStoredPremiumReport } = await import('../src/lib/premium-report-validation.ts');
const { PremiumReportView } = await import('../src/components/premium/premium-report-view.tsx');

const create = day => {
  const birth = { year: 2000, month: 1, day, hour: 12, minute: 0, gender: '남' };
  const facts = enrichSajuFacts(computeSajuFacts(birth), birth);
  return { facts, report: buildPremiumReport({ facts, referenceDate: new Date('2026-10-13T00:00:00Z') }) };
};

for (const day of [1, 7]) {
  const { facts, report } = create(day);
  assert.ok(isRenderablePremiumReport(report));
  assert.ok(isStoredPremiumReport(report));
  assert.equal(report.version, 'distinct-reading-2026-10-v9');
  const savedV8Shape = structuredClone(report);
  savedV8Shape.version = 'evidence-reading-2026-10-v8';
  savedV8Shape.periods.forEach(period => { delete period.symbols; });
  assert.ok(isStoredPremiumReport(savedV8Shape), 'saved v8 structure must remain readable');
  assert.equal(report.periods.flatMap(p => p.months).length, 12);
  assert.equal(report.periods.length, 12);
  const presentation = buildPremiumPeriodPresentation(report);
  const displayed = report.periods.map(p => presentation.get(p).paragraphs.join(' '));
  assert.equal(new Set(displayed).size, 12, 'date changes alone cannot yield a duplicate monthly body');
  assert.ok(displayed.every(body => body.length > 130), 'each month needs an explanation and an application');
  for (const [index, period] of report.periods.entries()) {
    const month = report.annual.months[index];
    assert.deepEqual(period.symbols, describeAnnualMonthSymbols(facts, month));
    assert.match(period.basis, new RegExp(period.symbols.month.ganzhi));
    assert.match(period.basis, new RegExp(period.symbols.year.ganzhi));
    assert.ok(period.interpretation.passages.every(p => p.evidenceIds.every(id => period.interpretation.evidence.some(e => e.id === id))));
  }
  const sameBroadGroups = (a, b) => JSON.stringify(report.annual.months[a].comparisons[0].signals.month)
    === JSON.stringify(report.annual.months[b].comparisons[0].signals.month);
  assert.ok(sameBroadGroups(4, 5) && sameBroadGroups(10, 11), 'fixture must exercise the broad-group collision');
  for (const [a, b] of [[4, 5], [10, 11]]) {
    const left = report.periods[a], right = report.periods[b];
    assert.notEqual(left.symbols.month.stemTenGod, right.symbols.month.stemTenGod);
    assert.notEqual(left.symbols.month.branchTenGod, right.symbols.month.branchTenGod);
    assert.notEqual(displayed[a], displayed[b]);
    assert.ok(displayed[b].includes(left.symbols.month.stemTenGod) && displayed[b].includes(right.symbols.month.stemTenGod),
      'same five-group theme must explain the precise stem change');
  }
  const html = renderToStaticMarkup(createElement(PremiumReportView, { report }));
  assert.ok(html.includes('12개월 전체 흐름 펼쳐보기'));
  assert.ok(html.includes('월운'));
  assert.ok(report.annualIntroduction.includes('세운') && report.annualIntroduction.includes('천간'));
  assert.ok(!report.overall.paragraphs.join(' ').includes('작은 결과를 보여준 뒤'), 'the overall reading must not spend the work scene');
  assert.match(report.overall.paragraphs.join(' '), /원국의 서로 다른 자리.*(?:연|월|일|시)(?:간|지)/,
    'the premium opening should expose the calculated positions behind its synthesis');
  const love = report.domains.find(d => d.key === 'love_relationship').paragraphs.join(' ');
  const money = report.domains.find(d => d.key === 'money').paragraphs.join(' ');
  const work = report.domains.find(d => d.key === 'work').paragraphs.join(' ');
  assert.match(money, /획득.*관리는.*지출은/);
  assert.notEqual(love, money); assert.notEqual(money, work); assert.notEqual(love, work);
  console.log(`PASS invented fixture ${day}: 12 exact-symbol month readings, visible evidence, separate domain scenes`);
}
