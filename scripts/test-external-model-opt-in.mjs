// Invented input and a dummy credential; every fetch is intercepted in-process.
// Never read a real credential, load .env files or call an external service.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { birthFixture } from "./fixtures/palm-analysis.mjs";
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Next's bundler resolves these extensionless exports; direct Node handlers need
// its published .js entry and the actual Link component's CJS default.
const linkEntry = new URL("../node_modules/next/link.js", import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "next/server") return next("next/server.js", context);
  if (specifier === "next/link") return {
    shortCircuit: true,
    url: `data:text/javascript,${encodeURIComponent(`import link from ${JSON.stringify(linkEntry)}; export default link.default ?? link;`)}`,
  };
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const target = new URL(specifier, context.parentURL);
    for (const extension of [".ts", ".tsx"]) {
      if (existsSync(fileURLToPath(target) + extension)) return next(target.href + extension, context);
    }
  }
  return next(specifier, context);
} });

process.env.ANTHROPIC_API_KEY = "synthetic-test-key";
delete process.env.SAJU_EXTERNAL_MODEL_ENABLED;
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { getInterpretation } = await import("../src/lib/interpretation-engine.ts");
const { getFreeSajuReport } = await import("../src/lib/free-report-engine.ts");
const { getRealityAnswer } = await import("../src/lib/reality-answer-engine.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildMockInterpretation } = await import("../src/lib/interpretation-mock.ts");
const { isExternalInterpretationEnabled } = await import("../src/lib/external-interpretation-policy.ts");
const { POST: saju } = await import("../src/app/api/saju/route.ts");
const { POST: interpretation } = await import("../src/app/api/saju/interpret/route.ts");
const { POST: questionRoute } = await import("../src/app/api/reality-answer/route.ts");
const { POST: palm } = await import("../src/app/api/palm/interpret/route.ts");
const { POST: premium } = await import("../src/app/api/premium-report/route.ts");
const { BirthDateStep } = await import("../src/components/diagnosis/birth-date-step.tsx");
const { default: PrivacyPage } = await import("../src/app/privacy/page.tsx");

const facts = computeSajuFacts(birthFixture);
const rawQuestion = "요즘 회사가 답답한데 이직을 준비해야 할까요?";
const followUp = { question: "그럼 언제 움직이는 게 나을까요?", previousQuestion: rawQuestion, previousDomain: "career", focusHint: "work" };
const questionOptions = { focusHint: "work" };
const captured = [];
let invalid = false;
let questionDraft;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), "https://api.anthropic.com/v1/messages", "unexpected network target is blocked");
  assert.equal(init.headers["x-api-key"], "synthetic-test-key");
  const body = JSON.parse(init.body);
  captured.push(body.max_tokens);
  const content = invalid ? { broken: true }
    : body.max_tokens === 2048 ? buildFreeSajuReport(facts)
    : body.max_tokens === 1024 ? buildMockInterpretation(facts)
    : questionDraft;
  assert.ok(content, "question mock must be prepared from the existing validated fallback");
  return Response.json({ content: [{ type: "text", text: JSON.stringify(content) }] });
};
const post = async (handler, body) => {
  const response = await handler(new Request("http://localhost/test", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }));
  assert.equal(response.status, 200);
  return response.json();
};
try {
  for (const flag of [undefined, "false", "", "1", "TRUE", " true "]) {
    if (flag === undefined) delete process.env.SAJU_EXTERNAL_MODEL_ENABLED;
    else process.env.SAJU_EXTERNAL_MODEL_ENABLED = flag;
    assert.equal(isExternalInterpretationEnabled(), false);
    const [deep, free, answer] = await Promise.all([
      getInterpretation(facts), getFreeSajuReport(facts), getRealityAnswer(rawQuestion, facts, questionOptions),
    ]);
    assert.equal(deep.source, "mock");
    assert.equal(free.source, "mock");
    assert.deepEqual(free.report, buildFreeSajuReport(facts), "OFF retains the full reviewed deterministic report");
    assert.equal(answer.status, "ready");
    assert.equal(answer.source, "fallback");
    for (const item of [deep, free, answer]) assert.equal(item.fallbackReason, "external-model-disabled");
    questionDraft = answer.answer;
    assert.equal(captured.length, 0, "credential alone and nonliteral flags must never trigger fetch");
  }
  // A client cannot opt in through a request body. Exercise all API consumers.
  process.env.SAJU_EXTERNAL_MODEL_ENABLED = "false";
  const forged = { ...birthFixture, SAJU_EXTERNAL_MODEL_ENABLED: true };
  const offSaju = await post(saju, forged);
  assert.equal(offSaju.deep.source, "mock");
  assert.equal(offSaju.freeReport.source, "mock");
  assert.equal((await post(interpretation, forged)).source, "mock");
  assert.equal((await post(questionRoute, { ...forged, question: rawQuestion, focusHint: "work" })).source, "fallback");
  const offFollowUp = await post(questionRoute, { ...forged, ...followUp });
  assert.equal(offFollowUp.source, "fallback");
  assert.equal(offFollowUp.questionPlan.inheritedContext, true);
  assert.equal(captured.length, 0);
  console.log("PASS default/OFF with dummy key: zero fetches; full reviewed free copy and all API consumers preserved; request body cannot opt in");

  process.env.SAJU_EXTERNAL_MODEL_ENABLED = "true";
  assert.equal(isExternalInterpretationEnabled(), true);
  const onSaju = await post(saju, birthFixture);
  assert.equal(onSaju.deep.source, "llm");
  assert.equal(onSaju.freeReport.source, "llm");
  assert.deepEqual(captured, [1024, 2048], "the initial Saju path retains both existing calls only after explicit opt-in");
  assert.equal((await post(interpretation, birthFixture)).source, "llm");
  assert.equal((await post(questionRoute, { ...birthFixture, question: rawQuestion, focusHint: "work" })).source, "llm");
  assert.deepEqual(captured, [1024, 2048, 1024, 2200]);
  const onFollowUp = await post(questionRoute, { ...birthFixture, ...followUp });
  assert.equal(onFollowUp.status, "ready");
  assert.equal(onFollowUp.questionPlan.inheritedContext, true);
  assert.deepEqual(captured, [1024, 2048, 1024, 2200, 2200]);
  const callCount = captured.length;
  await post(palm, { ...birthFixture, palmFacts: null });
  const participation = await post(premium, { ...birthFixture, trialAction: "participate", participation: "clipboard" });
  await post(premium, { ...birthFixture, trialReceipt: participation.trialReceipt });
  assert.equal(captured.length, callCount, "palm and integrated annual paths stay internal even while opt-in is ON");
  console.log("PASS ON via fetch mock: initial/standalone/question handlers use existing model route; palm and annual routes stay internal");

  invalid = true;
  const rejected = await Promise.all([
    getInterpretation(facts), getFreeSajuReport(facts), getRealityAnswer(rawQuestion, facts, questionOptions),
  ]);
  assert.equal(rejected[0].source, "mock");
  assert.equal(rejected[1].source, "mock");
  assert.equal(rejected[2].source, "fallback");
  assert.ok(rejected.every(result => /validation-failed|schema-failed/.test(result.fallbackReason)));
  assert.deepEqual(rejected[1].report, buildFreeSajuReport(facts));
  process.env.ANTHROPIC_API_KEY = "";
  const callsBeforeMissingKey = captured.length;
  const noKey = await Promise.all([
    getInterpretation(facts), getFreeSajuReport(facts), getRealityAnswer(rawQuestion, facts, questionOptions),
  ]);
  assert.ok(noKey.every(result => result.fallbackReason === "no-api-key"));
  assert.equal(captured.length, callsBeforeMissingKey);
  console.log("PASS ON response rejection and missing key: existing quality checks/fallback retained, no extra call without key");

  const props = { value: "", gender: "남", consent: false, onChange() {}, onGenderChange() {}, onConsentChange() {}, onNext() {} };
  const notice = renderToStaticMarkup(createElement(BirthDateStep, props));
  assert.match(notice, /출생정보를 서버에서 계산하고 기기에 저장/);
  assert.match(notice, /이 탭에.*이 기기에 자동 저장/);
  assert.match(notice, /운영자가 외부 해석을 켜면.*MBTI·질문.*Anthropic/);
  assert.ok(notice.includes('href="/privacy"'));
  assert.match(notice, /<button[^>]*disabled[^>]*>다음/);
  assert.equal((notice.match(/<input\b/g) ?? []).length, 2, "no new personal input fields");
  const policy = renderToStaticMarkup(createElement(PrivacyPage));
  assert.match(policy, /내 출생정보\(생년월일·성별·입력한 출생시간\)/);
  assert.match(policy, /명시적으로 켠 경우에만 Anthropic/);
  assert.doesNotMatch(notice + policy, /SAJU_EXTERNAL_MODEL_ENABLED|synthetic-test-key/);
  console.log("PASS rendered consent/policy: automatic device storage and conditional processing visible, consent still required, no new input or technical flag exposed");
} finally {
  globalThis.fetch = originalFetch;
}
