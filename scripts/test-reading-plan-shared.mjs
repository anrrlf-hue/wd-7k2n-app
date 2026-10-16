import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
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
const { buildCustomerReadingPlan } = await import(pathToFileURL(path.join(root, "src/lib/customer-reading-plan.ts")).href);
const { buildCustomerFreeNarrative, buildCustomerPremiumNarrative } = await import(pathToFileURL(path.join(root, "src/lib/saju-customer-narrative.ts")).href);

const fixtures = [
  { id: "1995", year: 1995, month: 3, day: 12, hour: 9, minute: 0, gender: "남" },
  { id: "1988", year: 1988, month: 11, day: 23, hour: null, minute: null, gender: "여" },
  { id: "1972", year: 1972, month: 6, day: 5, hour: 15, minute: 0, gender: "남" },
  { id: "2001", year: 2001, month: 12, day: 30, hour: 19, minute: 0, gender: "여" },
];

const cases = fixtures.map((input) => {
  const facts = computeSajuFacts(input);
  const plan = buildCustomerReadingPlan(facts);
  const free = buildCustomerFreeNarrative(facts);
  const premium = buildCustomerPremiumNarrative(facts);
  return { input, facts, plan, free, premium };
});

for (const item of cases) {
  assert.ok(item.plan.themes.length >= 2 && item.plan.themes.length <= 3, `${item.input.id}: 2-3 themes`);
  assert.equal(item.plan.allocations.length, 3, `${item.input.id}: three domain allocations`);
  for (const theme of item.plan.themes) {
    assert.ok(theme.meaning && theme.opposite && theme.conditions.length >= 1, `${item.input.id}: complete theme ${theme.id}`);
    assert.ok(theme.evidenceIds.length >= 1, `${item.input.id}: theme evidence ${theme.id}`);
  }
  for (const allocation of item.plan.allocations) {
    assert.ok(allocation.scene && allocation.choice && allocation.evidenceIds.length >= 1, `${item.input.id}: concrete ${allocation.domain} allocation`);
  }
  assert.equal(JSON.stringify(item.free.plan), JSON.stringify(item.plan), `${item.input.id}: free uses shared plan`);
  assert.equal(JSON.stringify(item.premium.plan), JSON.stringify(item.plan), `${item.input.id}: premium uses shared plan`);
  assert.doesNotMatch(JSON.stringify(item.free), /여러 기준을 함께 살펴보는 흐름/);
  if (!item.facts.hasTimeInput) assert.doesNotMatch(item.free.snapshot.text, /강한 편|약한 편|격국은|용신은/);
}

assert.ok(new Set(cases.map((item) => item.plan.themes.map((theme) => theme.id).join(","))).size >= 3, "themes vary by chart facts");
assert.ok(new Set(cases.map((item) => item.plan.allocations.map((allocation) => allocation.scene).join("|"))).size >= 3, "domain scenes vary by chart facts");
for (const item of cases) {
  assert.ok(item.free.snapshot.text.length > 40, `${item.input.id}: free snapshot`);
  assert.ok(item.premium.overall?.some((text) => text.length > 40), `${item.input.id}: premium overall`);
}

console.log(JSON.stringify(cases.map((item) => ({
  id: item.input.id,
  themes: item.plan.themes.map((theme) => theme.id),
  scenes: item.plan.allocations.map((allocation) => allocation.scene),
})), null, 2));
console.log("PASS shared reading plan");
hooks.deregister?.();
