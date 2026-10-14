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

// Reviewed annual-pressure repeats in these invented calendars. No other
// sentence, including another scene ending or a resolution, is exempt.
const repeatedAnnualPressure = {
  1: [
    ['다른 사람의 이유를 이해할수록 직접 고르기 어려워졌을 수 있습니다.', ['2026년 10월', '2027년 1월']],
    ['유용하다는 이유를 더 찾아도 직접 좋아하는 부분은 아직 흐렸을 수 있습니다.', ['2026년 11월', '2026년 12월']],
    ['다시 묻는 일이 쌓아 온 믿음을 잃는 것처럼 느껴졌을 수 있습니다.', ['2027년 2월', '2027년 3월']],
    ['도움받아 마음이 놓였는데 직접 고른 경험은 작아진 듯했을 수 있습니다.', ['2027년 4월', '2027년 7월']],
    ['설명이 더 늘어났는데 누군가 들어 줬을 때의 편안함은 따로 남았을 수 있습니다.', ['2027년 5월', '2027년 6월']],
    ['배운 방법을 지킨 만족과 스스로 해 본 만족이 달리 남았을 수 있습니다.', ['2027년 8월', '2027년 9월']],
  ],
  7: [
    ['좋은 반응을 더 얻으려다 만드는 시간이 전처럼 즐겁지 않았을 수 있습니다.', ['2026년 10월', '2027년 1월']],
    ['배운 것을 잘 설명하는 일보다 다시 직접 해 볼 때 마음이 놓였을 수 있습니다.', ['2026년 11월', '2026년 12월']],
    ['좋아하는 뜻이 있는데 처음 꺼낸 말만 계속 지켜야 할 것 같았을 수 있습니다.', ['2027년 2월', '2027년 3월']],
    ['달리 표현한 부분까지 처음 모습과 같아야 한다고 느꼈을 수 있습니다.', ['2027년 5월', '2027년 6월']],
    ['잘해 보인 결과에 내 뜻이 남지 않아 아쉬웠을 수 있습니다.', ['2027년 8월', '2027년 9월']],
  ],
};
const longSentencesIn = body => body.split(/(?<=다\.)\s+/).map(s => s.trim()).filter(s => s.length > 30);
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
    assert.ok(scene?.evidenceIds.includes('year-stem'), 'each month retains its annual pressure');
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
  assert.equal(report.version, 'year-connected-reading-2026-10-v13');
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
  const repeatedInResolution = structuredClone(report);
  const [allowedSentence, affectedMonths] = approved[0];
  for (const period of repeatedInResolution.periods.filter(p => affectedMonths.includes(p.label))) {
    period.interpretation.passages.find(p => p.id === 'month-lived-resolution').text += ` ${allowedSentence}`;
  }
  assert.equal(checkedMonthlySentences(repeatedInResolution, approved).checked.filter(sentence => sentence === allowedSentence).length,
    affectedMonths.length, 'even an approved pressure sentence is not exempt inside a monthly choice or consequence');
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
