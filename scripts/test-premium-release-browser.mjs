// Local browser integration: actual deterministic API responses + controlled
// slow streams. Recognition is not exercised here. No external/model calls.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { birthFixture } from "./fixtures/palm-analysis.mjs";
import { PALM_ENTRY_KEY, palmEntry } from "./fixtures/palm-entry.mjs";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3027";
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const evidence = process.env.TEST_EVIDENCE_DIR || "/tmp/saju-report-polish";
fs.mkdirSync(evidence, { recursive: true });
async function api(path, body) {
  const response = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(response.status, 200);
  return response.json();
}
const free = await api("/api/palm/interpret", { ...birthFixture, palmFacts: null });
const inputBody = { ...birthFixture, mbti: null, leftPalmFacts: null, rightPalmFacts: null, dominantHand: null };
const { trialReceipt } = await api("/api/premium-report", { ...inputBody, trialAction: "participate", participation: "clipboard" });
const premium = await api("/api/premium-report", { ...inputBody, trialReceipt });
let mode = "normal", number = 0;
const requests = [], disconnected = [], delayed = [];
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.end();
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const rawBody = JSON.parse(Buffer.concat(chunks).toString());
  if (rawBody.trialAction === "verify") { res.setHeader("content-type", "application/json"); return res.end(JSON.stringify({ eligible: true })); }
  assert.equal(rawBody.trialReceipt, trialReceipt, "each generation retains scope-bound eligibility");
  const request = { id: ++number, mode, body: rawBody };
  requests.push(request);
  res.on("close", () => { if (!res.writableEnded) disconnected.push(request.id); });
  const response = { report: { ...premium.report, summary: request.mode === "delayed" ? `${premium.report.summary} 검증 응답 ${request.id}` : premium.report.summary } };
  if (mode === "hang") return;
  if (mode === "body-hang") { res.writeHead(200, { "content-type": "application/json" }); res.write('{"report":'); return; }
  if (mode === "delayed") { delayed.push(() => res.end(JSON.stringify(response))); return; }
  if (mode === "invalid") return res.end("broken JSON");
  if (mode === "invalid-shape") return res.end(JSON.stringify({ report: { ...premium.report, annual: null } }));
  res.setHeader("content-type", "application/json"); res.end(JSON.stringify(response));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const stubUrl = `http://127.0.0.1:${server.address().port}/premium`;
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const errors = [], unexpected = [];
const url = BASE + "/diagnosis/palm";
async function open({ blockedStorage = false, width = 390 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.route("**/*", route => {
    const u = new URL(route.request().url());
    if (u.origin === new URL(stubUrl).origin) return route.continue();
    if (u.origin !== BASE) return route.abort();
    if (u.pathname === "/api/palm/interpret") return route.fulfill({ json: free });
    if (u.pathname.startsWith("/api/")) { unexpected.push(u.pathname); return route.abort(); }
    return route.continue();
  });
  await context.addInitScript(({ stubUrl, palmEntryKey, entry, inputBody, trialReceipt }) => {
    if (!sessionStorage.getItem(palmEntryKey)) sessionStorage.setItem(palmEntryKey, entry);
    sessionStorage.setItem("saju-app:premium-trial:v1", JSON.stringify({ identity: JSON.stringify(inputBody), receipt: trialReceipt }));
    const original = window.fetch;
    window.fetch = (input, init) => original(input === "/api/premium-report" ? stubUrl : input, init);
  }, { stubUrl, palmEntryKey: PALM_ENTRY_KEY, entry: palmEntry(birthFixture), inputBody, trialReceipt });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "warning" && m.text().includes("[premium-report]")) fs.appendFileSync(`${evidence}/request-errors.txt`, m.text() + "\n"); });
  await page.goto(url);
  assert.equal(await page.getByRole("region", { name: "무료 사주 링크 공유" }).count(), 0);
  await page.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).click();
  try { await page.getByRole("button", { name: "프리미엄 무료 체험 보기", exact: true }).waitFor(); }
  catch (error) { fs.writeFileSync(`${evidence}/premium-entry-failure.txt`, JSON.stringify({ body: await page.locator("body").innerText(), errors, unexpected }, null, 2)); throw error; }
  if (blockedStorage) await page.evaluate(() => {
    for (const key of ["getItem", "setItem"]) Object.defineProperty(Storage.prototype, key, { value: () => { throw new DOMException("blocked", "SecurityError"); } });
  });
  return { context, page };
}
async function start(s) { await s.page.getByRole("button", { name: "프리미엄 무료 체험 보기", exact: true }).click(); }
async function result(s) { await s.page.getByRole("heading", { name: "프리미엄 통합 연간 리포트", exact: true }).waitFor(); }
try {
  for (const width of [390, 1440]) {
    mode = "normal"; const s = await open({ width }); await start(s); await result(s);
    const p = s.page;
    assert.equal(await p.locator('[aria-label="12개월 흐름"] > li').count(), premium.report.periods.length);
    assert.deepEqual(premium.report.periods.flatMap(period => period.months), premium.report.annual.months.map(month => month.label));
    assert.equal(await p.locator("#premium-report input").count(), 0);
    const body = await p.locator("body").innerText();
    assert.doesNotMatch(body, /2주|분야 선택|유파마다|과거는 제외/);
    assert.doesNotMatch(await p.locator("#premium-report").innerText(), /확정된 미래|반드시 수입이 늘|질병을 예측/);
    assert.ok((await p.locator("#premium-annual").innerText()).includes("세운"));
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    const shareAfter = await p.evaluate(() => !!(document.querySelector('#premium-report').compareDocumentPosition(document.querySelector('[aria-label="무료 사주 링크 공유"]')) & Node.DOCUMENT_POSITION_FOLLOWING));
    assert.equal(shareAfter, true);
    await p.locator("#premium-report").scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${evidence}/premium-integrated-${width}.png`, fullPage: true });
    for (const [section, name] of [["#premium-report h2", "overview"], ["#premium-domain-money", "money"], ["#premium-annual", "annual"]]) {
      await p.locator(section).evaluate(el => el.scrollIntoView({ block: "start" }));
      await p.screenshot({ path: `${evidence}/premium-${name}-${width}.png` });
    }
    const count = requests.length;
    await p.getByRole("button", { name: "프리미엄 접기", exact: true }).click();
    await p.getByRole("button", { name: "프리미엄 무료 체험 다시 보기", exact: true }).click(); await result(s);
    await p.reload(); await p.getByRole("button", { name: "프리미엄 무료 체험 다시 보기", exact: true }).click(); await result(s);
    assert.equal(requests.length, count, "reopen/reload must not regenerate same input and month");
    // A different person's input must not restore the previous report.
    await p.evaluate(({ key, entry }) => sessionStorage.setItem(key, entry), { key: PALM_ENTRY_KEY, entry: palmEntry({ ...birthFixture, day: 16 }) });
    await p.goto(url);
    await p.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).click();
    assert.equal(await p.locator("#premium-report").count(), 0);
    await s.context.close();
  }
  console.log("PASS integrated desktop/mobile: all fields + 12 months, share after result, no selection/payment, reopen/reload without requests, other birth isolated");

  mode = "delayed"; let s = await open(); await start(s);
  await s.page.getByRole("status").filter({ hasText: "깊은풀이를 준비" }).waitFor();
  assert.equal(await s.page.getByRole("region", { name: "무료 사주 링크 공유" }).count(), 0);
  const stale = requests.at(-1).id;
  await s.page.getByRole("button", { name: "리포트 요청 취소", exact: true }).click();
  mode = "normal"; await start(s); await result(s);
  delayed.splice(0).forEach(send => send());
  assert.ok(!(await s.page.locator("#premium-report").innerText()).includes(`검증 응답 ${stale}`));
  assert.deepEqual(requests.at(-1).body, requests.at(-2).body);
  await s.context.close();
  console.log("PASS premium cancel/retry: identical input, stale response excluded");

  for (mode of ["hang", "body-hang"]) {
    s = await open(); await s.page.clock.install(); await start(s);
    await s.page.getByRole("status").filter({ hasText: mode === "hang" ? "깊은풀이를 준비" : "깊은풀이를 받고" }).waitFor();
    const id = requests.at(-1).id;
    await s.page.clock.fastForward(31_000);
    try { await s.page.getByRole("alert").filter({ hasText: "30초" }).waitFor(); } catch (e) { fs.writeFileSync(`${evidence}/deadline-failure.txt`, await s.page.locator("body").innerText()); throw e; }
    const timeoutText = await s.page.getByRole("alert").filter({ hasText: "30초" }).innerText();
    assert.match(timeoutText, /입력한 생년월일은 유지/);
    assert.doesNotMatch(timeoutText, /완료된 손 분석|Error|left|right/);
    assert.equal(await s.page.locator("#premium-report").count(), 0, "timed-out response cannot render a partial report");
    assert.equal(await s.page.evaluate(() => sessionStorage.getItem("saju-app:integrated-premium:v1")), null, "timed-out response cannot replace the saved result");
    await s.page.screenshot({ path: `${evidence}/premium-${mode}-timeout.png` });
    await s.page.waitForTimeout(100);
    assert.ok(disconnected.includes(id));
    const input = requests.at(-1).body;
    mode = "normal"; await start(s); await result(s);
    assert.deepEqual(requests.at(-1).body, input);
    await s.context.close();
  }
  console.log("PASS premium header/body deadlines + stream abort + input preserved (virtual clock)");

  mode = "body-hang"; s = await open(); await start(s);
  await s.page.getByRole("status").filter({ hasText: "깊은풀이를 받고" }).waitFor();
  const leaving = requests.at(-1).id;
  await s.page.getByRole("link", { name: "개인정보처리방침", exact: true }).click();
  await s.page.waitForURL(BASE + "/privacy");
  await s.page.waitForTimeout(100);
  assert.ok(disconnected.includes(leaving));
  assert.equal(await s.page.evaluate(() => sessionStorage.getItem("saju-app:integrated-premium:v1")), null);
  await s.page.goBack();
  mode = "normal"; await start(s); await result(s);
  await s.context.close();
  console.log("PASS premium navigation abort, no stale cache, back retry");

  mode = "body-hang"; s = await open(); await start(s);
  await s.page.getByRole("status").filter({ hasText: "깊은풀이를 받고" }).waitFor();
  await s.page.evaluate(() => { dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true })); dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); });
  await s.page.getByRole("alert").filter({ hasText: "화면을 떠나" }).waitFor();
  mode = "normal"; await start(s); await result(s); await s.context.close();
  console.log("PASS premium pagehide/pageshow recovery (simulated BFCache)");

  mode = "invalid-shape"; s = await open(); await start(s);
  await s.page.getByRole("alert").filter({ hasText: "리포트를 불러오지 못했어요" }).waitFor();
  assert.equal(await s.page.locator("#premium-report").count(), 0);
  assert.equal(await s.page.evaluate(() => sessionStorage.getItem("saju-app:integrated-premium:v1")), null);
  mode = "normal"; await start(s); await result(s); await s.context.close();
  console.log("PASS incomplete report rejected before render/cache, input retained for retry");

  mode = "invalid"; s = await open({ blockedStorage: true }); await start(s);
  await s.page.getByRole("alert").filter({ hasText: "리포트를 불러오지 못했어요" }).waitFor();
  assert.equal(await s.page.locator("#premium-report").count(), 0);
  assert.doesNotMatch(await s.page.getByRole("alert").filter({ hasText: "리포트를 불러오지 못했어요" }).innerText(), /Error|SyntaxError|JSON/);
  mode = "normal"; await start(s); await result(s); await s.context.close();
  console.log("PASS malformed response retry and unavailable browser storage");
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, [], "analytics must remain off; no other API calls");
  fs.writeFileSync(evidence + "/premium-integrated-browser.json", JSON.stringify({ fixture: true, cases: 10, requests: requests.map(({id, mode}) => ({id, mode})), disconnected, errors, unexpected }, null, 2));
} finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
