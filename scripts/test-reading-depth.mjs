// Invented observations and charts. No photo/model/customer input is used.
import './register-test-typescript.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { leftReadingFixture as left, rightReadingFixture as right, fateFixture as withFate } from './fixtures/palm-reading.mjs';
import { palmFixture, birthFixture } from './fixtures/palm-analysis.mjs';
const { computeSajuFacts } = await import('../src/lib/saju-facts.ts');
const { enrichSajuFacts } = await import('../src/lib/oh-my-saju-adapter.ts');
const { buildFreeSajuReport } = await import('../src/lib/free-report-mock.ts');
const { buildPremiumReport } = await import('../src/lib/premium-report.ts');
const { buildPalmBilateralReading } = await import('../src/lib/palm-bilateral.ts');
const { buildPalmCustomerPassages, palmFatePassage } = await import('../src/lib/palm-customer-reading.ts');
const { observeFateCandidate } = await import('../src/lib/palm-fate-observation.ts');
const { normalizePalmFactsObservation } = await import('../src/lib/palm-facts.ts');
const { buildTripleCompare } = await import('../src/lib/triple-compare.ts');
const { buildComprehensiveVerdict } = await import('../src/lib/real-world-personalization.ts');
const { palmFactsSchema } = await import('../src/lib/palm-input-schema.ts');
const { isStoredPremiumReport } = await import('../src/lib/premium-report-validation.ts');

const line = curved => ({ ...palmFixture.onnxLines.headLine, curve: curved ? '완만한 곡선' : '직선에 가까움' });
const summaries = [];
for (const head of [true, false]) for (const heart of [true, false]) {
  const right = structuredClone(palmFixture);
  right.onnxLines.headLine = line(head); right.onnxLines.heartLine = line(heart);
  const result = buildPalmBilateralReading({ ...right, handSide: 'left' }, right, 'right');
  summaries.push(result.summary);
  assert.match(result.summary, /두뇌선.*감정선/);
  assert.notEqual(result.summary, result.items[0].text);
  const summarySentences = result.summary.split(/(?<=다\.)\s+/).filter(s => s.length > 35);
  assert.ok(result.items.every(item => summarySentences.every(sentence => !item.text.includes(sentence))),
    'synthesis must add a relation rather than repeat an individual passage');
  if (head && heart) assert.match(result.summary, /대화.*구체적.*평가.*함께 기뻐/);
  else assert.doesNotMatch(result.summary, /좋은 소식을 전했는데/);
}
assert.equal(new Set(summaries).size, 4, 'four observed combinations have different interpretations');

assert.ok(palmFactsSchema.safeParse(left).success && palmFactsSchema.safeParse(right).success, 'invented fixtures must be valid API observations');
const geometryStatusFixture = structuredClone(palmFixture);
geometryStatusFixture.onnxLines.headLine.geometryStatus = 'ambiguous';
const parsedGeometryStatus = palmFactsSchema.safeParse(geometryStatusFixture);
assert.ok(parsedGeometryStatus.success && parsedGeometryStatus.data.onnxLines.headLine.geometryStatus === 'ambiguous', 'new geometry status survives API parsing');
const legacyGeometryStatus = structuredClone(palmFixture);
delete legacyGeometryStatus.onnxLines.headLine.geometryStatus;
assert.ok(palmFactsSchema.safeParse(legacyGeometryStatus).success, 'legacy observations remain parse-compatible');
for (const dominant of ['left', 'right']) {
  const result = buildPalmBilateralReading(left, right, dominant);
  assert.ok(result.items.some(item => item.title.includes('두뇌선')) && result.items.some(item => item.title.includes('감정선')),
    'main-line explanations remain independent of dominance');
  assert.doesNotMatch(result.note, /운명선 후보.*개인 진로의 근거/);
  assert.equal(result.note.split('태양선·재물선은 현재').length - 1, 1, 'same limitation appears once');
}
const fateBodies = [withFate('right', 'middle'), withFate('right', 'thumb_side'), withFate('right', 'pinky_side'),
  withFate('right', 'middle', 0.25), withFate('right', 'middle', 0.65, 0.2)].map(f => palmFatePassage(f).observation);
