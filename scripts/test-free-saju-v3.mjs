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

const unknownFacts = factsMod.computeSajuFacts({
  year: 1995,
  month: 7,
  day: 15,
  hour: null,
  minute: null,
  gender: "여",
});
assert(unknownFacts.dayStrengthReliable === false, "ASTRA-T1: unknown-time strength marked reliable");
assert(unknownFacts.wealthOpportunityDaeunCount === null, "ASTRA-T2: unknown Daeun count collapsed to zero");
const unknownReport = reportMod.buildFreeSajuReport(unknownFacts);
const unknownText = [
  unknownReport.snapshot.text,
  unknownReport.temperament.text,
  unknownReport.loveStyle.text,
  unknownReport.keepingStyle.text,
  unknownReport.bigMoneyAffinity.text,
  unknownReport.decisionStyle.text,
].join("\n");
assert(
  !unknownText.includes("자기 기준이 분명하고 한번 방향을 잡으면 쉽게 흔들리지 않습니다"),
  "ASTRA-T3: provisional noon strength leaked into unknown-time snapshot",
);
assert(
  !unknownText.includes("결정을 쉽게 남에게 맡기는 편은 아닙니다"),
  "ASTRA-T4: provisional noon strength leaked into unknown-time decision style",
);
assert(
  /출생시간|확정하지|단정하지/.test(unknownText),
  "ASTRA-T5: unknown-time uncertainty is not preserved in customer copy",
);
assert(
  !/대운 중 재성 겹침 0회/.test(unknownReport.bigMoneyAffinity.evidence),
  "ASTRA-T6: unknown Daeun opportunity count exposed as zero",
);
assert(
  unknownReport.cautions.every((item) => !/일간\s+(강|약)/.test(item.evidence)),
  "ASTRA-T7: unknown-time provisional strength selected a personalized caution",
);

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
assert(resultSource.includes("내 사주를 이어서 보면"), "broad overall Saju UI missing");
assert(resultSource.includes("관계에서는 이렇게 나타나요") || resultSource.includes("buildFreeConsultationSections"), "relationship consultation section missing from free result");
assert(resultSource.includes("에너지를 쓰고 회복하는 방식도 보입니다") || resultSource.includes("buildFreeConsultationSections"), "life rhythm consultation section missing from free result");
assert(!resultSource.includes("나의 재물사주"), "money-only free-result heading remains");
assert(resultSource.includes("다음은 손금으로 이어봅니다"), "free Saju must lead to palm before detailed topics");
assert(resultSource.includes("손금까지 본 뒤 연애·관계"), "post-Saju sequence must explain detail topics after palm");
assert(!resultSource.includes("내 질문 답과 시기 보기"), "question CTA must not interrupt Saju -> palm sequence");

const homeSource = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
const diagnosisSource = fs.readFileSync(path.join(root, "src/app/diagnosis/page.tsx"), "utf8");
const focusStepSource = fs.readFileSync(path.join(root, "src/components/diagnosis/saju-focus-step.tsx"), "utf8");
const postReadingSource = fs.readFileSync(path.join(root, "src/components/palm/post-reading-detail-flow.tsx"), "utf8");

assert(!homeSource.includes("LandingFocusSelector"), "focus choices must not cover the first landing screen");
assert(homeSource.includes("내 사주 무료로 보기"), "free Saju primary CTA missing");
assert(!homeSource.includes("궁금한 것 바로 물어보기"), "direct question CTA must not bypass Saju -> palm sequence");
assert(
  homeSource.includes("/diagnosis?mode=free&focus=overall&start=free"),
  "primary CTA must start the broad free Saju flow directly",
);
assert(
  homeSource.includes("손금까지 보면 더 입체적입니다") &&
    homeSource.includes("그다음 궁금한 분야를 깊게 봅니다"),
  "homepage value sequence must be Saju -> palm -> detail",
);
assert(diagnosisSource.includes('setFocus("overall")') && diagnosisSource.includes('setStep("date")'), "free Saju must start broad without an overall chooser");
assert(focusStepSource.includes("SAJU_DETAIL_FOCUS_VALUES"), "detail chooser must use only four detailed topics");
assert(!focusStepSource.includes("SAJU_FOCUS_VALUES.map"), "overall must not remain in the visible detail choices");
assert(postReadingSource.includes("어떤 부분을 더 자세히 볼까요?"), "post-palm detail chooser missing");
assert(postReadingSource.includes("연애·관계") || postReadingSource.includes("SAJU_FOCUS_LABELS"), "relationship detail path missing");
assert(postReadingSource.includes("PersonCompareCard"), "person compare must move after the personal reading");
assert(postReadingSource.includes("history.length < 2"), "question flow must stop after one follow-up");
assert(postReadingSource.includes("slice(0, 2)"), "question flow must show at most two follow-up choices");
assert(postReadingSource.includes("질문 내용은") && postReadingSource.includes("더 가까워"), "cross-domain question must be explained instead of silently mismatching the selected topic");

const consultationSource = fs.readFileSync(path.join(root, "src/lib/free-consultation-style-v1.ts"), "utf8");
assert(!consultationSource.match(/key: "money"[\s\S]{0,500}bigMoneyAffinity/), "broad Saju still overweights big-money content");
assert(!consultationSource.match(/key: "money"[\s\S]{0,500}peopleAndMoney/), "broad Saju still overweights finance relationship content");
assert(!resultSource.includes("WealthTypeSection"), "broad Saju still injects a separate wealth-type card");

const palmPageSource = fs.readFileSync(path.join(root, "src/components/palm/palm-page-client.tsx"), "utf8");
assert(palmPageSource.includes("object-contain object-center"), "palm camera/preview must preserve the full hand frame");
assert(!palmPageSource.includes("size-full object-cover"), "palm result preview still crops the hand image");

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
  myeongsikSource.includes("오행은 이렇게 참고하면 돼요"),
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

console.log("PASS FREE SAJU V9: Saju-first + unknown-time guards + real free-to-question handoff + optional palm");
hooks.deregister?.();
