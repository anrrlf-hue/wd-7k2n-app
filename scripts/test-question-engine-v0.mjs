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

const mod = await import(pathToFileURL(path.join(root, "src/lib/question-engine-v0.ts")).href);
const factsMod = await import(pathToFileURL(path.join(root, "src/lib/saju-facts.ts")).href);
const evidenceMod = await import(pathToFileURL(path.join(root, "src/lib/reality-evidence.ts")).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cases = [
  ["Q01", "돈", "money", "money_flow"],
  ["Q02", "재물", "money", "money_flow"],
  ["Q03", "돈 언제 좋아져?", "money", "money_flow"],
  ["Q04", "저축이 안돼", "money", "saving"],
  ["Q05", "돈이 왜 안 모이지?", "money", "saving"],
  ["Q06", "투자해도 돼?", "money", "investment"],
  ["Q07", "주식은?", "money", "investment"],
  ["Q08", "부동산 투자 시기", "money", "investment"],
  ["Q09", "수입이 늘어날까?", "money", "money_flow"],
  ["Q10", "내년 돈 흐름", "money", "money_flow"],

  ["Q11", "사업", "work_business", "business_start"],
  ["Q12", "사업 어때?", "work_business", "business_start"],
  ["Q13", "창업해도 될까?", "work_business", "business_start"],
  ["Q14", "독립하는 게 맞을까?", "work_business", "business_start"],
  ["Q15", "동업은?", "work_business", "partnership"],
  ["Q16", "파트너랑 사업해도 돼?", "work_business", "partnership"],
  ["Q17", "공동사업 시기", "work_business", "partnership"],
  ["Q18", "매출이 좋아질까?", "work_business", "career_growth"],
  ["Q19", "승진 흐름은?", "work_business", "career_growth"],
  ["Q20", "사업을 계속해야 하나?", "work_business", "business_start"],

  ["Q21", "이직", "career", "career_move"],
  ["Q22", "이직 언제?", "career", "career_move"],
  ["Q23", "퇴사할까?", "career", "career_move"],
  ["Q24", "취업 언제 돼?", "career", "career_move"],
  ["Q25", "면접운", "career", "career_move"],
  ["Q26", "직업 바꾸고 싶어", "career", "career_move"],
  ["Q27", "회사 옮기는 건?", "career", "career_move"],
  ["Q28", "연봉이 오를까?", "career", "career_growth"],

  ["Q29", "연애", "love", "love_timing"],
  ["Q30", "연애 언제?", "love", "love_timing"],
  ["Q31", "결혼", "love", "marriage"],
  ["Q32", "결혼 언제?", "love", "marriage"],
  ["Q33", "배우자 운은?", "love", "marriage"],
  ["Q34", "재회 가능해?", "love", "reunion"],
  ["Q35", "헤어진 사람 다시 만날까?", "love", "reunion"],
  ["Q36", "여자친구 언제 생겨?", "love", "love_timing"],
  ["Q37", "인연은 언제?", "love", "love_timing"],

  ["Q38", "인간관계", "relationship", "relationship_conflict"],
  ["Q39", "사람들이랑 왜 자꾸 부딪혀?", "relationship", "relationship_conflict"],
  ["Q40", "동료랑 관계가 안 좋아", "relationship", "relationship_conflict"],
  ["Q41", "가족 관계는?", "relationship", "relationship_conflict"],

  ["Q42", "건강", "wellbeing", "wellbeing_rhythm"],
  ["Q43", "요즘 너무 피곤해", "wellbeing", "wellbeing_rhythm"],
  ["Q44", "생활 리듬 언제 좋아져?", "wellbeing", "wellbeing_rhythm"],
  ["Q45", "스트레스가 심해", "wellbeing", "wellbeing_rhythm"],

  ["Q46", "앞으로", "overall", "overall_change"],
  ["Q47", "미래는?", "overall", "overall_change"],
  ["Q48", "앞날이 궁금해", "overall", "overall_change"],
  ["Q49", "전체 흐름", "overall", "overall_change"],
  ["Q50", "내년에 뭐가 바뀌어?", "overall", "overall_change"],
];

for (const [id, raw, expectedDomain, expectedTopic] of cases) {
  const plan = mod.buildQuestionEnginePlan(raw);
  assert(plan.domain === expectedDomain, `${id}: expected domain ${expectedDomain}, got ${plan.domain}`);
  assert(plan.topic === expectedTopic, `${id}: expected topic ${expectedTopic}, got ${plan.topic}`);
  assert(plan.resolvedQuestion.length >= 10, `${id}: resolved question too short`);
  assert(plan.selectedSignals.length >= 3, `${id}: signal plan too thin`);
  assert(plan.answerFrame.length >= 4, `${id}: answer frame missing`);
  assert(plan.nextQuestions.length === 3, `${id}: must provide exactly three next questions`);
  assert(plan.nextQuestions.every((x) => x.label && x.question && x.focus), `${id}: malformed follow-up`);
}

const inheritedMoney = mod.buildQuestionEnginePlan("그럼 언제?", {
  previousQuestion: "돈",
  previousDomain: "money",
  focusHint: "money",
});
assert(inheritedMoney.domain === "money", "CTX01: short follow-up did not inherit money domain");
assert(inheritedMoney.inheritedContext === true, "CTX01: inherited context flag missing");

const inheritedBusiness = mod.buildQuestionEnginePlan("그럼 시기는?", {
  previousQuestion: "동업은?",
  previousDomain: "work_business",
  focusHint: "work",
});
assert(inheritedBusiness.domain === "work_business", "CTX02: business follow-up lost domain");

const explicitWins = mod.buildQuestionEnginePlan("돈", {
  previousQuestion: "사업 어때?",
  previousDomain: "work_business",
  focusHint: "work",
});
assert(explicitWins.domain === "money", "CTX03: explicit short question must override stale work focus");
assert(explicitWins.focus === "money", "CTX03: explicit money question did not switch visible focus");

const explicitScope = mod.buildQuestionEnginePlan("내년 사업 어때?");
assert(explicitScope.timingStrategy === "explicit_scope", "TIME01: explicit year scope not preserved");
assert(explicitScope.timeScope?.label === "내년", "TIME01: next-year scope label missing");

const oneChar = mod.buildQuestionEnginePlan("돈");
assert(oneChar.raw === "돈" && oneChar.domain === "money", "SHORT01: one-character Korean question failed");

const moneySignals = new Set(oneChar.selectedSignals);
for (const key of ["saju.wealth_stars", "palm.wealth", "palm.bilateral"]) {
  assert(moneySignals.has(key), `SIGNAL01: money plan missing ${key}`);
}
const businessSignals = new Set(mod.buildQuestionEnginePlan("사업").selectedSignals);
for (const key of ["saju.officer_stars", "saju.wealth_stars", "palm.fate", "palm.sun", "palm.wealth"]) {
  assert(businessSignals.has(key), `SIGNAL02: business plan missing ${key}`);
}

const facts = factsMod.computeSajuFacts({
  year: 1990,
  month: 5,
  day: 15,
  hour: 14,
  minute: 30,
  gender: "남",
});
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
  headLine: line(),
  lifeLine: line("완만한 곡선", "김", "보통"),
  fateLine: { presence: "unknown", note: "" },
  mounts: "unknown",
  marks: "unknown",
};
const clear = (note, corroborated = undefined) => ({
  status: "clear",
  strength: 0.7,
  span: 0.65,
  note,
  ...(corroborated === undefined ? {} : { corroborated }),
});
const palmContext = {
  dominantHand: "right",
  primary: { handSide: "right", handShape: "rectangular", onnxLines: palmLines, secondaryLines: {
    fate: clear("fate", true), sun: clear("sun"), wealth: clear("wealth"),
  }},
  right: { handSide: "right", handShape: "rectangular", onnxLines: palmLines, secondaryLines: {
    fate: clear("fate", true), sun: clear("sun"), wealth: clear("wealth"),
  }},
  left: { handSide: "left", handShape: "square", onnxLines: palmLines, secondaryLines: {
    fate: { ...clear("fate"), status: "faint", corroborated: false },
    sun: { ...clear("sun"), status: "faint" },
    wealth: clear("wealth"),
  }},
};
const businessEvidence = evidenceMod.selectRealityEvidence(facts, "work_business", { palmContext });
const businessEvidenceText = businessEvidence.map((x) => `${x.label}: ${x.detail}`).join("\n");
assert(/양손 일·성과선 비교/.test(businessEvidenceText), "PALM01: bilateral work evidence missing");
assert(/운명선/.test(businessEvidenceText) && /태양선/.test(businessEvidenceText), "PALM01: fate/sun evidence missing");
const moneyEvidence = evidenceMod.selectRealityEvidence(facts, "money", { palmContext });
const moneyEvidenceText = moneyEvidence.map((x) => `${x.label}: ${x.detail}`).join("\n");
assert(/양손 재물선 비교/.test(moneyEvidenceText), "PALM02: bilateral wealth evidence missing");
assert(/재물선/.test(moneyEvidenceText) && /운명선/.test(moneyEvidenceText), "PALM02: wealth/fate detail missing");

