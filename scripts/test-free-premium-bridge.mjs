import assert from "node:assert/strict";
import "./register-test-typescript.mjs";

const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");

const facts = computeSajuFacts({ year: 1995, month: 3, day: 12, hour: 9, minute: 0, gender: "남" });
const freeReport = buildFreeSajuReport(facts);
const connected = buildPremiumReport({ facts, freeReport, referenceDate: new Date("2026-10-16T00:00:00Z") });
const disconnected = buildPremiumReport({ facts, referenceDate: new Date("2026-10-16T00:00:00Z") });

assert.deepEqual(connected.overall.paragraphs, disconnected.overall.paragraphs);
assert.ok(connected.domains.every((domain) => domain.paragraphs.length === 2));
assert.ok(connected.domains.every((domain) => !domain.paragraphs.some((paragraph) => /장면 실제|장면 기준|자리 잘해|자리 책임/.test(paragraph))));

const freeDomainText = {
  love_relationship: [freeReport.relationshipStyle.text, freeReport.loveStyle.text],
  work: [freeReport.jobOrientation.text, freeReport.teamStrength.text],
  money: [freeReport.wealthStructure.text, freeReport.earningStyle.text],
};
for (const domain of connected.domains) {
  assert.notDeepEqual(domain.paragraphs, freeDomainText[domain.key], `${domain.key}: premium must not reprint free paragraphs`);
}
const premiumMoney = connected.domains.find((domain) => domain.key === "money").paragraphs.join("\n");
assert.match(premiumMoney, /수입|대가|사용자|공동|자원/, "premium money explains income, use, or shared resources");
assert.doesNotMatch(premiumMoney, /^돈에서는 새 장비가 있으면[\s\S]*실제로 써 보니 불편했던 지점/, "premium money is not the free equipment copy");

const facts1988 = computeSajuFacts({ year: 1988, month: 11, day: 23, hour: null, minute: null, gender: "여" });
const free1988 = buildFreeSajuReport(facts1988);
const premium1988 = buildPremiumReport({ facts: facts1988, freeReport: free1988, referenceDate: new Date("2026-10-16T00:00:00Z") });
const premium1988Text = premium1988.domains.map((domain) => `${domain.key}: ${domain.paragraphs.join(" ")}`).join("\n");
assert.match(premium1988Text, /독립성|재량|공동 자원|공동지출/, "1988 premium keeps responsibility/independence domain distinctions");
for (const domain of premium1988.domains) {
  const freeParagraphs = freeDomainText[domain.key];
  assert.notDeepEqual(domain.paragraphs, freeParagraphs, `1988 ${domain.key}: premium must not reprint free paragraphs`);
}

console.log("free-premium bridge: passed");
