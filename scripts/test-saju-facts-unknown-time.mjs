import assert from "node:assert/strict";
import "./register-test-typescript.mjs";
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildFreeSajuReportUserPrompt } = await import("../src/lib/free-report-prompt.ts");

const unknown = computeSajuFacts({ year: 1988, month: 11, day: 23, hour: null, minute: null, gender: "여" });
assert.equal(unknown.hasTimeInput, false);
assert.deepEqual(unknown.pillars.map((pillar) => pillar.pillar), ["year", "month", "day"]);
assert.equal(unknown.currentDaeun, null);
assert.equal(unknown.nextDaeun, null);
assert.deepEqual(unknown.daeunList, []);
assert.equal(unknown.geukguk, "미확인");
assert.match(unknown.compactText, /시간 미상/);
assert.doesNotMatch(unknown.compactText, /12:00/);
assert.doesNotMatch(unknown.compactText, /\| 시 \| 일 \| 월 \| 년 \|/);
assert.doesNotMatch(unknown.compactText, /^支 .*丙/m);

const prompt = buildFreeSajuReportUserPrompt(unknown);
assert.match(prompt, /격국: 미확인/);
assert.match(prompt, /출생시간 미상/);
assert.doesNotMatch(prompt, /12:00/);

const known = computeSajuFacts({ year: 1995, month: 3, day: 12, hour: 9, minute: 0, gender: "남" });
assert.equal(known.hasTimeInput, true);
assert.equal(known.pillars.length, 4);
assert.notEqual(known.currentDaeun, null);
assert.match(known.compactText, /12\s*[:：]\s*00|09\s*[:：]\s*00/);

console.log("saju facts unknown-time regression: passed");
