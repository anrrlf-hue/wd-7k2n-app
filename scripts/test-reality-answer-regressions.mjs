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
const contractMod = await import(pathToFileURL(path.join(root, "src/lib/reality-answer-contract.ts")).href);
const managementMod = await import(pathToFileURL(path.join(root, "src/lib/reality-management.ts")).href);
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

const personality = {
  mbti: "ISFJ",
  check: null,
};

const cases = [
  ["R01", "요즘 회사가 너무 답답한데 지금 이직해야 할까요?", "career"],
  ["R02", "계속 취업이 안 되는데 제 흐름은 언제 바뀌나요?", "career"],
  ["R03", "회사 그만두고 제 사업을 시작해도 될까요?", "work_business"],
  ["R04", "회사에서 새 역할 제안이 들어왔는데 제 일 흐름은 어떤가요?", "work_business"],
  ["R05", "지금 만나는 사람과 관계 흐름이 어떤가요?", "love"],
  ["R06", "헤어진 사람과 재회 흐름이 다시 들어오나요?", "love"],
  ["R07", "왜 저는 돈이 들어와도 계속 안 모일까요?", "money"],
  ["R08", "사람들이랑 자꾸 부딪히는데 관계운은 어떤가요?", "relationship"],
  ["R09", "요즘 너무 지치는데 생활 흐름은 어떤가요?", "wellbeing"],
  ["R10", "앞으로 제 흐름은 언제 크게 바뀌나요?", "overall"],
];

const outputs = [];

for (const [id, raw, expectedDomain] of cases) {
  const parsed = questionMod.parseRealityQuestion(raw);
  assert(parsed.domain === expectedDomain, `${id}: expected domain ${expectedDomain}, got ${parsed.domain}`);
  assert(parsed.decisionPoint, `${id}: question focus missing`);

  const question = {
    raw: parsed.raw,
    domain: parsed.domain,
    intent: parsed.intent,
    decisionPoint: parsed.decisionPoint,
  };

  const evidence = evidenceMod.selectRealityEvidence(facts, question.domain, { personality, palm: null });
  assert(evidence.length > 0, `${id}: evidence missing`);

  const answer = builderMod.buildRealityAnswerFallback({
    question,
    facts,
    evidence,
    personality,
  });

  const validation = contractMod.validateRealityAnswer(answer);
  assert(validation.ok, `${id}: answer validation failed: ${validation.errors.join("; ")}`);
  assert(answer.report, `${id}: narrative report missing`);
  assert(answer.report.questionReading.length >= 80, `${id}: question report too short`);
  assert(answer.report.currentFlow.length >= 80, `${id}: current-flow report too short`);
  assert(answer.report.solutionReading.length >= 80, `${id}: interpretation report too short`);
  assert(answer.realityChecks.length > 0, `${id}: reality variables missing`);
  assert(!answer.actions, `${id}: new answer must not generate action checklist`);

  const reportText = [
    answer.headline,
    answer.report.questionReading,
    answer.report.currentFlow,
    answer.report.solutionReading,
    answer.report.timingReading ?? "",
  ].join("\n");
  assert(
    !/(분석 방법|해석 방법|근거를 골라|왜 이렇게 봤)/.test(reportText),
    `${id}: method/explanation language leaked into customer report`,
  );
  assert(
    !/(반드시|무조건|틀림없이|100\s*%)/.test(reportText),
    `${id}: deterministic claim leaked`,
  );

  // 출생시간이 있는 질문은 "언제"라는 단어가 없어도 답 + 세운·월운 시기를 같이 준다.
  assert((answer.timing.windows?.length ?? 0) >= 1, `${id}: answer must include timing windows`);
  assert(answer.timing.precision === "monthly", `${id}: expected monthly timing precision`);
  assert(/20\d{2}년/.test(answer.timing.windows[0].label), `${id}: timing window has no year`);
  for (const window of answer.timing.windows) {
    assert(window.meaning?.length > 10, `${id}: timing meaning missing`);
    assert(window.positive?.length > 10, `${id}: positive timing interpretation missing`);
    assert(window.caution?.length > 10, `${id}: timing caution missing`);
    assert(!/(세운|월운|십성)/.test(window.reason), `${id}: technical timing jargon leaked to customer copy`);
  }
  if ((answer.timing.windows?.length ?? 0) > 1) {
    const meanings = answer.timing.windows.map((window) => window.meaning);
    const positives = answer.timing.windows.map((window) => window.positive);
    const cautions = answer.timing.windows.map((window) => window.caution);
    assert(new Set(meanings).size === meanings.length, `${id}: timing meanings are duplicated across windows`);
    assert(new Set(positives).size === positives.length, `${id}: timing positives are duplicated across windows`);
    assert(new Set(cautions).size === cautions.length, `${id}: timing cautions are duplicated across windows`);
  }

  if (expectedDomain === "wellbeing") {
    assert(answer.safetyNote?.includes("질병 진단"), "R09: health safety note missing");
  }

  outputs.push({
    id,
    domain: answer.question.domain,
    headline: answer.headline,
    timing: answer.timing.windows[0].label,
  });
}

// 같은 5개 사용자 선택은 끝까지 유지하되 내부에서만 세부 분야로 나뉜다.
assert(
  focusMod.realityDomainForSajuFocus("love_relationship", "relationship") === "relationship",
  "F01: love_relationship should allow relationship internal routing",
);
assert(
  focusMod.realityDomainForSajuFocus("love_relationship", "love") === "love",
  "F02: love_relationship should allow love internal routing",
);
assert(
  focusMod.realityDomainForSajuFocus("work", "career") === "career",
  "F03: work should allow career internal routing",
);
assert(
  focusMod.realityDomainForSajuFocus("work", "work_business") === "work_business",
  "F04: work should allow business internal routing",
);

