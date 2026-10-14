// Synthetic input, actual local APIs and customer DOM. No customer data or external calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { leftReadingFixture, rightReadingFixture } from "./fixtures/palm-reading.mjs";
import { palmFixture, birthFixture } from "./fixtures/palm-analysis.mjs";
import { palmEntry, PALM_ENTRY_KEY } from "./fixtures/palm-entry.mjs";
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3102";
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const out = process.env.TEST_EVIDENCE_DIR || "/tmp/saju-palm-customer";
fs.mkdirSync(out, { recursive: true });
const right = { ...structuredClone(palmFixture), handSide: "right" };
const left = { ...structuredClone(palmFixture), handSide: "left" };
const absent = { detected: false, length: null, curve: null, depthStrength: null, start: null, end: null, branchDetected: null };
const partial = { ...structuredClone(left), onnxLines: { ...left.onnxLines, headLine: absent, lifeLine: absent } };
const failed = { ...structuredClone(right), handShape: "unknown", onnxLines: null, imageQuality: "no_hand_detected", majorLines: [] };
async function api(l, r, primary = r) {
  const response = await fetch(BASE + "/api/palm/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...birthFixture, palmFacts: primary, leftPalmFacts: l, rightPalmFacts: r, dominantHand: "right" }) });
  assert.equal(response.status, 200); return response.json();
}
const normal = await api(left, right), partialOutput = await api(partial, right), saju = await api(null, null);
const measured = await api(leftReadingFixture, rightReadingFixture);
const rejected = await api({ ...failed, handSide: "left" }, failed);
assert.equal(rejected.usable, false); assert.equal(rejected.freeReport, undefined);
fs.writeFileSync(out + "/outputs.json", JSON.stringify({ synthetic: true, normal, measured, partial: partialOutput, rejected, saju }, null, 2));
const key = ["saju-app:reality-journey:v2", "overall", birthFixture.year, birthFixture.month, birthFixture.day, birthFixture.hour, birthFixture.minute, birthFixture.gender].join(":") + ":palm";
const state = (r, l, output) => ({ stage: "result", personalityKey: "null", palmFacts: r, rightPalmFacts: r, leftPalmFacts: l, dominantHand: "right", bilateralReading: output.bilateralReading, finalReport: output.freeReport.report, tripleCompare: output.tripleCompare, verdict: output.verdict });
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const captures = [], errors = [];
async function open(saved, report, mockFailure = false) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === BASE ? route.continue() : route.abort());
  await context.addInitScript(({ entryKey, entry, key, saved, report, birth, failed, mockFailure }) => {
    if (!sessionStorage.getItem("customer-test-seed")) {
      sessionStorage.setItem("customer-test-seed", "1"); sessionStorage.setItem(entryKey, entry);
      if (saved) sessionStorage.setItem(key, JSON.stringify(saved));
      if (report) sessionStorage.setItem("saju-app:integrated-premium:v1", JSON.stringify({ identity: JSON.stringify({ ...birth, mbti: null, leftPalmFacts: saved.leftPalmFacts, rightPalmFacts: saved.rightPalmFacts, dominantHand: "right" }), report }));
    }
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} }, configurable: true });
    if (mockFailure) window.Worker = class extends EventTarget {
      terminate() {}
      postMessage({ id }) { setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: window.__customerWorkerError ? { id, error: "Error Session mismatch left.headLine={}" } : { id, facts: failed } })), 10); }
    };
  }, { entryKey: PALM_ENTRY_KEY, entry: palmEntry(birthFixture), key, saved, report, birth: birthFixture, failed, mockFailure });
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on("pageerror", e => errors.push(e.message));
  await page.goto(BASE + "/diagnosis/palm"); return { context, page };
}
async function capture(s, name) {
  await s.page.evaluate(() => document.querySelectorAll("details").forEach(e => { e.open = true; }));
  const text = await s.page.locator("body").innerText();
  assert.doesNotMatch(text, /\bleft\b|\bright\b|\bError\b|sourceVariant|not_verified|segment_extrema|attributeSupport|pathCompleteness|[{}]|근거 연결 개정판|세션 저장소/, name);
  assert.doesNotMatch(text, /양손 분석 완료/, name);
  fs.writeFileSync(out + "/" + name + ".txt", text);
  await s.page.screenshot({ path: out + "/" + name + ".png" });
  captures.push({ name, characters: text.length, personalPalm: text.includes("새로운 일을 익힐 때"), premium: await s.page.locator("#premium-report").count() > 0 });
  return text;
}
try {
  let s = await open(state(normal.rightPalmFacts, normal.leftPalmFacts, normal), normal.annualReport);
  await s.page.getByText("양손에서 읽힌 손금 풀이", { exact: true }).waitFor();
  assert.equal(await s.page.locator("#premium-report").count(), 0);
  assert.match(await capture(s, "normal"), /새로운 일을 익힐 때/);
  assert.ok(await s.page.getByRole("button", { name: "링크 복사하고 무료 체험", exact: true }).isVisible());
  const entry = await capture(s, "premium-entry");
  assert.match(entry, /공유 이벤트 참여 후 무료/); assert.match(entry, /공유창의 정상 완료 또는 링크 복사 성공/); assert.match(entry, /12개월/);
  await s.page.getByRole("button", { name: "링크 복사하고 무료 체험", exact: true }).click(); await s.page.locator("#premium-report").waitFor();
  assert.match(await capture(s, "premium-expanded"), /왼손 두뇌선|이 달 천간/);
  const original = await s.page.evaluate(() => JSON.parse(sessionStorage.getItem("saju-app:integrated-premium:v1")).report);
  assert.equal(original.version, "year-connected-reading-2026-10-v13");
  assert.equal(normal.annualReport, undefined, "free combined API must not bundle trial content");
  await s.page.getByRole("button", { name: "프리미엄 접기", exact: true }).click();
  await s.page.getByRole("button", { name: "프리미엄 무료 체험 다시 보기", exact: true }).click();
  assert.deepEqual(await s.page.evaluate(() => JSON.parse(sessionStorage.getItem("saju-app:integrated-premium:v1")).report), original, "reopening preserves generated report exactly");
  await s.context.close();

  s = await open(state(measured.rightPalmFacts, measured.leftPalmFacts, measured), null);
  await s.page.getByText("양손에서 읽힌 손금 풀이", { exact: true }).waitFor();
  const rich = await capture(s, "measured-both-hands");
  assert.match(rich, /왼손 · 손 형태.*오른손 · 손 형태/s);
  assert.match(rich, /왼손 · 운명선 후보.*오른손 · 운명선 후보/s);
  assert.match(rich, /생활에서 지키고 싶은 리듬을.*함께하는 사람과 나누고 싶은 반응을/s);
  assert.equal(rich.split("태양선·재물선은 현재").length - 1, 1);
  assert.doesNotMatch(rich, /리듬를|반응를/);
  await s.page.getByRole("button", { name: "링크 복사하고 무료 체험", exact: true }).click();
  await s.page.locator("#premium-report").waitFor();
  await capture(s, "measured-premium"); await s.context.close();

  s = await open(state(partialOutput.rightPalmFacts, partialOutput.leftPalmFacts, partialOutput), partialOutput.annualReport);
  await s.page.getByText("양손에서 읽힌 손금 풀이", { exact: true }).waitFor();
  const p = await capture(s, "partial");
  assert.match(p, /왼손:.*두뇌선·생명선.*충분히/);
  assert.match(p, /선이 없다는 뜻은 아닙니다/); assert.match(p, /새로운 일을 익힐 때/);
  await s.context.close();

  s = await open(state(failed, { ...failed, handSide: "left" }, normal), null);
  await s.page.getByRole("alert").filter({ hasText: "저장된 사진에서" }).waitFor();
  const f = await capture(s, "all-failure-restored");
  assert.doesNotMatch(f, /사주와 손금을|양손에서 읽힌|새로운 일을 익힐 때|프리미엄 통합/);
  assert.ok(await s.page.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).isVisible());
  await s.context.close();

  s = await open({ stage: "upload", personalityKey: "null", palmFacts: right, rightPalmFacts: right, leftPalmFacts: null, captureHand: "left", dominantHand: "right" }, null, true);
  const png = await s.page.evaluate(() => { const c = document.createElement("canvas"); c.width = c.height = 128; return c.toDataURL().split(",")[1]; });
  const file = { name: "synthetic-non-palm.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
  await s.page.locator("input[type=file]").last().setInputFiles(file);
  await s.page.getByText("손금선이 충분히 읽히지 않았어요", { exact: true }).waitFor();
  await capture(s, "partial-photo-failure");
  assert.ok(await s.page.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).isVisible());
  await s.page.getByRole("button", { name: "왼손 다시 촬영하기", exact: true }).click();
  await s.page.locator("input[type=file]").last().setInputFiles(file);
  await s.page.getByText("손금선이 충분히 읽히지 않았어요", { exact: true }).waitFor();
  await s.page.getByRole("button", { name: "먼저 읽힌 오른손 풀이 보기", exact: true }).click();
  await s.page.getByText("읽힌 손에서 보는 나의 이야기", { exact: true }).waitFor();
  const one = await capture(s, "one-confirmed-hand");
  assert.match(one, /새로운 일을 익힐 때/); assert.doesNotMatch(one, /양손에서 읽힌 손금 풀이/);
  const stored = await s.page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key);
  assert.equal(stored.rightPalmFacts.onnxLines.modelExecuted, true); assert.equal(stored.leftPalmFacts, null);
  await s.page.getByRole("button", { name: "다른 손도 촬영해 함께 보기", exact: true }).click();
  await s.page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  await s.page.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).click();
  await s.page.getByText("먼저 사주와 입력한 정보로 풀이를 봅니다. 손금은 나중에 촬영해 추가할 수 있어요.", { exact: true }).waitFor();
  assert.equal((await s.page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), key)).rightPalmFacts.onnxLines.modelExecuted, true, "explicit Saju-first action preserves completed hand");
  await capture(s, "one-hand-saju-first"); await s.context.close();

  s = await open(null, null);
  let finish;
  await s.page.route("**/api/palm/interpret", route => new Promise(resolve => { finish = () => route.fulfill({ json: saju }).then(resolve); }));
  await s.page.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).click();
  await s.page.getByRole("status").filter({ hasText: "생년월일" }).waitFor();
  const waiting = await capture(s, "skip-waiting");
  assert.doesNotMatch(waiting, /02 · 양손 손금|양손과 사주|촬영 정보로|두 번째 분석|내 답을 함께|읽힌 손금과 사주/);
  await finish();
  await s.page.getByText("먼저 사주와 입력한 정보로 풀이를 봅니다. 손금은 나중에 촬영해 추가할 수 있어요.", { exact: true }).waitFor();
  const skipped = await capture(s, "skip");
  assert.doesNotMatch(skipped, /두 번째 분석|사주와 내 답을 함께|양손 분석/);
  assert.ok(await s.page.getByRole("button", { name: "손금 촬영해 추가하기", exact: true }).isVisible());
  await s.context.close();

  s = await open(null, null, true);
  await s.page.getByRole("button", { name: "오른손", exact: true }).click();
  await s.page.evaluate(() => { window.__customerWorkerError = true; });
  const errorPng = await s.page.evaluate(() => { const c = document.createElement("canvas"); c.width = c.height = 128; return c.toDataURL().split(",")[1]; });
  await s.page.locator("input[type=file]").last().setInputFiles({ name: "synthetic-error.png", mimeType: "image/png", buffer: Buffer.from(errorPng, "base64") });
  await s.page.getByRole("alert").filter({ hasText: "분석을 끝내지 못했어요" }).waitFor();
  await capture(s, "runtime-error");
  await s.context.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(out + "/summary.json", JSON.stringify({ synthetic: true, captures, errors, originalPhotoRecognition: "not covered" }, null, 2));
  console.log("PASS actual customer DOM/API: normal, partial, all failure, first-hand preservation, retry, Saju-first waiting/result, premium entry + expanded evidence; no diagnostic IDs; saved original intact");
} finally { await browser.close(); }
