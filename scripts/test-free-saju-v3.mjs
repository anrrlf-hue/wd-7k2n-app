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
const focusReportMod = await import(pathToFileURL(path.join(root, "src/lib/free-saju-focus-report.ts")).href);
const personalityMod = await import(pathToFileURL(path.join(root, "src/lib/personality-check.ts")).href);

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

assert(focusMod.SAJU_FOCUS_VALUES.length === 5, "free Saju must expose exactly five top-level choices");
for (const focus of focusMod.SAJU_FOCUS_VALUES) {
  assert(focusMod.parseSajuFocus(focus) === focus, "focus parser failed: " + focus);
}
assert(focusMod.parseSajuFocus("love") === "love_relationship", "legacy love focus mapping failed");
assert(focusMod.parseSajuFocus("relationship") === "love_relationship", "legacy relationship focus mapping failed");
assert(focusMod.parseSajuFocus("career") === "work", "legacy career focus mapping failed");
assert(focusMod.parseSajuFocus("work_business") === "work", "legacy business focus mapping failed");
assert(focusMod.parseSajuFocus("unknown") === "overall", "unknown focus must fall back to overall");

for (const focus of ["love_relationship", "work", "money", "wellbeing"]) {
  const focused = focusReportMod.buildFocusedSajuReport(facts, report, focus);
  assert(focused, "focused report missing: " + focus);
  assert(focused.sections.length === 5, "focused report must have exactly five sections: " + focus);
  assert(
    focused.sections.every((section) => section.paragraph.text.trim().length >= 80),
    "focused report section too shallow: " + focus,
  );
}
assert(
  focusReportMod.buildFocusedSajuReport(facts, report, "overall") === null,
  "overall Saju should stay broad instead of generating a focused deep-dive",
);

const resultSource = fs.readFileSync(path.join(root, "src/components/diagnosis/result-step.tsx"), "utf8");
assert(resultSource.includes("집중풀이"), "focused deep-dive UI missing");
assert(resultSource.includes("이 분야는 전체 사주보다 더 깊게 봅니다"), "focused-vs-overall distinction missing");
assert(resultSource.includes("나의 종합 사주"), "broad overall Saju UI missing");
assert(resultSource.includes("연애·결혼에서의 나"), "love section missing from free result");
assert(resultSource.includes("생활 리듬과 스트레스 패턴"), "life rhythm section missing from free result");
assert(!resultSource.includes("나의 재물사주"), "money-only free-result heading remains");

const homeSource = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
const diagnosisSource = fs.readFileSync(path.join(root, "src/app/diagnosis/page.tsx"), "utf8");
const focusStepSource = fs.readFileSync(path.join(root, "src/components/diagnosis/saju-focus-step.tsx"), "utf8");

assert(!homeSource.includes("LandingFocusSelector"), "focus choices must not cover the first landing screen");
assert(homeSource.includes("내 사주 무료 보기"), "simple first-screen Saju CTA missing");
assert(
  homeSource.includes("궁금한 질문에") &&
    homeSource.includes("사주로 답합니다"),
  "third first-screen benefit was not updated",
);
assert(diagnosisSource.includes('type Step = "focus"'), "focus must be the first diagnosis step");
assert(focusStepSource.includes("어떤 사주가"), "diagnosis focus chooser missing");
assert(focusStepSource.includes("전체 사주"), "overall Saju choice missing");

const personalityIds = personalityMod.PERSONALITY_CHECK_ITEMS.map((item) => item.id);
assert(
  JSON.stringify(personalityIds) === JSON.stringify([
    "speed",
    "plan",
    "change",
    "autonomy",
    "emotionExpression",
    "socialEnergy",
  ]),
  "self-check must use six universal, non-finance axes",
);
assert(!personalityIds.includes("spendAwareness"), "finance-biased spend question remains");
assert(!personalityIds.includes("savingConsistency"), "finance-biased saving question remains");

const myeongsikSource = fs.readFileSync(path.join(root, "src/components/diagnosis/myeongsik-section.tsx"), "utf8");
assert(
  myeongsikSource.includes("오행에서 이렇게 참고해보세요"),
  "Ohaeng guidance must be visible without a tap",
);
assert(
  !myeongsikSource.includes("<EvidenceToggle"),
  "Ohaeng guidance is still hidden behind a toggle",
);
assert(resultSource.includes("다른 영역은 한눈에"), "focused reading should summarize other areas instead of repeating full sections");

console.log("PASS FREE SAJU V5: 5 choices + focused reading + universal self-check + visible Ohaeng guidance");
hooks.deregister?.();
