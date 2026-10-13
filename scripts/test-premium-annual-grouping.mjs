import './register-test-typescript.mjs';
import assert from 'node:assert/strict';
const { computeSajuFacts } = await import('../src/lib/saju-facts.ts');
const { enrichSajuFacts } = await import('../src/lib/oh-my-saju-adapter.ts');
const { buildPremiumReport, buildPremiumPeriods } = await import('../src/lib/premium-report.ts');

// Invented fixture. Flatten the five broad signals on purpose: exact annual
// symbols still distinguish the months and keep the chronological order.
const birth = { year: 2000, month: 1, day: 1, hour: 12, minute: 0, gender: '남' };
const facts = enrichSajuFacts(computeSajuFacts(birth), birth);
const report = buildPremiumReport({ facts, referenceDate: new Date('2026-10-13T00:00:00Z') });
const annual = structuredClone(report.annual);
annual.months.forEach(month => month.comparisons.forEach(comparison => {
  comparison.signals = { year: ['관성'], month: ['식상'], background: [] };
}));
const periods = buildPremiumPeriods(annual, facts);
assert.equal(periods.length, 12);
assert.deepEqual(periods.flatMap(p => p.months), annual.months.map(m => m.label));
assert.equal(new Set(periods.map(p => p.symbols.month.ganzhi)).size, 12);
assert.ok(periods.every(p => p.reading.includes(p.symbols.month.ganzhi)));
assert.notEqual(periods[4].reading, periods[5].reading);
assert.notEqual(periods[10].reading, periods[11].reading);
assert.notEqual(periods[3].symbols.year.ganzhi, periods[4].symbols.year.ganzhi,
  'the annual background changes at the solar-year boundary');
assert.ok(periods[4].reading.includes(periods[3].symbols.year.ganzhi)
  && periods[4].reading.includes(periods[4].symbols.year.ganzhi));
console.log('PASS exact monthly stem/branch, year boundary and 12 chronological readings despite identical broad groups');
