/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS hook runs TS tests without adding a runtime dependency. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...args);
};
require.extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { surplusKrw } = require('../src/lib/survey-input.ts');
const { detectBottleneck } = require('../src/lib/bottleneck-engine.ts');
const { buildAnalysisResult } = require('../src/lib/analysis-result.ts');
const { computeExperienceOutcome } = require('../src/lib/indirect-experience.ts');
const base = { biggestConcern: '', jobType: 'employee_fixed', futureEvents: ['none'], monthlyIncomeKrw: 3000000,
  monthlyFixedCostKrw: 1000000, monthlyLivingCostKrw: 1200000, monthlySavingsKrw: 900000,
  expenseAwareness: 'rough', emergencyFund: '3_6m', hasDebt: false, moneyManagementUnit: 'individual', spendingPatterns: ['auto_savings'] };

test('management routines reflect behavior without changing financial diagnosis', () => {
  const { suggestManagementMethod } = require('../src/lib/management-method.ts');
  const before = buildAnalysisResult(base);
  assert.equal(suggestManagementMethod(['security', 'security', 'growth'], []).id, 'rules');
  assert.equal(suggestManagementMethod(['flexibility', 'flexibility', 'growth'], []).id, 'simple');
  assert.equal(suggestManagementMethod(['growth', 'growth', 'security'], []).id, 'review');
  assert.equal(suggestManagementMethod(['security', 'flexibility', 'growth'], []).id, 'neutral');
  assert.equal(suggestManagementMethod([], []).id, 'neutral');
  assert.equal(suggestManagementMethod(['security', 'security', 'growth'], ['avoidance']).id, 'scheduled');
  assert.deepEqual(buildAnalysisResult(base), before);
});
test('living expenses expose an overcommitted monthly budget', () => {
  assert.equal(surplusKrw(base), -100000);
  assert.equal(detectBottleneck(base), 'cash_flow_deficit');
});
test('missing, negative and non-finite financial amounts cannot create a diagnosis', () => {
  for (const v of [undefined, NaN, Infinity, -1]) {
    const input = { ...base, monthlyLivingCostKrw: v };
    assert.equal(detectBottleneck(input), 'insufficient_data');
    assert.equal(buildAnalysisResult(input).surplusKrw, null);
  }
});
test('zero income is valid and zero costs are explicit data', () => {
  assert.equal(detectBottleneck({ ...base, monthlyIncomeKrw: 0 }), 'cash_flow_deficit');
  assert.equal(surplusKrw({ ...base, monthlyLivingCostKrw: 0 }), 1100000);
});
test('healthy answers do not imply an unmeasured investment problem', () => {
  assert.equal(detectBottleneck({ ...base, monthlySavingsKrw: 500000 }), 'no_priority_bottleneck');
});
test('partially prepared small event remains a shortfall', () => {
  assert.equal(detectBottleneck({ ...base, monthlySavingsKrw: 0, futureEvents: ['moving'], futureEventTiming: 'under_3m', futureEventAmount: 'under_500', futureEventPrepared: 'over_half' }), 'near_future_funds_shortfall');
});
test('simulation reflects selected behavior and ties without grading', () => {
  const a = computeExperienceOutcome('HOLD', ['flexibility', 'flexibility', 'security']);
  const b = computeExperienceOutcome('HOLD', ['security', 'security', 'flexibility']);
  assert.notEqual(a, b);
  assert.match(a, /유연/);
  assert.match(computeExperienceOutcome('ACCUM', ['security', 'flexibility', 'growth']), /고르게/);
  assert.match(computeExperienceOutcome('ACCUM', []), /아직/);
});
test('conditional financial answers are required before classifying', () => {
  assert.equal(detectBottleneck({ ...base, hasDebt: true }), 'insufficient_data');
  assert.equal(detectBottleneck({ ...base, futureEvents: ['moving'] }), 'insufficient_data');
  assert.equal(detectBottleneck({ ...base, jobType: 'business_owner' }), 'insufficient_data');
});
test('existing priority chain still prefers deficit over debt and debt over reserves', () => {
  const debt = { ...base, hasDebt: true, debtInterestRate: 'over_15', debtMaturity: 'over_1y', debtMonthlyPayment: '30_100', debtRepaymentType: 'principal_interest', emergencyFund: 'none' };
  assert.equal(detectBottleneck(debt), 'cash_flow_deficit');
  assert.equal(detectBottleneck({ ...debt, monthlySavingsKrw: 0 }), 'high_interest_debt');
});
test('reserve estimate includes living costs and declares its approximation', () => {
  const result = buildAnalysisResult({ ...base, monthlySavingsKrw: 500000, emergencyFund: 'none' });
  assert.equal(result.bottleneck, 'emergency_fund_shortage');
  assert.match(result.gapStatement, /14개월/);
  assert.match(result.gapStatement, /추정/);
});
test('fully prepared and distant events do not create a near-term shortfall', () => {
  const event = { ...base, monthlySavingsKrw: 0, futureEvents: ['moving'], futureEventTiming: 'under_3m', futureEventAmount: 'over_2000', futureEventPrepared: 'enough' };
  assert.equal(detectBottleneck(event), 'no_priority_bottleneck');
  assert.equal(detectBottleneck({ ...event, futureEventTiming: 'over_1y', futureEventPrepared: 'none' }), 'no_priority_bottleneck');
});