const astraPartnership = mod.buildQuestionEnginePlan("동업은?", { focusHint: "work" });
assert(
  astraPartnership.domain === "work_business" && astraPartnership.topic === "partnership",
  "ASTRA-Q1: partnership question classification failed",
);
const astraWhen = mod.buildQuestionEnginePlan("그럼 언제?", {
  focusHint: "work",
  previousQuestion: "동업은?",
  previousDomain: "work_business",
});
assert(astraWhen.inheritedContext === true, "ASTRA-Q2: generic follow-up did not inherit context");
assert(astraWhen.topic === "partnership", "ASTRA-Q2: partnership topic was lost on '그럼 언제?'");

const astraBusinessMoney = mod.buildQuestionEnginePlan("사업에서 돈 흐름이 좋아지는 시기는 언제인가요?", {
  focusHint: "money",
  previousQuestion: "사업 어때?",
  previousDomain: "work_business",
});
assert(
  astraBusinessMoney.domain === "money" && astraBusinessMoney.topic === "money_flow",
  "ASTRA-Q3: explicit money question stayed trapped in business domain",
);
const astraDebtMoney = mod.buildQuestionEnginePlan("저는 지금 빚이 1억이고 사업을 접었어요. 돈은 언제 좋아지나요?", {
  focusHint: "money",
});
assert(
  astraDebtMoney.domain === "money" && astraDebtMoney.topic === "money_flow",
  "ASTRA-Q4: historical business context overrode the actual money question",
);

