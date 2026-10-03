import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { registerHooks } from "node:module";

const root = process.cwd();
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let target = path.join(root, "src", specifier.slice(2));
      if (fs.existsSync(target + ".ts")) target += ".ts";
      else if (fs.existsSync(target + ".tsx")) target += ".tsx";
      return nextResolve(pathToFileURL(target).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      const file = fileURLToPath(url);
      if (file.startsWith(root)) {
        return {
          format: "module",
          source: ts.transpileModule(fs.readFileSync(file, "utf8"), {
            compilerOptions: {
              target: ts.ScriptTarget.ES2022,
              module: ts.ModuleKind.ES2022,
              jsx: ts.JsxEmit.ReactJSX,
            },
          }).outputText,
          shortCircuit: true,
        };
      }
    }
    return nextLoad(url, context);
  },
});

const factsMod = await import(pathToFileURL(path.join(root, "src/lib/saju-facts.ts")).href);
const reportMod = await import(pathToFileURL(path.join(root, "src/lib/free-report-mock.ts")).href);
const styleMod = await import(pathToFileURL(path.join(root, "src/lib/free-consultation-style-v1.ts")).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const facts = factsMod.computeSajuFacts({
  year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남",
});
const report = reportMod.buildFreeSajuReport(facts);
const sections = styleMod.buildFreeConsultationSections(report);

const keys = sections.map((section) => section.key);
assert(JSON.stringify(keys) === JSON.stringify(["self","relationship","work","money","life","strengths","cautions","now","future"]), "C01: consultation section order drifted");
assert(sections.every((section) => section.paragraphs.length > 0), "C02: empty consultation section");

const allText = sections.flatMap((section) => section.paragraphs).join("\n");
// 전체 사주는 균형 잡힌 요약만 유지하고, 반복되던 재물 심화 문단은 돈·재물 상세로 이동한다.
for (const paragraph of [
  report.temperament.text, report.decisionStyle.text,
  report.relationshipStyle.text, report.loveStyle.text,
  report.jobOrientation.text, report.teamStrength.text, report.soloStrength.text, report.opportunityStyle.text,
  report.wealthStructure.text, report.earningStyle.text, report.keepingStyle.text,
  report.lifeRhythm.text, report.nextMove.text, report.timingShift.text,
]) {
  assert(allText.includes(paragraph), "C03: core broad-Saju content was dropped by consultation grouping");
}
for (const paragraph of [report.leakPattern.text, report.bigMoneyAffinity.text, report.peopleAndMoney.text]) {
  assert(!allText.includes(paragraph), "C03b: finance-heavy deep content leaked back into broad Saju");
}

for (const phrase of ["당신은 이런 사람입니다","관계에서는 이렇게 나타나요","일에서는 이런 방식이 잘 드러납니다","지금은 무엇이 중요해지는 시기인가","다음 흐름에서는 무엇이 달라질까"]) {
  assert(sections.some((section) => section.title === phrase), "C04: missing consultation title: " + phrase);
}

const resultSource = fs.readFileSync(path.join(root, "src/components/diagnosis/result-step.tsx"), "utf8");
assert(resultSource.includes("ConsultationFreeReport"), "UI01: consultation renderer missing");
assert(resultSource.includes("성향부터 관계·일·돈·앞으로의 흐름까지 하나로 이어봅니다"), "UI02: overall consultation bridge missing");
assert(!resultSource.includes('step={"②-"'), "UI03: old numbered broad-report steps remain");
assert(!resultSource.includes('step={"①-"'), "UI04: old numbered focused-report steps remain");

const daeunSource = fs.readFileSync(path.join(root, "src/components/diagnosis/daeun-flow-section.tsx"), "utf8");
assert(daeunSource.includes("지금은 이런 흐름입니다"), "UI05: Daeun section still sounds like a technical report");
assert(!daeunSource.includes("대운 흐름 — 지금 이 시기"), "UI06: old technical Daeun heading remains");

const myeongsikSource = fs.readFileSync(path.join(root, "src/components/diagnosis/myeongsik-section.tsx"), "utf8");
assert(myeongsikSource.includes("내 사주표"), "UI07: Saju structure reference heading missing");

const rules = styleMod.FREE_CONSULTATION_STYLE_RULES.join("\n");
for (const phrase of ["사람을 먼저", "중복", "전문용어", "출생시간"]) {
  assert(rules.includes(phrase), "C05: consultation style contract missing: " + phrase);
}

console.log("PASS FREE SAJU CONSULTATION V1: balanced broad story + finance-depth deferred + natural timing + no numbered report flow");
hooks.deregister?.();