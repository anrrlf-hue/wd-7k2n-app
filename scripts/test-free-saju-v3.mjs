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

const customerReportText = [
  report.snapshot.text,
  report.temperament.text,
  report.relationshipStyle.text,
  report.loveStyle.text,
  report.lifeRhythm.text,
  report.wealthStructure.text,
  report.jobOrientation.text,
  report.decisionStyle.text,
  report.opportunityStyle.text,
  ...report.strengths.map((item) => item.detail),
  ...report.cautions.map((item) => item.detail),
].join("\n");
assert(!/편 편입니다/.test(customerReportText), "awkward duplicated grammar leaked into free Saju");
assert(
  !/(사주에 .*몰입|실제로도 이렇게 움직이는지 확인해 보세요|비슷했던 상황과 달랐던 상황은 무엇인가요)/.test(customerReportText),
  "meta/self-check filler leaked into customer Saju copy",
);
assert(
  !/(정점의 기운|정점 기운)/.test(report.opportunityStyle.text),
  "abstract internal-energy wording leaked into opportunity copy",
);

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
assert(resultSource.includes("사주를 더 이어서 보면"), "free Saju must lead naturally into the question/timing step");
assert(resultSource.includes("내 질문 답과 시기 보기"), "post-free question CTA missing");
assert(resultSource.includes("원하면 손금까지 더해볼 수 있어요"), "palm must remain an optional deeper step");

const homeSource = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
const diagnosisSource = fs.readFileSync(path.join(root, "src/app/diagnosis/page.tsx"), "utf8");
const focusStepSource = fs.readFileSync(path.join(root, "src/components/diagnosis/saju-focus-step.tsx"), "utf8");

assert(!homeSource.includes("LandingFocusSelector"), "focus choices must not cover the first landing screen");
assert(homeSource.includes("내 사주 무료로 보기"), "free Saju primary CTA missing");
assert(homeSource.includes("궁금한 것 바로 물어보기"), "question secondary CTA missing");
assert(
  homeSource.includes("/diagnosis?mode=free&focus=overall&start=free"),
  "primary CTA must start the broad free Saju flow directly",
);
assert(homeSource.includes("/diagnosis?mode=question"), "question CTA must preserve direct question mode");
assert(
  homeSource.includes("궁금한 건 시기까지 묻습니다") &&
    homeSource.includes("원하면 손금까지 더합니다"),
  "homepage value sequence must be Saju -> question/timing -> optional palm",
);
assert(diagnosisSource.includes('type Step ='), "diagnosis step state missing");
assert(diagnosisSource.includes('| "question"'), "question-first step missing from diagnosis flow");
assert(diagnosisSource.includes('/api/reality-answer'), "question-first flow must call the answer/timing API");
assert(diagnosisSource.includes('mode === "question"'), "question-first mode routing missing");
assert(diagnosisSource.includes('params.get("start") === "free"'), "direct free Saju start routing missing");
assert(diagnosisSource.includes('params.get("from") === "free"'), "free-to-question handoff routing missing");
assert(focusStepSource.includes("어떤 사주가"), "diagnosis focus chooser missing");
assert(focusStepSource.includes("전체 사주"), "overall Saju choice missing");

const questionStepSource = fs.readFileSync(path.join(root, "src/components/diagnosis/question-first-step.tsx"), "utf8");
const questionResultSource = fs.readFileSync(path.join(root, "src/components/diagnosis/question-answer-result.tsx"), "utf8");
const palmEntrySource = fs.readFileSync(path.join(root, "src/components/diagnosis/palm-entry-card.tsx"), "utf8");
assert(questionStepSource.includes("지금 가장 궁금한 것을"), "direct question input screen missing");
assert(questionStepSource.includes("답과 함께"), "question promise copy missing");
assert(questionStepSource.includes("hasBirthInfo") && questionStepSource.includes("답과 시기 보기"), "post-free question must reuse birth info");
assert(questionResultSource.includes("눈여겨볼 시기"), "answer result timing section missing");
assert(palmEntrySource.includes("같은 질문에 손금까지 더해볼까요"), "optional palm enhancement CTA missing");
assert(questionResultSource.includes("전체 사주 무료로 보기"), "free Saju escape hatch missing from question answer");

const personalityStepSource = fs.readFileSync(path.join(root, "src/components/diagnosis/personality-step.tsx"), "utf8");
assert(personalityStepSource.includes("MBTI"), "MBTI selection must remain");
assert(!personalityStepSource.includes("PERSONALITY_CHECK_ITEMS"), "six-question personality UI must be removed");
assert(!personalityStepSource.includes("LIKERT"), "1-5 personality scale must be removed");
assert(!diagnosisSource.includes("personalityAnswers"), "diagnosis flow must not send six-question answers");

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
  myeongsikSource.includes("오행에서 이렇게 볼 수 있어요"),
  "Ohaeng guidance must be visible without a tap",
);
assert(
  !myeongsikSource.includes("<EvidenceToggle"),
  "Ohaeng guidance is still hidden behind a toggle",
);
assert(!myeongsikSource.includes("왜 이렇게 봤나요"), "Ohaeng explanation toggle must not be customer-facing");
const reportSectionSource = fs.readFileSync(path.join(root, "src/components/diagnosis/report-section.tsx"), "utf8");
assert(!reportSectionSource.includes("왜 이렇게 봤나요"), "why-explanation toggle remains in free report");
assert(!reportSectionSource.includes("어떻게 할까요"), "action-guidance toggle remains in free report");
assert(resultSource.includes("다른 영역은 한눈에"), "focused reading should summarize other areas instead of repeating full sections");

console.log("PASS FREE SAJU V9: Saju-first entry + seamless question/timing + optional palm + MBTI-only UI");
hooks.deregister?.();
