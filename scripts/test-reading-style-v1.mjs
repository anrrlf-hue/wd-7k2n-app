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
const questionMod = await import(pathToFileURL(path.join(root, "src/lib/reality-question.ts")).href);
const evidenceMod = await import(pathToFileURL(path.join(root, "src/lib/reality-evidence.ts")).href);
const builderMod = await import(pathToFileURL(path.join(root, "src/lib/reality-answer-builder.ts")).href);
const styleMod = await import(pathToFileURL(path.join(root, "src/lib/reading-style-v1.ts")).href);
const questionEngineMod = await import(pathToFileURL(path.join(root, "src/lib/question-engine-v0.ts")).href);

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

const parsed = questionMod.parseRealityQuestion("사업 어때?");
const question = {
  raw: parsed.raw,
  domain: parsed.domain,
  intent: parsed.intent,
  decisionPoint: parsed.decisionPoint,
  timeScope: parsed.timeScope,
};

const line = (curve = "직선에 가까움", length = "김", depthStrength = "강함") => ({
  detected: true,
  length,
  curve,
  depthStrength,
  start: { x: 0.1, y: 0.2 },
  end: { x: 0.8, y: 0.8 },
  branchDetected: null,
});
const palmLines = {
  modelExecuted: true,
  heartLine: line("완만한 곡선", "보통", "보통"),
  headLine: line("직선에 가까움", "김", "강함"),
  lifeLine: line("완만한 곡선", "김", "보통"),
  fateLine: { presence: "unknown", note: "" },
  mounts: "unknown",
  marks: "unknown",
};
const signal = (status, note, corroborated) => ({
  status,
  strength: status === "clear" ? 0.75 : 0.3,
  span: 0.65,
  note,
  ...(corroborated === undefined ? {} : { corroborated }),
});
const palmContext = {
  dominantHand: "right",
  primary: {
    handSide: "right",
    handShape: "rectangular",
    onnxLines: palmLines,
    secondaryLines: {
      fate: signal("clear", "fate", true),
      sun: signal("clear", "sun"),
      wealth: signal("clear", "wealth"),
    },
  },
  right: {
    handSide: "right",
    handShape: "rectangular",
    onnxLines: palmLines,
    secondaryLines: {
      fate: signal("clear", "fate", true),
      sun: signal("clear", "sun"),
      wealth: signal("clear", "wealth"),
    },
  },
  left: {
    handSide: "left",
    handShape: "square",
    onnxLines: {
      ...palmLines,
      headLine: line("완만한 곡선", "보통", "보통"),
    },
    secondaryLines: {
      fate: signal("faint", "fate", false),
      sun: signal("faint", "sun"),
      wealth: signal("clear", "wealth"),
    },
  },
};

const evidence = evidenceMod.selectRealityEvidence(facts, "work_business", {
  palmContext,
  palm: palmLines,
});
const answer = builderMod.buildRealityAnswerFallback({
  question,
  facts,
  evidence,
  personality: null,
  palmContext,
  questionPlan: questionEngineMod.buildQuestionEnginePlan("사업 어때?", { focusHint: "work" }),
});
const plan = questionEngineMod.buildQuestionEnginePlan("사업 어때?");
const view = styleMod.buildReadingStyleV1View(answer, plan.nextQuestions);

assert(
  /사업을 묻는다면|직장에서는/.test(answer.headline),
  "S01: direct answer still starts as a bare timing report instead of a personal reading",
);
assert(
  /변화나 기회가 부각되는 시기/.test(answer.headline),
  "S02: direct answer lost calculated timing",
);
assert(
  /두뇌선/.test(answer.report.solutionReading) || /오른손/.test(answer.report.solutionReading),
  "S03: actual palm evidence was not woven into the integrated future reading",
);
assert(
  /오른손 두뇌선/.test(answer.report.solutionReading) &&
    /왼손 두뇌선/.test(answer.report.solutionReading) &&
    /서로 다르게 관찰/.test(answer.report.solutionReading),
  "S04: differing bilateral palm observations were collapsed into one hand story",
);
assert(
  !/(현재 생활에서 스스로 방향을 정하려는|기본적으로 가지고 있던 일의 기준을 현재 생활에서)/.test(
    answer.report.solutionReading,
  ),
  "S04b: rigid left/right life-role mapping leaked into palm integration",
);
assert(
  !/(손금으로 .*시기|손금에서 .*20\d{2}년)/.test(answer.report.solutionReading),
  "S05: palm bridge invented timing",
);
assert(!/이후 후보 시기는/.test(answer.report.solutionReading), "S05b: strength-ranked timing described as chronology");

const oneHandContext = {
  dominantHand: "right",
  primary: palmContext.right,
  right: palmContext.right,
  left: null,
};
const oneHandEvidence = evidenceMod.selectRealityEvidence(facts, "work_business", {
  palmContext: oneHandContext,
  palm: palmLines,
});
const oneHandStory = styleMod.buildPalmEvidenceBridge(
  "work_business",
  oneHandEvidence,
  oneHandContext,
);
assert(
  /다른 손의 관찰값이 없어 양손 비교는 하지 않습니다/.test(oneHandStory ?? ""),
  "S05c: single-hand observation still fabricates bilateral comparison",
);
assert(!/^양손/.test(oneHandStory ?? ""), "S05d: single-hand narrative starts as bilateral");

assert(view.personalTitle === "당신에게는 이렇게 나타나요", "S06: personal section title drifted");
assert(view.currentTitle === "지금은 이런 흐름입니다", "S07: current section title drifted");
assert(view.futureTitle === "앞으로는 이렇게 볼 수 있어요", "S08: future section title drifted");
assert(view.cautionTitle === "여기서는 이것만 조심해서 보세요", "S09: caution section title drifted");
assert(view.nextQuestions.length === 3, "S10: conversational next-question bridge missing");

const styleRules = styleMod.READING_STYLE_V1_RULES.join("\n");
for (const phrase of ["직접 답", "출처를 섞지", "억지로 일치시키지", "다음 질문"]) {
  assert(styleRules.includes(phrase), `S11: style contract missing rule: ${phrase}`);
}

const directUi = fs.readFileSync(path.join(root, "src/components/diagnosis/question-answer-result.tsx"), "utf8");
const palmUi = fs.readFileSync(path.join(root, "src/components/palm/reality-answer-funnel.tsx"), "utf8");
const diagnosisPage = fs.readFileSync(path.join(root, "src/app/diagnosis/page.tsx"), "utf8");

for (const phrase of [
  "buildReadingStyleV1View",
  "style.personalTitle",
  "style.currentTitle",
  "style.futureTitle",
  "style.cautionTitle",
]) {
  assert(directUi.includes(phrase), `UI01: direct question flow missing Reading Style V1: ${phrase}`);
}
assert(palmUi.includes("buildReadingStyleV1View"), "UI02: palm question flow is not using Reading Style V1");
assert(
  !palmUi.includes('<h3 className="text-lg font-semibold">사주로 보면</h3>'),
  "UI03: old report-style Saju heading remains in palm question result",
);
assert(
  diagnosisPage.includes("questionPlan={questionPlan}") &&
    diagnosisPage.includes("onAskFollowUp"),
  "UI04: direct question flow does not continue conversationally",
);
assert(
  diagnosisPage.includes("effectiveQuestion.length < 1"),
  "UI05: short one-word questions are still blocked in direct question mode",
);

console.log("PASS READING STYLE V1: direct answer + observed-hand fidelity + timing wording + caution + next question");
hooks.deregister?.();