const routeSource = fs.readFileSync(path.join(root, "src/app/api/reality-answer/route.ts"), "utf8");
assert(routeSource.includes("buildQuestionEnginePlan"), "API01: reality answer route does not run question engine v0");
assert(routeSource.includes("previousQuestion") && routeSource.includes("previousDomain"), "API02: previous question context not accepted");
assert(routeSource.includes("domainHint: questionPlan.domain"), "API03: resolved domain is not passed to answer engine");
assert(routeSource.includes("questionPlan,"), "API03b: resolved question plan is not passed to answer engine");
assert(routeSource.includes('min(1)'), "API04: one-character questions are still rejected");
assert(routeSource.includes("palmContext"), "API05: bilateral palm context not accepted by question API");

const diagnosisSource = fs.readFileSync(path.join(root, "src/app/diagnosis/page.tsx"), "utf8");
assert(
  diagnosisSource.includes("previousQuestion: questionAnswer?.question.raw") &&
    diagnosisSource.includes("previousDomain: questionAnswer?.question.domain"),
  "UI00: direct question flow does not send prior conversation context",
);

const funnelSource = fs.readFileSync(path.join(root, "src/components/palm/reality-answer-funnel.tsx"), "utf8");
assert(
  funnelSource.includes("style?.nextTitle") || funnelSource.includes("이어서 무엇이 더 궁금하세요?"),
  "UI01: follow-up question UI missing",
);
assert(funnelSource.includes("askFollowUp"), "UI02: follow-up click handler missing");
assert(funnelSource.includes("previousQuestion") && funnelSource.includes("previousDomain"), "UI03: conversation context not sent");
assert(funnelSource.includes("trimmed.length < 1"), "UI04: one-character questions are still blocked");
assert(funnelSource.includes("길게 설명하지 않아도 됩니다"), "UI05: short-question guidance missing");
assert(funnelSource.includes("buildRealityPalmContext"), "UI06: bilateral palm context is not sent from question UI");

console.log("PASS QUESTION ENGINE V0: 50/50 questions + Astra continuity cases + mixed-domain centering + signal plan + bilateral palm evidence + follow-up UI");
hooks.deregister?.();
