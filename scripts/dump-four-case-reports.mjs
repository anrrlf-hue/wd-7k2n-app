import "./register-test-typescript.mjs";

const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");

const cases = [
  ["1995-03-12-09", 1995, 3, 12, 9, "남"],
  ["1988-11-23-unknown", 1988, 11, 23, null, "여"],
  ["1972-06-05-15", 1972, 6, 5, 15, "남"],
  ["2001-12-30-19", 2001, 12, 30, 19, "여"],
];

for (const [id, year, month, day, hour, gender] of cases) {
  const facts = computeSajuFacts({ year, month, day, hour, minute: hour === null ? null : 0, gender });
  const free = buildFreeSajuReport(facts);
  const premium = buildPremiumReport({ facts, freeReport: free, referenceDate: new Date("2026-10-16T00:00:00Z") });
  console.log(`\n===== ${id} FREE =====`);
  console.log(JSON.stringify(free, null, 2));
  console.log(`\n===== ${id} PREMIUM =====`);
  console.log(JSON.stringify(premium, null, 2));
}
