// Run against local Next only. Lifecycle cases replace recognition with synthetic
// facts; the final real-worker case loads the actual MediaPipe/WASM assets.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";
import { palmFixture, birthFixture } from "./fixtures/palm-analysis.mjs";
import { PALM_ENTRY_KEY, palmEntry } from "./fixtures/palm-entry.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE), "local app only");
const evidence = process.env.TEST_EVIDENCE_DIR || "/tmp/wd-7k2n-evidence";
fs.mkdirSync(evidence, { recursive: true });
const payload = { ...birthFixture, palmFacts: palmFixture, leftPalmFacts: { ...palmFixture, handSide: "left" }, rightPalmFacts: palmFixture, dominantHand: "right" };
const response = await fetch(BASE + "/api/palm/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
assert.equal(response.status, 200);
const realResult = await response.json();
assert.equal(realResult.usable, true);
assert.ok(realResult.bilateralReading);
let mode = "normal";
let requestNumber = 0;
const requests = [];
const disconnected = [];
const delayed = [];
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") { res.end(); return; }
  const body = [];
  for await (const chunk of req) body.push(chunk);
  const item = { id: ++requestNumber, mode, body: JSON.parse(Buffer.concat(body).toString()) };
  requests.push(item);
  res.on("close", () => { if (!res.writableEnded) disconnected.push(item.id); });
  if (mode === "hang") return;
  if (mode === "body-hang") {
    res.writeHead(200, { "content-type": "application/json" });
    res.write('{"usable":true,');
    return;
  }
  const result = { ...realResult, annualReport: { ...realResult.annualReport, summary: `검증 결과 ${item.id}` } };
  if (mode === "delayed") { delayed.push(() => res.end(JSON.stringify(result))); return; }
  if (mode === "invalid") { res.end("not JSON"); return; }
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(result));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const stubUrl = `http://127.0.0.1:${server.address().port}/interpret`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const url = BASE + "/diagnosis/palm";
const errors = [];
const observations = [];
async function open(mock = true) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(({ key, entry }) => sessionStorage.setItem(key, entry), { key: PALM_ENTRY_KEY, entry: palmEntry(birthFixture) });
  if (mock) await context.addInitScript(({ fixture, stubUrl }) => {
    window.__palmTest = { mode: "normal", analyses: 0, terminated: 0, phases: [] };
    const originalFetch = window.fetch;
    window.fetch = (input, init) => originalFetch(typeof input === "string" && input === "/api/palm/interpret" ? stubUrl : input, init);
    // Every run has a separate event listener. Deliberately emit after terminate
    // to test cleanup as well as the task-generation guard.
    window.Worker = class extends EventTarget {
      terminate() { window.__palmTest.terminated++; }
      postMessage({ id }) {
        window.__palmTest.analyses++;
        this.dispatchEvent(new MessageEvent("message", { data: { id, phase: "lines" } }));
        if (window.__palmTest.mode === "hang") return;
        setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id, facts: fixture } })), window.__palmTest.mode === "delayed" ? 1800 : 10);
      }
    };
  }, { fixture: palmFixture, stubUrl });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", async m => {
    if (m.text().includes("[palm-analysis]")) observations.push({ text: m.text(), time: Date.now() });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "오른손", exact: true }).click();
  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#eeeeee"; ctx.fillRect(0, 0, 256, 256);
    return canvas.toDataURL().split(",")[1];
  });
  return { context, page, file: { name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") } };
}
async function hand(session) { await session.page.locator("input[type=file]").last().setInputFiles(session.file); }
async function twoHands(session) {
  const before = requests.length;
  await hand(session);
  await session.page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  assert.equal(requests.length, before, "must not request combined report after right hand only");
  await hand(session);
  for (let attempt = 0; attempt < 1000 && requests.length === before; attempt++) await delay(10);
  assert.equal(requests.length, before + 1);
}
async function result(session) {
  await session.page.getByText("양손 분석 완료", { exact: true }).waitFor({ timeout: 10000 });
  await session.page.getByRole("heading", { name: "프리미엄 통합 연간 리포트", exact: true }).waitFor();
  assert.equal(await session.page.getByRole("button", { name: "프리미엄 보기", exact: true }).count(), 0, "both hands open the full annual report without another request or purchase");
}
try {
  let s = await open();
  await twoHands(s); await result(s);
  const normalRequest = requests.at(-1);
  assert.equal(normalRequest.body.rightPalmFacts.handSide, "right");
  assert.equal(normalRequest.body.leftPalmFacts.handSide, "left");
  assert.equal(normalRequest.body.dominantHand, "right");
  assert.ok(!JSON.stringify(normalRequest.body).includes("data:image"));
  await s.page.screenshot({ path: evidence + "/palm-normal.png", fullPage: true });
  console.log("PASS right -> left -> combined real API response; only facts sent");
  await s.context.close();

  s = await open();
  await hand(s);
  await s.page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  await s.page.reload();
  await s.page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  await hand(s); await result(s);
  assert.equal(await s.page.evaluate(() => window.__palmTest.analyses), 1, "only left hand needs analysis after refresh");
  await s.context.close();
  console.log("PASS first completed hand survives reload; continue with left hand without recapturing right");

  s = await open();
  await hand(s);
  await s.page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  await s.page.locator('img[alt="오른손 촬영 완료"]').waitFor();
  await s.page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await s.page.locator('img[alt="오른손 촬영 완료"]').waitFor({ state: "detached" });
  await hand(s); await result(s);
  assert.equal(await s.page.evaluate(() => window.__palmTest.analyses), 2);
  await s.context.close();
  console.log("PASS simulated screen leave releases preview while completed right-hand facts still allow left-hand completion");

  // Full production deadline (30s), without a test-only timeout override.
  for (mode of (process.env.TEST_SKIP_DEADLINES ? [] : ["hang", "body-hang"])) {
    s = await open();
    const started = Date.now();
    await twoHands(s);
    const id = requests.at(-1)?.id;
    await s.page.getByRole("status").filter({ hasText: mode === "hang" ? "서버 응답" : "리포트 본문" }).waitFor();
    await s.page.getByRole("alert").filter({ hasText: "30초" }).waitFor({ timeout: 35000 });
    const elapsed = Date.now() - started;
    assert.ok(elapsed >= 29000 && elapsed < 35000, `deadline: ${elapsed}`);
    assert.ok(await s.page.getByText("오른손·왼손 분석이 보존되어 있어요.", { exact: false }).isVisible());
    assert.ok(disconnected.includes(id));
    const previousBody = requests.at(-1).body;
    mode = "normal";
    await s.page.getByRole("button", { name: "촬영 유지하고 리포트 다시 받기" }).click();
    await result(s);
    assert.deepEqual(requests.at(-1).body, previousBody);
    assert.equal(await s.page.evaluate(() => window.__palmTest.analyses), 2);
    console.log(`PASS deadline + network abort + both hands preserved on retry (${elapsed}ms)`);
    await s.context.close();
  }

  mode = "delayed"; s = await open(); await twoHands(s);
  await s.page.getByRole("status").filter({ hasText: "서버 응답" }).waitFor();
  await s.page.getByText(/이 단계 경과 [1-9]초/).waitFor();
  assert.ok(!(await s.page.locator("body").innerText()).includes("94%"));
  await s.page.screenshot({ path: evidence + "/palm-slow-request.png" });
  delayed.splice(0).forEach(send => send());
  await result(s);
  console.log("PASS slow response remains responsive, real waiting stage + elapsed time, then completes");
  await s.context.close();

  mode = "delayed"; s = await open(); await twoHands(s);
  await s.page.getByRole("status").filter({ hasText: "서버 응답" }).waitFor();
  const staleId = requests.at(-1).id;
  await s.page.getByRole("button", { name: "분석 취소", exact: true }).click();
  await s.page.getByRole("alert").filter({ hasText: "분석을 취소" }).waitFor();
  mode = "normal";
  await s.page.getByRole("button", { name: "촬영 유지하고 리포트 다시 받기" }).click(); await result(s);
  const latest = requests.at(-1).id;
  delayed.splice(0).forEach(send => send());
  await s.page.waitForTimeout(100);
  assert.equal(await s.page.getByText(`검증 결과 ${staleId}`, { exact: true }).count(), 0);
  assert.equal(await s.page.getByText(`검증 결과 ${latest}`, { exact: true }).count(), 1);
  console.log("PASS cancel + immediate retry + late report excluded");
  await s.context.close();

  mode = "normal"; s = await open();
  await s.page.evaluate(() => { window.__palmTest.mode = "delayed"; });
  await hand(s);
  await s.page.getByRole("button", { name: "분석 취소", exact: true }).click();
  await s.page.getByRole("alert").filter({ hasText: "분석을 취소" }).waitFor();
  await s.page.evaluate(() => { window.__palmTest.mode = "normal"; });
  await s.page.getByRole("button", { name: "같은 사진으로 분석 다시 시도" }).click();
  await s.page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  await s.page.waitForTimeout(1900);
  assert.equal(await s.page.getByText("이제 왼손을 찍어주세요", { exact: true }).count(), 1);
  assert.ok(await s.page.evaluate(() => window.__palmTest.terminated > 0));
  console.log("PASS local cancellation terminates worker + ignores late recognition + same photo retry");
  await s.context.close();

  mode = "normal"; s = await open();
  await s.page.clock.install();
  await hand(s);
  await s.page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  await s.page.evaluate(() => { window.__palmTest.mode = "hang"; });
  await hand(s);
  await s.page.getByRole("status").filter({ hasText: "기본 손금선" }).waitFor();
  await s.page.clock.fastForward(61_000);
  await s.page.getByRole("alert").filter({ hasText: "60초" }).waitFor();
  assert.ok(await s.page.evaluate(() => window.__palmTest.terminated > 0));
  await s.page.evaluate(() => { window.__palmTest.mode = "normal"; });
  await s.page.getByRole("button", { name: "같은 사진으로 분석 다시 시도" }).click();
  await result(s);
  assert.equal(await s.page.evaluate(() => window.__palmTest.analyses), 3);
  console.log("PASS local 60s timeout terminates worker, right hand preserved, left photo retry (browser virtual clock)");
  await s.context.close();

  mode = "body-hang"; s = await open(); await twoHands(s);
  await s.page.getByRole("status").filter({ hasText: "리포트 본문" }).waitFor();
  const leavingId = requests.at(-1).id;
  await s.page.getByRole("link", { name: "개인정보처리방침", exact: true }).click();
  await s.page.waitForURL(BASE + "/privacy");
  await s.page.waitForTimeout(100);
  assert.ok(disconnected.includes(leavingId));
  const saved = await s.page.evaluate(() => Object.entries(sessionStorage).filter(([key]) => key.endsWith(":palm")));
  assert.equal(saved.length, 1);
  assert.equal(JSON.parse(saved[0][1]).stage, "error");
  assert.ok(!saved[0][1].includes("data:image"));
  mode = "normal";
  await s.page.goBack();
  await s.page.getByRole("button", { name: "촬영 유지하고 리포트 다시 받기" }).click();
  await result(s);
  assert.equal(await s.page.evaluate(() => window.__palmTest.analyses), 2);
  console.log("PASS SPA navigation aborts stream, only completed facts persist, back + retry without recapture");
  await s.context.close();

  mode = "body-hang"; s = await open(); await twoHands(s);
  await s.page.getByRole("status").filter({ hasText: "리포트 본문" }).waitFor();
  await s.page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await s.page.getByRole("alert").filter({ hasText: "화면을 떠나" }).waitFor();
  mode = "normal";
  await s.page.getByRole("button", { name: "촬영 유지하고 리포트 다시 받기" }).click();
  await result(s);
  assert.equal(await s.page.evaluate(() => window.__palmTest.analyses), 2);
  console.log("PASS pagehide/pageshow restoration exposes preserved-hands retry (simulated BFCache events)");
  await s.context.close();

  // Negative real recognition, not mocked: proves classic worker + MediaPipe load
  // and existing rejection criteria work. Does not establish real-device accuracy.
  mode = "normal"; s = await open(false);
  await hand(s);
  await s.page.getByText("손금선이 충분히 읽히지 않았어요", { exact: true }).waitFor({ timeout: 65000 });
  await s.page.screenshot({ path: evidence + "/palm-real-worker-rejection.png", fullPage: true });
  console.log("PASS real MediaPipe worker rejects blank photo");
  await s.context.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(evidence + "/palm-browser.json", JSON.stringify({ requests: requests.map(({ id, mode }) => ({ id, mode })), disconnected, observations, errors }, null, 2));
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