test('income-change events use income and living buffer answers, never purpose-fund buckets', () => {
  for (const event of ['leave', 'retirement', 'job_change']) {
    const input = { ...base, monthlySavingsKrw: 500000, futureEvents: [event], futureEventTiming: 'under_3m', futureIncomeChange: 'stopped', futureLivingBuffer: '1_3m' };
    assert.equal(detectBottleneck(input), 'income_interruption_risk');
    assert.equal(detectBottleneck({ ...input, futureIncomeChange: 'same' }), 'no_priority_bottleneck');
    assert.equal(detectBottleneck({ ...input, futureEventTiming: 'over_1y' }), 'no_priority_bottleneck');
    assert.equal(detectBottleneck({ ...input, futureIncomeChange: 'unknown' }), 'insufficient_data');
    assert.equal(detectBottleneck({ ...input, futureLivingBuffer: undefined }), 'insufficient_data');
  }
});

test('a named primary event scopes multi-event answers and stale purpose fields cannot override income answers', () => {
  const input = { ...base, monthlySavingsKrw: 500000, futureEvents: ['marriage', 'job_change'], futureEventTiming: 'under_3m', futureEventAmount: 'under_500', futureEventPrepared: 'enough', futureIncomeChange: 'stopped', futureLivingBuffer: 'none' };
  assert.equal(detectBottleneck(input), 'insufficient_data');
  assert.equal(detectBottleneck({ ...input, primaryFutureEvent: 'job_change' }), 'income_interruption_risk');
  assert.equal(detectBottleneck({ ...input, primaryFutureEvent: 'marriage' }), 'no_priority_bottleneck');
  assert.equal(detectBottleneck({ ...input, primaryFutureEvent: 'moving' }), 'insufficient_data');
});

test('income-event result uses the event-specific buffer, names the scope, and keeps deficit first', () => {
  const input = { ...base, monthlySavingsKrw: 500000, futureEvents: ['leave'], futureEventTiming: 'under_3m', futureIncomeChange: 'reduced', futureLivingBuffer: '1_3m', emergencyFund: 'over_6m' };
  const result = buildAnalysisResult(input);
  assert.match(result.gapStatement, /휴직/);
  assert.match(result.gapStatement, /1~3개월/);
  assert.doesNotMatch(result.gapStatement, /약 6개월/);
  assert.equal(detectBottleneck({ ...input, monthlySavingsKrw: 900000 }), 'cash_flow_deficit');
});

test('changing the primary event clears only its dependent answers', () => {
  const { selectFutureEvents, selectPrimaryFutureEvent } = require('../src/lib/future-event.ts');
  const answered = { ...base, futureEvents: ['marriage'], primaryFutureEvent: 'marriage', futureEventTiming: 'under_3m', futureEventAmount: 'under_500', futureEventPrepared: 'enough' };
  const multiple = selectFutureEvents(answered, ['marriage', 'leave']);
  assert.equal(multiple.primaryFutureEvent, undefined);
  assert.equal(multiple.futureEventTiming, undefined);
  assert.equal(multiple.monthlyLivingCostKrw, answered.monthlyLivingCostKrw);
  const income = { ...selectPrimaryFutureEvent(multiple, 'leave'), futureEventTiming: '3_6m', futureIncomeChange: 'same', futureLivingBuffer: 'over_6m' };
  const switched = selectPrimaryFutureEvent(income, 'marriage');
  assert.equal(switched.futureIncomeChange, undefined);
  assert.equal(switched.futureLivingBuffer, undefined);
  assert.equal(switched.futureEventTiming, undefined);
  assert.equal(selectFutureEvents(income, ['leave']).futureLivingBuffer, 'over_6m');
  assert.equal(selectFutureEvents(answered, ['none']).futureEventAmount, undefined);
  assert.equal(answered.futureEventAmount, 'under_500');
});

test('all event copy names the event and uses the appropriate money questions', () => {
  const { FUTURE_EVENT_PLANS, futureEventAnswersComplete } = require('../src/lib/future-event.ts');
  assert.equal(Object.keys(FUTURE_EVENT_PLANS).length, 10);
  for (const plan of Object.values(FUTURE_EVENT_PLANS)) {
    assert.ok(plan.timing.includes(plan.label));
    if (plan.kind === 'purpose') {
      assert.ok(plan.amount.includes(plan.label));
      assert.match(plan.prepared, /자금/);
      assert.equal(plan.income, undefined);
    } else {
      assert.ok(plan.income.includes(plan.label));
      assert.match(plan.buffer, /생활비/);
      assert.equal(plan.amount, undefined);
    }
  }
  assert.equal(futureEventAnswersComplete(base), true);
  assert.equal(futureEventAnswersComplete({ ...base, futureEvents: ['none', 'moving'] }), false);
});

test('unknown income preparation explains what must be clarified instead of calling it a zero balance', () => {
  const result = buildAnalysisResult({ ...base, monthlySavingsKrw: 500000, futureEvents: ['leave'], futureEventTiming: 'under_3m', futureIncomeChange: 'unknown', futureLivingBuffer: 'unknown' });
  assert.equal(result.bottleneck, 'insufficient_data');
  assert.match(result.why, /휴직/);
  assert.match(result.immediateDirection, /소득/);
  assert.equal(result.surplusKrw, null);
});
