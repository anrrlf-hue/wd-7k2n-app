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
const personalityMod = await import(pathToFileURL(path.join(root, "src/lib/personality-check.ts")).href);
const managementMod = await import(pathToFileURL(path.join(root, "src/lib/reality-management.ts")).href);

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
  mbti: null,
  check: personalityMod.scorePersonalityCheck({
    speed: 2,
    plan: 2,
    risk: 2,
    autonomy: 2,
    spendAwareness: 4,
    savingConsistency: 3,
  }),
};

const cases = [
  ["R01", "요즘 회사가 너무 답답한데 지금 이직해야 할까요?", "career"],
  ["R02", "계속 취업이 안 되는데 저는 뭘 바꿔야 할까요?", "career"],
  ["R03", "회사 그만두고 제 사업을 시작해도 될까요?", "work_business"],
  ["R04", "회사에서 새 역할을 맡아보라는데 받아야 할까요?", "work_business"],
  ["R05", "지금 만나는 사람과 계속 만나도 될까요?", "love"],
  ["R06", "헤어진 사람과 재회하려고 다시 연락해도 될까요?", "love"],
  ["R07", "왜 저는 돈이 들어와도 계속 안 모일까요?", "money"],
  ["R08", "사람들이랑 자꾸 부딪히는데 제가 문제일까요?", "relationship"],
  ["R09", "요즘 너무 지치는데 사주에서 건강이 안 좋은 건가요?", "wellbeing"],
  ["R10", "지금 뭔가 바꿔야 할 것 같은데 움직일 때인가요?", "overall"],
];

const outputs = [];

for (const [id, raw, expectedDomain] of cases) {
  const parsed = questionMod.parseRealityQuestion(raw);
  assert(parsed.domain === expectedDomain, `${id}: expected domain ${expectedDomain}, got ${parsed.domain}`);
  assert(parsed.decisionPoint, `${id}: decision point missing`);

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
  assert(answer.actions.length === 3, `${id}: action count must be 3`);
  assert(answer.actions.every((x) => x.doneWhen.trim().length > 0), `${id}: doneWhen missing`);
  assert(answer.realityChecks.length > 0, `${id}: reality checks missing`);
  assert(answer.timing.precision === "daeun_only", `${id}: timing precision must be daeun_only`);
  if (expectedDomain === "wellbeing") {
    assert(answer.safetyNote?.includes("질병 진단"), "R09: health safety note missing");
  }

  const generated = [
    answer.headline,
    answer.whyNow,
    answer.repeatingPattern,
    answer.avoid,
    answer.choose,
    ...answer.actions.flatMap((x) => [x.title, x.detail, x.doneWhen]),
  ].join("\n");
  assert(!/(반드시|무조건|틀림없이|100\s*%)/.test(generated), `${id}: deterministic claim leaked`);

  outputs.push({
    id,
    domain: answer.question.domain,
    headline: answer.headline,
    firstAction: answer.actions[0].title,
  });
}

assert(
  new Set(outputs.map((x) => x.firstAction)).size >= 7,
  "Reality actions are too generic across domains",
);

const ambiguous = questionMod.parseRealityQuestion("요즘 어떻게 해야 할지 모르겠어요");
assert(ambiguous.domain === null, "Ambiguous question should request clarification instead of inventing a domain");

console.log("REALITY ANSWER REGRESSION RESULTS");
for (const item of outputs) {
  console.log(`PASS ${item.id} [${item.domain}] :: ${item.headline} / ${item.firstAction}`);
}
console.log("\nPASS 10/10 + ambiguous-question guard");

// My Management persistence regression.
const memory = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

const managementParsed = questionMod.parseRealityQuestion("지금 이직을 준비하는 게 맞을까요?");
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
assert(managementMod.loadRealityManagement().records.length === 1, "M01: reality answer was not saved");
managementMod.updateRealityAction(saved.id, 0, true);
let managed = managementMod.loadRealityManagement().records[0];
assert(managed.actionDone[0] === true && managed.status === "active", "M02: action progress was not saved");
managementMod.updateRealityNote(saved.id, "첫 행동 실행 완료");
managed = managementMod.loadRealityManagement().records[0];
assert(managed.note === "첫 행동 실행 완료", "M03: management note was not saved");
managementMod.updateRealityAction(saved.id, 1, true);
managementMod.updateRealityAction(saved.id, 2, true);
managed = managementMod.loadRealityManagement().records[0];
assert(managed.status === "completed", "M04: all actions should complete the record");
const duplicate = managementMod.saveRealityAnswer({
  birthInput: saved.birthInput,
  answer: managementAnswer,
});
assert(duplicate.id === saved.id, "M05: same question should update instead of duplicate");
assert(managementMod.loadRealityManagement().records.length === 1, "M05: duplicate management record created");
console.log("PASS M01-M05 reality management persistence");

hooks.deregister?.();
