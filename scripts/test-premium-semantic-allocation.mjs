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

// The customer-reading edition qualifies each month-specific annual pressure
// with its month label, so no full sentence is exempt from duplicate checks.
const repeatedAnnualPressure = {
  1: [],
  7: [],
};
const longSentencesIn = body => body.split(/(?<=다\.)\s+/).map(s => s.trim()).filter(s => s.length > 30);
const normalizeMonthLabels = body => body.replace(/20\d{2}년\s*\d{1,2}월(?:의 장면에서는)?/g, "").replace(/\s+/g, " ").trim();
function checkedMonthlySentences(report, approved) {
  const presentation = buildPremiumPeriodPresentation(report);
  const exceptions = new Map(approved);
  const displayed = report.periods.map(p => presentation.get(p).paragraphs.join(' '));
  for (const [sentence, months] of exceptions) {
    assert.deepEqual(report.periods.filter(period => period.interpretation.passages.find(p => p.id === 'month-lived-scene')?.text.includes(sentence))
      .map(period => period.label), months, 'only the reviewed months may repeat this annual pressure');
    for (const period of report.periods.filter(p => months.includes(p.label))) {
      const scene = period.interpretation.passages.find(p => p.id === 'month-lived-scene');
      assert.equal(longSentencesIn(scene.text).filter(part => part === sentence).length, 1,
        'a reviewed annual pressure occurs only once in each monthly scene');
    }
  }
  const checked = report.periods.flatMap((period, index) => {
    const scene = period.interpretation.passages.find(p => p.id === 'month-lived-scene');
    assert.ok(scene && !scene.evidenceIds.includes('year-stem'), 'annual pressure is not copied into each month');
    assert.ok(report.annualIntroduction.includes('처음 읽는 세운에는'), 'the common annual theme is explained once in the annual section');
    const passages = period.interpretation.passages;
    assert.deepEqual(longSentencesIn(displayed[index]), passages.flatMap(p => longSentencesIn(p.text)),
      'the current report displays every passage without deleting repeated sentences');
    return passages.flatMap(p => {
      const parts = longSentencesIn(p.text);
      return parts.filter((sentence, partIndex) => !(p.id === 'month-lived-scene'
        && partIndex === parts.length - 1 && exceptions.get(sentence)?.includes(period.label)
        && p.text.endsWith(sentence)));
    });
  });
  return { displayed, checked };
}

for (const day of [1, 7]) {
  const { facts, report } = create(day);
  assert.ok(isRenderablePremiumReport(report));
  assert.ok(isStoredPremiumReport(report));
  assert.equal(report.version, 'natal-customer-reading-2026-10-v14');
  const savedV12Shape = structuredClone(report);
  savedV12Shape.version = 'connected-reading-2026-10-v12';
  assert.ok(isStoredPremiumReport(savedV12Shape), 'saved v12 structure stays readable');
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
  const approved = repeatedAnnualPressure[day];
  const { displayed, checked } = checkedMonthlySentences(report, approved);
  assert.equal(new Set(checked).size, checked.length,
    'month-specific prose must avoid repeated full sentences; the same annual pressure may recur');
  const semanticMonthlySentences = report.periods.flatMap(period => period.interpretation.passages
    .flatMap(p => longSentencesIn(normalizeMonthLabels(p.text))));
  assert.equal(new Set(semanticMonthlySentences).size, semanticMonthlySentences.length,
    'month labels cannot hide repeated meaning; common annual themes belong in annualIntroduction');
  const accidentalRepeat = '월마다 다른 선택을 해야 한다는 같은 문장을 임의로 반복합니다.';
  const mutated = structuredClone(report);
  for (const period of mutated.periods.slice(0, 2)) {
    period.interpretation.passages.find(p => p.id === 'month-lived-scene').text += ` ${accidentalRepeat}`;
  }
  const mutatedChecked = checkedMonthlySentences(mutated, approved).checked;
  assert.equal(mutatedChecked.filter(sentence => sentence === accidentalRepeat).length, 2,
    'an arbitrary duplicated last scene sentence must stay under the duplicate check');
  assert.notEqual(new Set(mutatedChecked).size, mutatedChecked.length);
  const changedResolution = structuredClone(report);
  for (const period of changedResolution.periods.slice(0, 2)) {
    period.interpretation.passages.find(p => p.id === 'month-lived-resolution').text += ` ${accidentalRepeat}`;
  }
  const resolutionChecked = checkedMonthlySentences(changedResolution, approved).checked;
  assert.equal(resolutionChecked.filter(sentence => sentence === accidentalRepeat).length, 2,
    'monthly choice and consequence remain under the duplicate check');
  assert.notEqual(new Set(resolutionChecked).size, resolutionChecked.length);
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
    assert.ok(right.interpretation.passages.some(p => p.evidenceIds.includes('year-branch')), 'the actual annual branch changes the monthly choice');
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
  assert.match(report.overall.basis, /일간.*오행.*강약/,
    'the calculated natal facts remain inspectable in the folded basis');
  const love = report.domains.find(d => d.key === 'love_relationship').paragraphs.join(' ');
  const money = report.domains.find(d => d.key === 'money').paragraphs.join(' ');
  const work = report.domains.find(d => d.key === 'work').paragraphs.join(' ');
  assert.match(money, /획득에서는.*유지에서는.*지출에서는/);
  const moneyParagraphs = report.domains.find(d => d.key === 'money').paragraphs;
  assert.equal(moneyParagraphs.length, 3);
  assert.ok(moneyParagraphs.slice(1).every(text => text.length > 100),
    'retention and spending must explain their own scene and changed value');
  assert.notEqual(love, money); assert.notEqual(money, work); assert.notEqual(love, work);
  console.log(`PASS invented fixture ${day}: 12 exact-symbol month readings, visible evidence, separate domain scenes`);
}
