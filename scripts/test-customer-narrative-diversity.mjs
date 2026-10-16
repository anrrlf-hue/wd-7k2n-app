import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import ts from "typescript";
import { registerHooks } from "node:module";

const root = process.cwd();
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let target = path.join(root, "src", specifier.slice(2));
      if (fs.existsSync(target + ".ts")) target += ".ts";
      if (fs.existsSync(target + ".tsx")) target += ".tsx";
      return nextResolve(pathToFileURL(target).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      const file = fileURLToPath(url);
      if (file.startsWith(root)) return {
        format: "module",
        source: ts.transpileModule(fs.readFileSync(file, "utf8"), {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const { computeSajuFacts } = await import(pathToFileURL(path.join(root, "src/lib/saju-facts.ts")).href);
const { buildCustomerFreeNarrative } = await import(pathToFileURL(path.join(root, "src/lib/saju-customer-narrative.ts")).href);
const { buildPremiumReport } = await import(pathToFileURL(path.join(root, "src/lib/premium-report.ts")).href);

const fixtures = [
  { id: "1995-03-12-09", year: 1995, month: 3, day: 12, hour: 9, minute: 0, gender: "\ub0a8" },
  { id: "1988-11-23-unknown", year: 1988, month: 11, day: 23, hour: null, minute: null, gender: "\uc5ec" },
  { id: "1972-06-05-15", year: 1972, month: 6, day: 5, hour: 15, minute: 0, gender: "\ub0a8" },
  { id: "2001-12-30-19", year: 2001, month: 12, day: 30, hour: 19, minute: 0, gender: "\uc5ec" },
  { id: "1991-08-17-07", year: 1991, month: 8, day: 17, hour: 7, minute: 0, gender: "\ub0a8" },
  { id: "1984-02-29-22", year: 1984, month: 2, day: 29, hour: 22, minute: 0, gender: "\uc5ec" },
];

const reports = fixtures.map((input) => {
  const facts = computeSajuFacts(input);
  const free = buildCustomerFreeNarrative(facts);
  const premium = buildPremiumReport({ facts, freeReport: { report: free }, referenceDate: new Date("2026-10-16T00:00:00Z") });
  return { input, facts, free, premium };
});

function text(report, key) {
  const fields = {
    relationship: ["relationshipStyle", "loveStyle"],
    work: ["jobOrientation", "teamStrength", "soloStrength", "opportunityStyle"],
    money: ["wealthStructure", "earningStyle", "keepingStyle", "leakPattern", "peopleAndMoney"],
  }[key] ?? [key];
  return fields.map((field) => report.free[field]?.text ?? "").join("\n");
}

for (const report of reports) {
  assert.ok(text(report, "relationship").length > 100, `${report.input.id}: relationship copy exists`);
  assert.ok(text(report, "work").length > 100, `${report.input.id}: work copy exists`);
  assert.ok(text(report, "money").length > 100, `${report.input.id}: money copy exists`);
  for (const key of ["relationship", "work", "money"]) {
    const fields = {
      relationship: ["relationshipStyle", "loveStyle"],
      work: ["jobOrientation", "teamStrength", "soloStrength", "opportunityStyle"],
      money: ["wealthStructure", "earningStyle", "keepingStyle", "leakPattern", "peopleAndMoney"],
    }[key];
    const paragraphs = fields.map((field) => report.free[field]?.text ?? "");
    assert.equal(new Set(paragraphs).size, paragraphs.length, `${report.input.id}: ${key} paragraphs are not exact duplicates`);
  }
  assert.ok(!JSON.stringify(report).includes("가치이 놓여"), `${report.input.id}: particle typo removed`);
  assert.ok(!JSON.stringify(report).includes("다시 하고 싶은 부분에 값을 받아들이는 주제"), `${report.input.id}: unclear money phrase removed`);
}

for (const key of ["relationship", "work", "money"]) {
  const values = reports.map((report) => text(report, key));
  assert.ok(new Set(values).size >= 4, `${key}: at least four distinct narratives across six synthetic adults`);
}
assert.notEqual(
  text(reports[2], "relationship"),
  text(reports[3], "relationship"),
  "1972 and 2001 relationship narratives are chart-specific",
);
assert.ok(new Set(reports.map((report) => report.free.opportunityStyle.text)).size >= 4, "opportunity narratives are chart-specific");
assert.notEqual(reports[2].free.wealthStructure.text, reports[2].free.earningStyle.text, "1972 wealth and earning add different information");
assert.notEqual(reports[0].premium.overall.paragraphs[1], reports[1].premium.overall.paragraphs[1], "1995 and 1988 premium overall context differs");
assert.match(text(reports[1], "work"), /기준|책임|결정권/);
assert.match(reports[1].premium.domains.find((domain) => domain.key === "work")?.paragraphs.join("\n") ?? "", /기준|책임|결정권/);
const premiumSerialized = JSON.stringify(reports.map((report) => report.premium));
assert.doesNotMatch(premiumSerialized, /쓰임과 교환와|현재 대운을 계산할 수 없어|현재 대운이 계산되지 않아/);
assert.doesNotMatch(text(reports[3], "money"), /이미 눈에 보이는 기회가 여러 번 생겨도/);

const workTexts = reports.map((report) => text(report, "work"));
assert.ok(workTexts.some((value) => value.includes("초안을 먼저 보여")), "work: expression case retained");
assert.ok(workTexts.some((value) => value.includes("실제 고객이나 동료")), "work: accumulated-results case retained");
assert.ok(workTexts.some((value) => value.includes("선택할 재량")), "work: action-and-judgment case retained");

const moneyTexts = reports.map((report) => text(report, "money"));
assert.ok(moneyTexts.some((value) => value.includes("실제 생활에서 불편")), "money: practical-cost case retained");
assert.ok(moneyTexts.some((value) => value.includes("공동지출")), "money: shared-cost case retained");
assert.ok(moneyTexts.some((value) => value.includes("표현을 위해")), "money: expression-to-use case retained");

const premiumMoney = reports.map((report) => report.premium.domains.find((domain) => domain.key === "money")?.paragraphs.join("\n") ?? "");
const premiumWork = reports.map((report) => report.premium.domains.find((domain) => domain.key === "work")?.paragraphs.join("\n") ?? "");
assert.ok(new Set(premiumMoney).size >= 4, "premium money narratives remain distinct");
assert.ok(new Set(premiumWork).size >= 4, "premium work narratives remain distinct");
assert.equal(reports[0].premium.title, "프리미엄 통합 풀이", "premium product title matches integrated product scope");
const premiumEntry = fs.readFileSync(path.join(root, "src/components/palm/post-reading-detail-flow.tsx"), "utf8");
assert.match(premiumEntry, /프리미엄 통합 풀이/);
assert.doesNotMatch(premiumEntry, /프리미엄 깊은풀이 · 나의 12개월/);

console.log(JSON.stringify(reports.map((report) => ({
  id: report.input.id,
  dayStem: report.facts.dayStemKo,
  premiumTitle: report.premium.title,
  temperament: report.free.temperament.text,
  relationship: text(report, "relationship"),
  work: text(report, "work"),
  money: text(report, "money"),
  opportunity: report.free.opportunityStyle.text,
  premiumOverall: report.premium.overall?.paragraphs ?? [],
  premiumLove: report.premium.domains.find((domain) => domain.key === "love_relationship")?.paragraphs ?? [],
  premiumWork: report.premium.domains.find((domain) => domain.key === "work")?.paragraphs,
  premiumMoney: report.premium.domains.find((domain) => domain.key === "money")?.paragraphs,
})), null, 2));
console.log("PASS customer narrative diversity");
hooks.deregister?.();