const timingParsed = questionMod.parseRealityQuestion("여자친구는 언제 생길까요?");
const timingQuestion = {
  raw: timingParsed.raw,
  domain: timingParsed.domain,
  intent: timingParsed.intent,
  decisionPoint: timingParsed.decisionPoint,
};
const timingEvidence = evidenceMod.selectRealityEvidence(facts, timingQuestion.domain, { personality, palm: null });
const timingAnswer = builderMod.buildRealityAnswerFallback({
  question: timingQuestion,
  facts,
  evidence: timingEvidence,
  personality,
});
assert((timingAnswer.timing.windows?.length ?? 0) >= 1, "T01: love timing windows missing");
assert(/20\d{2}년/.test(timingAnswer.headline), "T01: direct love answer must include timing");
assert(!/(기록|행동|30일)/.test(timingAnswer.headline), "T01: timing answer drifted back to coaching");
console.log("PASS T01 direct love answer + timing");

// Customer UI regression: 5 visible choices, no why/how evidence UI, no action checklist.
const funnelSource = fs.readFileSync(path.join(root, "src/components/palm/reality-answer-funnel.tsx"), "utf8");
const reportSectionSource = fs.readFileSync(path.join(root, "src/components/diagnosis/report-section.tsx"), "utf8");
const myeongsikSource = fs.readFileSync(path.join(root, "src/components/diagnosis/myeongsik-section.tsx"), "utf8");
const palmPageSource = fs.readFileSync(path.join(root, "src/components/palm/palm-page-client.tsx"), "utf8");
const palmDetectionSource = fs.readFileSync(path.join(root, "src/lib/palm-detection.ts"), "utf8");
assert(funnelSource.includes("SAJU_FOCUS_VALUES.map"), "UI01: question flow must use the same five Saju choices");
assert(!funnelSource.includes("REALITY_ANSWER_DOMAINS.map"), "UI02: old seven-choice UI remains");
assert(!funnelSource.includes("왜 이렇게 봤나요"), "UI03: why-explanation UI remains in question answer");
assert(!funnelSource.includes("answer.actions"), "UI04: action checklist remains in question answer");
assert(!reportSectionSource.includes("왜 이렇게 봤나요"), "UI05: why toggle remains in free report");
assert(!reportSectionSource.includes("어떻게 할까요"), "UI06: how-to toggle remains in free report");
assert(!myeongsikSource.includes("왜 이렇게 봤나요"), "UI07: Ohaeng why details remain");
assert(
  palmPageSource.includes("자동 확인이 끝나지 않아도 촬영할 수 있어요"),
  "UI08: mobile palm capture must remain available when preview analysis is not ready",
);
assert(
  palmPageSource.includes("60000"),
  "UI09: palm analysis timeout must allow slower mobile model startup",
);
assert(
  palmPageSource.includes("다른 사진 선택하기") && palmPageSource.includes("손금 없이 사주 결과만 계속 보기"),
  "UI10: palm error state must offer recovery paths",
);
assert(
  palmDetectionSource.includes("handLandmarkerPromise = null") &&
    palmDetectionSource.includes("shouldSkipSecondaryPoseModel"),
  "UI11: palm model retry/mobile pressure guards missing",
);

console.log("REALITY ANSWER REGRESSION RESULTS");
for (const item of outputs) {
  console.log(`PASS ${item.id} [${item.domain}] :: ${item.headline} / ${item.timing}`);
}
console.log("\nPASS 10/10 answer+timing + 5-choice consistency + no coaching UI");

// My Management: save answer, note, duplicate update. No action/status tracking.
const memory = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

const managementParsed = questionMod.parseRealityQuestion("지금 이직 흐름은 어떤가요?");
const managementQuestion = {
  raw: managementParsed.raw,
  domain: managementParsed.domain,
  intent: managementParsed.intent,
  decisionPoint: managementParsed.decisionPoint,
};
const managementEvidence = evidenceMod.selectRealityEvidence(
  facts,
  managementQuestion.domain,
  { personality, palm: null },
);
const managementAnswer = builderMod.buildRealityAnswerFallback({
  question: managementQuestion,
  facts,
  evidence: managementEvidence,
  personality,
});

const saved = managementMod.saveRealityAnswer({
  birthInput: { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" },
  answer: managementAnswer,
});
assert(managementMod.loadRealityManagement().records.length === 1, "M01: answer was not saved");
managementMod.updateRealityNote(saved.id, "답과 시기를 다시 확인함");
let managed = managementMod.loadRealityManagement().records[0];
assert(managed.note === "답과 시기를 다시 확인함", "M02: note was not saved");
assert(!("actionDone" in managed), "M03: action tracking must not exist in V2 record");
assert(!("checkDueAt" in managed), "M04: 30-day check must not exist in V2 record");
const duplicate = managementMod.saveRealityAnswer({
  birthInput: saved.birthInput,
  answer: managementAnswer,
});
assert(duplicate.id === saved.id, "M05: same question should update instead of duplicate");
assert(managementMod.loadRealityManagement().records.length === 1, "M05: duplicate record created");
console.log("PASS M01-M05 answer-centered management persistence");

hooks.deregister?.();