assert.equal(new Set(fateBodies).size, 3, 'candidate observation retains only its measured position');
const legacy = withFate('right', 'middle'); delete legacy.secondaryLines.fate.candidateObservation;
assert.equal(palmFatePassage(legacy), null);
assert.ok(!buildPalmCustomerPassages(palmFixture).some(item => item.key === 'handShape'));
const unexecuted = { ...left, onnxLines: { ...left.onnxLines, modelExecuted: false } };
assert.equal(normalizePalmFactsObservation(unexecuted).onnxLines, null, 'geometry cannot make stale model observations real');

const anchors = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
anchors[0] = { x: 50, y: 90 }; anchors[9] = { x: 50, y: 40 };
anchors[5] = { x: 20, y: 40 }; anchors[17] = { x: 80, y: 40 };
const model = { bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } };
for (const [center, expected] of [[0.25, 'thumb_side'], [0.5, 'middle'], [0.75, 'pinky_side']]) {
  const signal = { creaseObservation: { bounds: { x0: center - 0.02, x1: center + 0.02, y0: 0.4, y1: 0.7 }, continuity: 0.7, sourceVariant: 'raw' } };
  const observed = observeFateCandidate(signal, model, anchors, 100, 100);
  assert.equal(observed.position, expected); assert.ok(Math.abs(observed.visibleVerticalSpan - 0.6) < 0.00001);
  assert.equal(observed.creaseContinuity, 0.7);
  assert.equal(observeFateCandidate(signal, { bbox: { x0: 0.9, y0: 0.9, x1: 1, y1: 1 } }, anchors, 100, 100), undefined);
}
assert.equal(observeFateCandidate({}, model, anchors, 100, 100), undefined);

const samples = [];
for (const [index, birth] of [birthFixture, { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: '여' },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: '여' }].entries()) {
  const shallow = computeSajuFacts(birth), facts = birth.hour === null ? shallow : enrichSajuFacts(shallow, birth);
  const free = buildFreeSajuReport(facts), premium = buildPremiumReport({ facts, leftPalm: left, rightPalm: right, dominantHand: 'right', referenceDate: new Date('2026-10-13T00:00:00Z') });
  const body = [premium.overall.paragraphs, ...premium.domains.map(d => d.paragraphs), ...premium.periods.map(p => p.reading)].flat().join('\n');
  assert.doesNotMatch(body, /전체 풀이의 중심|공통 기준으로|맥락으로 삼았습니다|원국의 서로 다른 자리/);
  assert.ok(free.strengths.every(item => !item.title.endsWith('하는 관점')));
  assert.ok(premium.domains.every(d => d.paragraphs[0].length > 80), 'each domain starts with direct interpretation');
  assert.ok(premium.periods.every(p => p.basis.includes(p.symbols.month.ganzhi)));
  assert.ok(isStoredPremiumReport(premium));
  samples.push({ index, synthetic: true, birth, facts, free, palm: buildPalmBilateralReading(left, right, 'right'), comparison: buildTripleCompare(facts, right.onnxLines, null), verdict: buildComprehensiveVerdict(facts, right.onnxLines, null), premium });
}
if (process.env.READING_DEPTH_OUTPUT) fs.writeFileSync(process.env.READING_DEPTH_OUTPUT, JSON.stringify({ synthetic: true, samples }, null, 2));
if (process.env.READING_DEPTH_BEFORE) {
  const before = JSON.parse(fs.readFileSync(process.env.READING_DEPTH_BEFORE, 'utf8'));
  for (const [index, sample] of samples.entries()) {
    assert.deepEqual(sample.facts, before.samples[index].facts, 'same chart calculations');
    assert.deepEqual(sample.premium.annual, before.samples[index].premium.annual, 'same 12-month calculations');
    assert.deepEqual(sample.premium.periods.map(p => p.symbols), before.samples[index].premium.periods.map(p => p.symbols));
    if (index == 0) assert.match(sample.palm.summary, /대화.*구체적.*평가/); // preserve the improved synthesis
    if (index == 0 && !["connected-reading-2026-10-v12", "year-connected-reading-2026-10-v13", "natal-customer-reading-2026-10-v14"].includes(before.samples[index].premium.version)) assert.notEqual(sample.premium.overall.paragraphs[0], before.samples[index].premium.overall.paragraphs[0]);
    assert.ok(sample.premium.periods.every((period, i) => period.reading !== before.samples[index].premium.periods[i].reading), 'all twelve monthly meanings are rebuilt');
    assert.ok(isStoredPremiumReport(before.samples[index].premium), 'old edition stays readable');
  }
}
console.log('PASS four compositions, both-hand extras, five fate variations, legacy guards, measured pixel provenance and three complete synthetic premium readings');
