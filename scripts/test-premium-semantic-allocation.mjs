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
const { eulReul, gwaWa, iGa } = await import('../src/lib/korean-particle.ts');

const gods = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
for (const god of gods) {
  const batchim = !['겁재', '편재', '정재'].includes(god);
  assert.equal(iGa(god), batchim ? '이' : '가');
  assert.equal(eulReul(god), batchim ? '을' : '를');
  assert.equal(gwaWa(god), batchim ? '과' : '와');
}

const create = day => {
  const birth = { year: 2000, month: 1, day, hour: 12, minute: 0, gender: '남' };
  const facts = enrichSajuFacts(computeSajuFacts(birth), birth);
  return { facts, report: buildPremiumReport({ facts, referenceDate: new Date('2026-10-13T00:00:00Z') }) };
};

for (const day of [1, 7]) {
  const { facts, report } = create(day);
  assert.ok(isRenderablePremiumReport(report));
  assert.ok(isStoredPremiumReport(report));
  assert.equal(report.version, 'connected-reading-2026-10-v12');
  const savedV11Shape = structuredClone(report);
  savedV11Shape.version = 'lived-reading-2026-10-v11';
  assert.ok(isStoredPremiumReport(savedV11Shape), 'saved v11 structure stays readable');
  const savedV10Shape = structuredClone(report);
  savedV10Shape.version = "decision-reading-2026-10-v10";
  assert.ok(isStoredPremiumReport(savedV10Shape), "saved v10 structure must remain readable");
  const savedV9Shape = structuredClone(report);
  savedV9Shape.version = 'distinct-reading-2026-10-v9';
  assert.ok(isStoredPremiumReport(savedV9Shape), 'saved v9 structure must remain readable');
  const savedV8Shape = structuredClone(report);
  savedV8Shape.version = 'evidence-reading-2026-10-v8';
  savedV8Shape.periods.forEach(period => { delete period.symbols; });
  assert.ok(isStoredPremiumReport(savedV8Shape), 'saved v8 structure must remain readable');
  assert.equal(report.periods.flatMap(p => p.months).length, 12);
  assert.equal(report.periods.length, 12);
  const presentation = buildPremiumPeriodPresentation(report);
  const displayed = report.periods.map(p => presentation.get(p).paragraphs.join(' '));
  const longSentences = displayed.flatMap(body => body.split(/(?<=다\.)\s+/).map(s => s.trim()).filter(s => s.length > 30));
  assert.equal(new Set(longSentences).size, longSentences.length,
    'the complete generated calendar must avoid repeated full sentences without presentation deletions');
  assert.deepEqual([...new Set(report.periods.flatMap(p => [p.symbols.month.stemTenGod, p.symbols.month.branchTenGod]))].sort(), gods.sort(), 'the two invented calendars exercise all ten names');
  assert.equal(new Set(displayed).size, 12, 'date changes alone cannot yield a duplicate monthly body');
  assert.ok(displayed.every(body => body.length > 110), 'each month retains a concrete decision after shared context is linked');
  report.periods.forEach((period, index) => {
    if (displayed[index].length < 130) assert.ok(presentation.get(period).shared.length,
      'a shorter month must link to the common explanation it omits');
  });
  for (const [index, period] of report.periods.entries()) {
    const month = report.annual.months[index];
    assert.deepEqual(period.symbols, describeAnnualMonthSymbols(facts, month));
    assert.match(period.basis, new RegExp(period.symbols.month.ganzhi));
    assert.match(period.basis, new RegExp(period.symbols.year.ganzhi));
    assert.ok(period.interpretation.passages.every(p => p.evidenceIds.every(id => period.interpretation.evidence.some(e => e.id === id))));
    assert.match(period.basis, /이 달 천간:.*이 달 지지:/);
    assert.doesNotMatch(displayed[index], /정재이|편재이|문제과|결과으로|결과을|설명를|부분로/);
    if (period.symbols.month.stemTenGod === period.symbols.month.branchTenGod) {
      assert.ok(!period.headline.includes(' · '), 'one exact symbol must have one topic, not a doubled heading');
      assert.ok(period.interpretation.passages.some(p => p.id === 'month-lived-scene'));
      assert.doesNotMatch(displayed[index], /두 번의 사건|두 조언/);
    }
  }
  const sameBroadGroups = (a, b) => JSON.stringify(report.annual.months[a].comparisons[0].signals.month)
    === JSON.stringify(report.annual.months[b].comparisons[0].signals.month);
  assert.ok(sameBroadGroups(4, 5) && sameBroadGroups(10, 11), 'fixture must exercise the broad-group collision');
  for (const [a, b] of [[4, 5], [10, 11]]) {
    const left = report.periods[a], right = report.periods[b];
    assert.notEqual(left.symbols.month.stemTenGod, right.symbols.month.stemTenGod);
    assert.notEqual(left.symbols.month.branchTenGod, right.symbols.month.branchTenGod);
    assert.notEqual(displayed[a], displayed[b]);
    assert.notEqual(left.headline, right.headline, 'a changed pair must change the decision, not only the god names');
    assert.ok(right.interpretation.passages.some(p => p.evidenceIds.includes('previous-month-symbols')));
    assert.notEqual(left.interpretation.passages.find(p => p.id === 'month-lived-scene').text,
      right.interpretation.passages.find(p => p.id === 'month-lived-scene').text);
  }
  for (const [a, b] of [[0, 10], [1, 11]]) {
    const left = report.periods[a], right = report.periods[b];
    if (left.symbols.month.stemTenGod !== right.symbols.month.stemTenGod) continue;
    assert.notEqual(left.interpretation.passages.find(p => p.id === 'month-lived-scene').text,
      right.interpretation.passages.find(p => p.id === 'month-lived-scene').text,
      'the same stem ten-god must become a different decision when branch, year and natal relation change');
  }
  const html = renderToStaticMarkup(createElement(PremiumReportView, { report }));
  assert.ok(html.includes('12개월 전체 흐름 펼쳐보기'));
  assert.ok(html.includes('월운'));
  assert.ok(report.annualMethod.includes('세운') && report.annualMethod.includes('천간'));
  assert.ok(!report.overall.paragraphs.join(' ').includes('작은 결과를 보여준 뒤'), 'the overall reading must not spend the work scene');
  assert.doesNotMatch(report.overall.paragraphs.join(' '), /전체 풀이의 중심|원국의 서로 다른 자리|맥락으로 삼/);
  assert.match(report.overall.basis, /원국의 서로 다른 자리.*(?:연|월|일|시)(?:간|지)/,
    'the calculated positions remain inspectable in the folded basis');
  const love = report.domains.find(d => d.key === 'love_relationship').paragraphs.join(' ');
  const money = report.domains.find(d => d.key === 'money').paragraphs.join(' ');
  const work = report.domains.find(d => d.key === 'work').paragraphs.join(' ');
  assert.match(money, /획득에서는.*관리에서는.*지출에서는/);
  const moneyParagraphs = report.domains.find(d => d.key === 'money').paragraphs;
  assert.equal(moneyParagraphs.length, 3);
  assert.ok(moneyParagraphs.slice(1).every(text => /가령/.test(text) && /선택|구별/.test(text)),
    'management and spending must explain a conditional scene and what the choice changes');
  assert.notEqual(love, money); assert.notEqual(money, work); assert.notEqual(love, work);
  console.log(`PASS invented fixture ${day}: 12 exact-symbol month readings, visible evidence, separate domain scenes`);
}
