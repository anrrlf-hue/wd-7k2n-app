// Limited synthetic year-only contrasts. No photos, model, browser or service.
import './register-test-typescript.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { birthFixture } from './fixtures/palm-analysis.mjs';
import { leftReadingFixture as left, rightReadingFixture as right } from './fixtures/palm-reading.mjs';
const { computeSajuFacts } = await import('../src/lib/saju-facts.ts');
const { enrichSajuFacts } = await import('../src/lib/oh-my-saju-adapter.ts');
const { buildPremiumMonthNarrative } = await import('../src/lib/premium-month-narrative.ts');
const { buildPremiumReport } = await import('../src/lib/premium-report.ts');
const { buildPremiumYearNarrative } = await import('../src/lib/premium-year-narrative.ts');
const { composeMonthStory } = await import('../src/lib/premium-month-story.ts');
const { isStoredPremiumReport, isCurrentPremiumReport } = await import('../src/lib/premium-report-validation.ts');
const facts = enrichSajuFacts(computeSajuFacts(birthFixture), birthFixture);
const hands = { leftPalm: left, rightPalm: right, dominantHand: 'right' };
const input = { facts, ...hands, referenceDate: new Date('2026-10-13T00:00:00Z') };
const report = buildPremiumReport(input);
assert.equal(report.periods.length, 12, 'inspect the complete synthetic monthly reading');
for (const period of report.periods) {
  const scene = period.interpretation.passages.find(p => p.id === 'month-lived-scene')?.text;
  assert.ok(scene, `${period.label}: annual pressure still shapes the monthly scene`);
  assert.doesNotMatch(scene, /그 기대나 설명만으로 정해지지는 않을 수 있습니다/, `${period.label}: no shared generic conclusion`);
}
const passage = (r, id) => r.plan.passages.find(p => p.id === id);
const final = r => passage(r, 'month-lived-resolution').text;
const contrast = [];
for (const label of ['2026년 10월', '2027년 2월', '2027년 3월']) {
  const month = report.annual.months.find(m => m.label === label);
  const base = buildPremiumMonthNarrative(facts, month, null, hands);
  // A five-year step really keeps the monthly pillar unchanged. Only the
  // annual pillar differs; the chart, palm facts and prior-month input stay fixed.
  const other = buildPremiumMonthNarrative(facts, { ...month, year: month.year + 5 }, null, hands);
  assert.deepEqual(base.symbols.month, other.symbols.month, 'hold the complete exact monthly pillar constant');
  assert.notDeepEqual(base.symbols.year, other.symbols.year);
  assert.equal(passage(base, 'month-relation').text, passage(other, 'month-relation').text);
  assert.equal(passage(base, 'month-lived-scene').text, passage(other, 'month-lived-scene').text, 'annual stem is not copied into the monthly scene');
  assert.notEqual(final(base), final(other), 'annual branch changes the choice/consequence, not just the label or evidence');
  assert.notEqual(final(base).split(/(?<=\.)\s+/).at(-1), final(other).split(/(?<=\.)\s+/).at(-1));
  assert.deepEqual(passage(base, 'month-lived-scene').evidenceIds.filter(id => id.startsWith('year-')), []);
  assert.deepEqual(passage(base, 'month-lived-resolution').evidenceIds.filter(id => id.startsWith('year-')), ['year-branch']);
  for (const result of [base, other]) {
    const used = new Set(result.plan.passages.flatMap(p => p.evidenceIds));
    assert.ok(result.plan.evidence.every(e => used.has(e.id)), 'no unused evidence is presented as having shaped this reading');
    assert.doesNotMatch(result.plan.passages.map(p => p.text).join(' '), /교환 조건|담당 범위|권한|공통 기준|맥락으로 삼/);
  }
  if (label.endsWith('10월')) for (const r of [base, other]) assert.doesNotMatch(r.plan.passages.map(p => p.text).join(' '), /업무|같은 속도로 익혀|배운 방법/);
  if (label.endsWith('3월')) {
    assert.match(passage(base, 'month-relation').text, /바꾸고 싶은 뜻.*지키고 싶은 마음/);
    assert.match(passage(base, 'month-lived-scene').text, /마음에 둔 것.*고쳐 쓸|작은 불편.*가까운 사람|함께 쓰는 자료/);
    assert.match(final(base), /작은 예로 보여|불편했던 한 곳/);
    assert.match(final(other), /원했던 뜻이 알아보이는|실제로 고친 불편/);
    assert.doesNotMatch(final(base), /다시 손이 가|조용한 애착|자주 쓰며 편/);
  }
  contrast.push({ synthetic: true, label, baseCalendarYear: month.year, otherCalendarYear: month.year + 5, fixedMonthlySymbols: base.symbols.month, base, other });
}
const march = contrast[2].base;
const actualYear = buildPremiumYearNarrative(march.symbols.year);
const fixed = { year: actualYear, observedStory: composeMonthStory('상관', '정재', 'hour', '상관'), mode: 'fate-pair' };
const current = composeMonthStory('상관', '정재', 'hour', '상관', fixed);
// These two mocks isolate computed ten-god components; they are not calendar charts.
const stemOnly = composeMonthStory('상관', '정재', 'hour', '상관', { ...fixed, year: buildPremiumYearNarrative({ ...march.symbols.year, stemTenGod: '편관' }) });
const branchOnly = composeMonthStory('상관', '정재', 'hour', '상관', { ...fixed, year: buildPremiumYearNarrative({ ...march.symbols.year, branchTenGod: '편인' }) });
assert.equal(current.scene, stemOnly.scene); assert.equal(current.meaning, stemOnly.meaning);
assert.equal(current.scene, branchOnly.scene); assert.notEqual(current.meaning, branchOnly.meaning);
const unknown = buildPremiumYearNarrative({ ...march.symbols.year, branchTenGod: null });
assert.equal(unknown, null);
assert.deepEqual(composeMonthStory('상관', '정재', 'hour', '상관', { year: unknown }), composeMonthStory('상관', '정재', 'hour', '상관'));
for (const p of report.periods) {
  assert.ok(!p.interpretation.passages.some(x => x.evidenceIds.includes('year-stem')));
  assert.ok(p.interpretation.passages.find(x => x.id === 'month-lived-resolution')?.evidenceIds.includes('year-branch'));
  const used = new Set(p.interpretation.passages.flatMap(x => x.evidenceIds));
  assert.ok(p.interpretation.evidence.every(e => used.has(e.id)));
  assert.match(p.basis, /해의 지지:/);
  assert.doesNotMatch(p.basis, /해의 천간:/, 'annual stem is not presented as monthly evidence');
}
const summaries = [...new Map(report.periods.map(p => [p.symbols.year.ganzhi, p.symbols.year])).values()].map(buildPremiumYearNarrative);
assert.ok(summaries.every(y => report.annualIntroduction.includes(y.summary)), 'the same actual annual frame used in months appears once in the annual introduction');
assert.equal(new Set(summaries.map(y => y.summary)).size, 2);
const stemAlternative = buildPremiumYearNarrative({ ...summaries[0].symbols, stemTenGod: summaries[0].stemGod === '편관' ? '정인' : '편관' });
assert.ok(stemAlternative && stemAlternative.summary !== summaries[0].summary, 'annual stem changes the annual introduction meaning');
assert.ok(!report.annualIntroduction.includes(stemAlternative.summary), 'an unused annual stem is not presented in the report');
assert.equal(report.version, 'natal-customer-reading-2026-10-v14');
assert.ok(isCurrentPremiumReport(report));
if (process.env.YEAR_READING_BEFORE) {
  const old = JSON.parse(fs.readFileSync(process.env.YEAR_READING_BEFORE, 'utf8'));
  const before = old.samples[0].premium;
  assert.equal(before.version, 'connected-reading-2026-10-v12');
  assert.ok(isStoredPremiumReport(before) && !isCurrentPremiumReport(before));
  for (const key of ['summary', 'overall', 'domains', 'closing', 'palmConnections', 'annual']) assert.deepEqual(report[key], before[key], `retain 095948c ${key}`);
  assert.deepEqual(report.periods.map(p => p.symbols), before.periods.map(p => p.symbols), 'do not change actual calculation');
}
if (process.env.YEAR_READING_OUTPUT) fs.writeFileSync(process.env.YEAR_READING_OUTPUT, JSON.stringify({ synthetic: true, fixedChart: facts, report, contrast, componentContrast: { syntheticComputedSymbols: true, current, stemOnly, branchOnly } }, null, 2));
console.log('PASS annual stem is confined to annual introduction; annual branch changes monthly consequence; unused monthly evidence is absent; v12 preserved');
