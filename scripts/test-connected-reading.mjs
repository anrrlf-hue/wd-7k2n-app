// Invented chart/observations only. These establish causal prose allocation,
// not predictive validity, photographed line quality or biographical truth.
import './register-test-typescript.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { birthFixture } from './fixtures/palm-analysis.mjs';
import { leftReadingFixture as left, rightReadingFixture as right } from './fixtures/palm-reading.mjs';
const { computeSajuFacts } = await import('../src/lib/saju-facts.ts');
const { enrichSajuFacts } = await import('../src/lib/oh-my-saju-adapter.ts');
const { buildPremiumReport } = await import('../src/lib/premium-report.ts');
const { buildPalmBilateralReading } = await import('../src/lib/palm-bilateral.ts');
const { composeMonthStory } = await import('../src/lib/premium-month-story.ts');
const { buildPremiumPeriodPresentation } = await import('../src/lib/premium-period-presentation.ts');
const { isStoredPremiumReport } = await import('../src/lib/premium-report-validation.ts');
const date = new Date('2026-10-13T00:00:00Z');
const births = [birthFixture, { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: '여' },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: '여' }];
const factsFor = b => b.hour === null ? computeSajuFacts(b) : enrichSajuFacts(computeSajuFacts(b), b);
const create = (facts, l = left, r = right, dominantHand = 'right') => buildPremiumReport({ facts, leftPalm: l, rightPalm: r, dominantHand, referenceDate: date });
const domain = (r, key) => r.domains.find(d => d.key === key).paragraphs[0];
const last = text => text.split(/(?<=\.)\s+/).at(-1);
const changeCurve = (f, key) => { const out = structuredClone(f); out.onnxLines[key].curve = '직선에 가까움'; return out; };
const reports = births.map(b => create(factsFor(b)));
for (const report of reports) {
  assert.equal(report.version, 'natal-customer-reading-2026-10-v14');
  assert.ok(isStoredPremiumReport(report));
  assert.equal(report.periods.length, 12);
  const presentation = buildPremiumPeriodPresentation(report);
  for (const p of report.periods) {
    assert.deepEqual(presentation.get(p).paragraphs, p.interpretation.passages.map(x => x.text), 'new prose is displayed whole, without deletion masking repetition');
    assert.equal(presentation.get(p).shared.length, 0);
    assert.ok(p.interpretation.passages.every(x => x.evidenceIds.every(id => p.interpretation.evidence.some(e => e.id === id))));
    assert.doesNotMatch(p.reading, /공통 기준|맥락으로 삼|마음의 질문이 옮겨|교환 조건|담당 범위|권한|조건을 확인/);
    assert.doesNotMatch(p.reading, /실제 진술|전통적 참고|실제 개인 경험/);
  }
  const sentences = report.periods.flatMap(p => p.reading.split(/(?<=\.)\s+/).filter(s => s.length > 30));
  assert.equal(sentences.length, new Set(sentences).size, 'whole calendar adds meaning without repeated full sentences');
  assert.notEqual(last(report.overall.paragraphs[0]), last(domain(report, 'work')));
  assert.ok(!report.annualIntroduction.includes(report.summary), 'annual unfolding must not simply repeat the report lead');
  assert.match(report.note, /실제 개인 경험.*사건·수입·건강·수명/);
  assert.match(report.annualMethod, /세운.*천간.*매월 중순/);
}
for (const key of ['love_relationship', 'money', 'work']) {
  assert.ok(new Set(reports.map(r => domain(r, key))).size >= 2, 'distinct natal evidence changes each integrated domain');
}
const facts = factsFor(birthFixture), baseline = reports[0];
const straight = create(facts, changeCurve(left, 'headLine'), changeCurve(right, 'headLine'));
const noHead = structuredClone(right); noHead.onnxLines.headLine.detected = false;
const noLeftHead = structuredClone(left); noLeftHead.onnxLines.headLine.detected = false;
const noHeadReport = create(facts, noLeftHead, noHead);
const workBody = r => r.domains.find(d => d.key === 'work').paragraphs.join(' ');
assert.notEqual(workBody(baseline), workBody(straight));
assert.notEqual(workBody(baseline), workBody(noHeadReport), 'removing the observation changes the final meaning');
assert.match(workBody(baseline), /익숙한 예|불편/); assert.match(workBody(straight), /한 흐름|완료/);
assert.doesNotMatch(baseline.overall.paragraphs[0], /일을.*끝|판단이 쓰이지|방법을.*써 보지/);
const withoutLife = structuredClone(left); delete withoutLife.secondaryLines.fate.candidateObservation;
const withoutResponse = structuredClone(right); delete withoutResponse.secondaryLines.fate.candidateObservation;
for (const alternative of [create(facts, withoutLife, right), create(facts, left, withoutResponse), create(facts, withoutLife, withoutResponse)]) {
  assert.equal(domain(baseline, 'money'), domain(alternative, 'money'), 'candidate fate positions do not change money prose');
}
assert.equal(domain(create(facts, left, right, 'left'), 'money'), domain(baseline, 'money'), 'left/right factual evidence is independent of dominance');
const october = r => r.periods.find(p => p.months[0] === '2026년 10월');
assert.match(october(baseline).reading, /가까운 사람.*짧은 답/);
assert.doesNotMatch(october(baseline).reading, /업무|담당|권한|일의 범위/);
const feb = baseline.periods.find(p => p.months[0] === '2027년 2월');
const march = baseline.periods.find(p => p.months[0] === '2027년 3월');
assert.notEqual(feb.interpretation.passages[0].text, march.interpretation.passages[0].text);
assert.match(feb.reading, /만든 사람과 쓴 사람이 각각 좋았던 부분|더 많은 양을 나누기/); assert.match(march.reading, /매일 쓰|다시 손이 가/);
const day = composeMonthStory('편재', '편인', 'day', '편인');
const month = composeMonthStory('편재', '편인', 'month', '편인');
const otherNeed = composeMonthStory('편재', '편인', 'day', '편재');
assert.notEqual(day.scene, month.scene, 'the actual natal placement changes the setting');
assert.notEqual(day.scene, otherNeed.scene, 'the natal symbol changes what matters in that same scene');
assert.ok(reports[2].periods.every(p => !p.interpretation.evidence.some(e => e.id === 'natal-anchor' && /^시/.test(e.value))), 'unknown birth time never contributes an invented hour anchor');
const different = structuredClone(left);
for (const key of ['headLine', 'heartLine', 'lifeLine']) different.onnxLines[key].curve = '직선에 가까움';
const bilateral = buildPalmBilateralReading(different, right, 'right');
for (const key of ['headLine', 'heartLine', 'lifeLine']) {
  const item = bilateral.items.find(x => x.title.startsWith({ headLine: '두뇌선', heartLine: '감정선', lifeLine: '생명선' }[key]));
  assert.match(item.text, /두 사진의.*모양이 달라/);
  assert.doesNotMatch(item.text, /과거.*현재|예전.*지금|바뀌었다|변화했다/);
}
assert.match(bilateral.items.find(x => x.title.startsWith('생명선')).text, /건강|수명/);
const unsupported = structuredClone(different); unsupported.onnxLines.modelExecuted = false;
assert.doesNotMatch(buildPalmBilateralReading(unsupported, right, 'right').items.find(x => x.title.startsWith('두뇌선')).text, /왼손.*(?:비교|정리)|두 사진의.*모양이 달라/);
const oldV11 = structuredClone(baseline); oldV11.version = 'lived-reading-2026-10-v11';
assert.ok(isStoredPremiumReport(oldV11));
if (process.env.CONNECTED_READING_OUTPUT) fs.writeFileSync(process.env.CONNECTED_READING_OUTPUT, JSON.stringify({ synthetic: true,
  reports, contrasts: { curvedWork: domain(baseline, 'work'), straightWork: domain(straight, 'work'), noHeadWork: domain(noHeadReport, 'work'),
    bothFateMoney: domain(baseline, 'money'), oneFateMoney: domain(create(facts, left, withoutResponse), 'money'),
    curvedOctober: october(baseline).reading, straightOctober: october(straight).reading, bilateral } }, null, 2));
console.log('PASS 3 whole synthetic reports; natal/palm causal scene + conclusion contrasts; coherent October; February/March meanings; original display; both-hand body comparison; unknown/stale guards; stored v11 retained');
