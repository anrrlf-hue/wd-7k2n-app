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
const schemaMod = await import(pathToFileURL(path.join(root, "src/lib/free-report-schema.ts")).href);
const focusMod = await import(pathToFileURL(path.join(root, "src/lib/saju-focus.ts")).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const facts = factsMod.computeSajuFacts({
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  minute: 30,
  gender: "남",
});

const report = reportMod.buildFreeSajuReport(facts);
const validation = schemaMod.validateFreeSajuReport(report);

assert(validation.ok, "V3 schema validation failed: " + validation.violations.join("; "));
assert(report.relationshipStyle.text.length >= 60, "relationshipStyle is too shallow");
assert(report.loveStyle.text.length >= 80, "loveStyle is too shallow");
assert(report.lifeRhythm.text.length >= 80, "lifeRhythm is too shallow");
assert(!/(질병이 있다|간이 안|심장이 안|반드시 결혼|상대가.*사랑)/.test(
  [report.relationshipStyle.text, report.loveStyle.text, report.lifeRhythm.text].join("\n")
), "unsafe relationship/health claim leaked into free V3");

for (const focus of focusMod.SAJU_FOCUS_VALUES) {
  assert(focusMod.parseSajuFocus(focus) === focus, "focus parser failed: " + focus);
}
assert(focusMod.parseSajuFocus("unknown") === "overall", "unknown focus must fall back to overall");

const resultSource = fs.readFileSync(path.join(root, "src/components/diagnosis/result-step.tsx"), "utf8");
assert(resultSource.includes("먼저 보고 싶은 주제"), "focus-first result UI missing");
assert(resultSource.includes("전체 사주도 함께 보기"), "full Saju continuation UI missing");
assert(resultSource.includes("연애·결혼에서의 나"), "love section missing from free result");
assert(resultSource.includes("생활 리듬과 스트레스 패턴"), "life rhythm section missing from free result");
assert(!resultSource.includes("나의 재물사주"), "money-only free-result heading remains");

const landingSource = fs.readFileSync(path.join(root, "src/components/landing/focus-selector.tsx"), "utf8");
assert(landingSource.includes("무엇이 가장 궁금하세요?"), "landing focus selector missing");
assert(landingSource.includes("전체 사주"), "overall Saju choice missing");

console.log("PASS FREE SAJU V3: universal report + 7 focus choices");
hooks.deregister?.();
