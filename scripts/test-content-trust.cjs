/* eslint-disable @typescript-eslint/no-require-imports -- Reuse the existing node:test TypeScript hook. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) { return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...args); };
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { detectBottleneck } = require('../src/lib/bottleneck-engine.ts');
const { buildAnalysisResult } = require('../src/lib/analysis-result.ts');
const { suggestManagementMethod } = require('../src/lib/management-method.ts');
const { scorePersonalityCheck } = require('../src/lib/personality-check.ts');
const { buildTripleCompare } = require('../src/lib/triple-compare.ts');
const base = { biggestConcern: '', jobType: 'employee_fixed', futureEvents: ['none'], monthlyIncomeKrw: 3000000, monthlyFixedCostKrw: 1000000, monthlyLivingCostKrw: 800000, monthlySavingsKrw: 500000, expenseAwareness: 'rough', emergencyFund: '3_6m', hasDebt: false, moneyManagementUnit: 'individual', spendingPatterns: ['auto_savings'] };
const goal = { ...base, futureEvents: ['marriage'], futureEventTiming: '6_12m', futureEventAmount: 'under_500', futureEventPrepared: 'over_half' };
const debt = { ...base, hasDebt: true, debtInterestRate: 'under_10', debtMonthlyPayment: 'under_30', debtMaturity: 'under_3m', debtRepaymentType: 'principal_interest' };
test('A: unknown goal allocation is confirmation, not urgent shortage or all-savings assumption', () => {
  const result = buildAnalysisResult(goal);
  assert.equal(result.bottleneck, 'purpose_fund_confirmation');
  assert.match(result.immediateDirection, /월.*배정/);
  assert.doesNotMatch(JSON.stringify(result), /급하게 빚|일정을 미뤄|약 \d+개월/);
});
test('B: unallocated 700k with no measured problem remains no bottleneck', () => {
  const result = buildAnalysisResult(base);
  assert.equal(result.bottleneck, 'no_priority_bottleneck');
  assert.equal(result.surplusKrw, 700000);
});
test('C: maturity is not high interest, principal repayment is not interest expense', () => {
  const result = buildAnalysisResult(debt);
  assert.equal(result.bottleneck, 'maturity_preparation');
  assert.match(result.immediateDirection, /만기일.*잔액.*준비/);
  assert.doesNotMatch(JSON.stringify(result), /고금리|이자만|상당한 금액/);
});
test('one installment answer alone does not establish dependence', () => {
  assert.equal(detectBottleneck({ ...base, spendingPatterns: ['installment'] }), 'no_priority_bottleneck');
});
test('neutral and unknown personality are distinct', () => {
  assert.equal(scorePersonalityCheck({ speed: 3 }).levels.speed, '중간');
  assert.equal(scorePersonalityCheck({}).levels.speed, '미확인');
});
test('neutral saju stays neutral and palm straightness never votes on speed', () => {
  const facts = { dayStrength: 'neutral', officerStarCount: 1, resourceStarCount: 1, peerStarCount: 1, outputStarCount: 1 };
  const palm = { headLine: { detected: true, curve: '직선에 가까움' }, heartLine: { detected: false } };
  const items = buildTripleCompare(facts, palm, scorePersonalityCheck({ speed: 3, autonomy: 3 }));
  assert.equal(items[0].signals.saju.state, 'NEUTRAL');
  assert.equal(items[0].signals.self.state, 'NEUTRAL');
  assert.equal(items[0].signals.palm.state, 'NOT_COMPARABLE');
  assert.equal(items[1].signals.palm.state, 'UNKNOWN');
  assert.ok(items.every(item => item.kind === '비교 불가'));
  assert.doesNotMatch(JSON.stringify(items), /흔치|희귀|결정 속도와 같은/);
});
test('freelancer low month actually changes essential-cost check and management timing', () => {
  const input = { ...base, jobType: 'freelancer', freelancerIncomeLow: '100', freelancerIncomeAvg: '300', freelancerIncomeHigh: '500' };
  assert.equal(detectBottleneck(input), 'income_variability_risk');
  const result = buildAnalysisResult(input);
  assert.match(result.gapStatement, /800,000원/);
  const method = suggestManagementMethod(['security', 'security', 'security'], [], input);
  assert.doesNotMatch(JSON.stringify(method), /급여일/);
  assert.match(method.whenToCheck, /입금/);
});
test('actual diagnosis defines action; simulation only changes execution style', () => {
  const a = suggestManagementMethod(['security'], [], debt);
  const b = suggestManagementMethod(['growth'], [], debt);
  assert.equal(a.whatToDo, b.whatToDo);
  assert.match(a.whatToRecord, /잔액/);
  assert.match(a.doneWhen, /확인/);
});

test('goal planning uses explicit allocation, prepared amount, and actual deadline only', () => {
  const { purposeFunding } = require('../src/lib/financial-evidence.ts');
  const input = { ...goal, goalRequiredKrw: 4000000, goalPreparedKrw: 2500000, goalMonthlyAllocationKrw: 250000, goalDeadline: '2027-03-25' };
  assert.equal(purposeFunding(input, '2026-09-19').state, 'ON_PLAN');
  assert.equal(purposeFunding({ ...input, goalMonthlyAllocationKrw: 100000 }, '2026-09-19').gapKrw, 900000);
  assert.equal(purposeFunding({ ...input, goalMonthlyAllocationKrw: undefined }, '2026-09-19').state, 'NEEDS_CONFIRMATION');
  assert.equal(purposeFunding({ ...input, goalDeadline: '2026-02-30' }, '2026-09-19').state, 'NEEDS_CONFIRMATION');
});
test('one shared saju work core explains role plus autonomy without assigning occupation', () => {
  const { deriveSajuWorkCore } = require('../src/lib/saju-work-core.ts');
  const core = deriveSajuWorkCore({ officerStarCount: 3, peerStarCount: 2, outputStarCount: 4, resourceStarCount: 1 });
  for (const section of Object.values(core.sections)) {
    assert.match(section.text, /이 해석에서는/);
    assert.doesNotMatch(section.text, /프리랜서.*더 맞|직장에 오래 묶|보였을 것|돈이 따라/);
  }
  assert.match(core.sections.jobOrientation.text, /역할.*자율/);
});
test('neutral self-report is not rewritten as impulsive, slow or solitary in personalization', () => {
  const { buildRealWorldPersonalization } = require('../src/lib/real-world-personalization.ts');
  const check = scorePersonalityCheck(Object.fromEntries(['speed','plan','risk','autonomy','spendAwareness','savingConsistency'].map(k => [k,3])));
  const result = buildRealWorldPersonalization({}, { mbti: 'INTJ', check });
  assert.match(result.text, /중간/);
  assert.doesNotMatch(result.text, /즉흥적으로 움직이|결정도 천천히|스스로 판단을 우선하는 사람/);
});

test('all retained financial questions have fact, consumer, result and action traceability', () => {
  const { SURVEY_USAGE } = require('../src/lib/survey-usage.ts');
  const ast = ts.createSourceFile('survey-input.ts', fs.readFileSync(path.join(__dirname,'../src/lib/survey-input.ts'),'utf8'), ts.ScriptTarget.Latest, true);
  const fields = ast.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'SurveyInput').members.map(m => m.name.text);
  assert.deepEqual(Object.keys(SURVEY_USAGE).sort(), fields.sort());
  for (const usage of Object.values(SURVEY_USAGE)) for (const key of ['question','fact','usedBy','resultEffect','actionEffect']) assert.ok(usage[key].length > 0);
  const concern = buildAnalysisResult({ ...base, biggestConcern: '내 돈이 전부 사라졌나 걱정돼요' });
  assert.equal(concern.bottleneck, 'no_priority_bottleneck');
  assert.match(concern.userConcern, /걱정/);
  const method = suggestManagementMethod([], ['social_spending'], { ...base, moneyManagementUnit:'couple', nextReviewDate:'2026-10-01' });
  assert.match(method.whatToRecord, /부부공동.*관계지출/);
  assert.match(method.whenToCheck, /2026-10-01/);
});
test('counseling evidence has no invented cases and confirmed outcome requires measurement provenance', () => {
  const { CounselingPatternSchema, COUNSELING_PATTERNS } = require('../src/lib/counseling-evidence.ts');
  assert.deepEqual(COUNSELING_PATTERNS, []);
  const synthetic = { id:'fixture-only', sourceRef:'fixture:unit-test', anonymized:true, context:'합성 테스트 상황', observedFact:['테스트에서 확인'], followup:['날짜 확인'], diagnosisPattern:'maturity_preparation', action:'잔액 확인', questionIds:['debtMaturity'], outcome:{status:'unknown'} };
  assert.ok(CounselingPatternSchema.safeParse(synthetic).success);
  assert.equal(CounselingPatternSchema.safeParse({ ...synthetic, outcome:{status:'confirmed'} }).success, false);
});
test('deterministic saju reports share the core and pass content validation across strength values', () => {
  const { computeSajuFacts } = require('../src/lib/saju-facts.ts');
  const { buildFreeSajuReport } = require('../src/lib/free-report-mock.ts');
  const { validateFreeSajuReport } = require('../src/lib/free-report-schema.ts');
  const { deriveSajuWorkCore } = require('../src/lib/saju-work-core.ts');
  const facts = computeSajuFacts({ year:1990, month:5, day:15, hour:12, minute:0, gender:'남' });
  for (const strength of ['strong','weak','neutral']) {
    const input = { ...facts, dayStrength:strength };
    const report = buildFreeSajuReport(input);
    const validation = validateFreeSajuReport(report);
    assert.equal(validation.ok, true, validation.violations.join(';'));
    for (const [key, value] of Object.entries(deriveSajuWorkCore(input).sections)) assert.deepEqual(report[key],value);
    assert.doesNotMatch(JSON.stringify(report), /주변에서도.*들었을|자주 보였을|흔치 않은|확실히 줄어/);
    if (strength === 'neutral') assert.match(report.decisionStyle.text, /한쪽으로 정하지/);
  }
});

test('contradictory exact goal details or allocation above available monthly cash require confirmation', () => {
  const { purposeFunding } = require('../src/lib/financial-evidence.ts');
  const exact = { ...goal, goalRequiredKrw:4000000, goalPreparedKrw:2500000, goalMonthlyAllocationKrw:100000, goalDeadline:'2027-03-25' };
  assert.equal(purposeFunding({ ...exact, goalMonthlyAllocationKrw:2000000 },'2026-09-19').state,'NEEDS_CONFIRMATION');
  assert.equal(purposeFunding({ ...exact, goalPreparedKrw:0 },'2026-09-19').state,'NEEDS_CONFIRMATION');
});
test('LLM path cannot overwrite the shared work core or infer decision speed from strength', async () => {
  const { computeSajuFacts } = require('../src/lib/saju-facts.ts');
  const { buildFreeSajuReport } = require('../src/lib/free-report-mock.ts');
  const { getFreeSajuReport } = require('../src/lib/free-report-engine.ts');
  const facts = computeSajuFacts({year:1990,month:5,day:15,hour:12,minute:0,gender:'남'});
  const expected = buildFreeSajuReport(facts);
  const raw = { ...expected, decisionStyle:{text:'타고난 성향만으로 빠르게 결정하는 사람입니다.',evidence:'강약 해석에서 속도를 잘못 추론한 합성 fixture'}, jobOrientation:{text:'정해진 역할은 필요 없이 자유만 중요하다고 가정한 합성 문장입니다.',evidence:'합성 fixture'} };
  const savedFetch = global.fetch, savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY='fixture-only-not-a-secret';
  global.fetch=async()=>({ok:true,json:async()=>({content:[{text:JSON.stringify(raw)}]})});
  try {
    const result=await getFreeSajuReport(facts);
    assert.equal(result.source,'llm');
    assert.deepEqual(result.report.jobOrientation,expected.jobOrientation);
    assert.deepEqual(result.report.decisionStyle,expected.decisionStyle);
  } finally {
    global.fetch=savedFetch;
    if(savedKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=savedKey;
  }
});
