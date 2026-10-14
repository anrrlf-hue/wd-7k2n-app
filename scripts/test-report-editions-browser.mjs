// Local-only synthetic inputs. No model, authentication, analytics or image calls.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import ts from "typescript";
import { birthFixture } from "./fixtures/palm-analysis.mjs";
import { PALM_ENTRY_KEY, palmEntry } from "./fixtures/palm-entry.mjs";
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { enrichSajuFacts } = await import("../src/lib/oh-my-saju-adapter.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const previousRevision = process.env.TEST_PREVIOUS_REPORT_REV || "f0757a3";
assert.ok(["f0757a3", "ae7e854"].includes(previousRevision));
const source = execFileSync("git", ["show", `${previousRevision}:src/lib/premium-report.ts`], { encoding: "utf8" });
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { buildPremiumReport: oldPremium } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const facts = enrichSajuFacts(computeSajuFacts(birthFixture), birthFixture);
const legacy = oldPremium({ facts, freeReport: buildFreeSajuReport(facts, { mbti: null, check: null }), referenceDate: new Date("2025-10-13T00:00:00Z") });
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3027";
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const evidence = process.env.TEST_EVIDENCE_DIR || "/tmp/saju-report-polish";
fs.mkdirSync(evidence, { recursive: true });
async function api(path, body) {
  const response = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  assert.equal(response.status, 200); return response.json();
}
const free = await api("/api/palm/interpret", { ...birthFixture, palmFacts: null });
const { trialReceipt } = await api("/api/premium-report", { ...birthFixture, trialAction: "participate", participation: "clipboard" });
const current = await api("/api/premium-report", { ...birthFixture, trialReceipt });
const KEY = "saju-app:integrated-premium:v1";
const body = JSON.stringify({ ...birthFixture, mbti: null, leftPalmFacts: null, rightPalmFacts: null, dominantHand: null });
const palmKey = ["saju-app:reality-journey:v2", "overall", birthFixture.year, birthFixture.month, birthFixture.day, birthFixture.hour, birthFixture.minute, birthFixture.gender, "palm"].join(":");
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const requests = [], unexpected = [], errors = [];
let mode = "failure", held;
let heldReady;
const waitForHeld = new Promise(resolve => { heldReady = resolve; });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== BASE) return route.abort();
    if (url.pathname === "/api/premium-report") {
      if (route.request().postDataJSON()?.trialAction === "verify") return route.fulfill({ json: { eligible: true } });
      requests.push({ mode, body: route.request().postData() });
      if (mode === "hold") { held = route; heldReady(); return; }
      return route.fulfill(mode === "failure" ? { status: 500, json: { error: "검증용 일시 오류" } } : { json: current });
    }
    if (url.pathname.startsWith("/api/")) { unexpected.push(url.pathname); return route.abort(); }
    return route.continue();
  });
  await context.addInitScript(({ KEY, body, legacy, palmKey, free, palmEntryKey, entry, trialReceipt }) => {
    if (!sessionStorage.getItem(palmEntryKey)) sessionStorage.setItem(palmEntryKey, entry);
    if (sessionStorage.getItem("edition-test-seeded")) return;
    sessionStorage.setItem("edition-test-seeded", "1");
    sessionStorage.setItem("saju-app:premium-trial:v1", JSON.stringify({ identity: body, receipt: trialReceipt }));
    sessionStorage.setItem(KEY, JSON.stringify({ identity: `2025년 10월:${body}`, report: legacy }));
    sessionStorage.setItem(palmKey, JSON.stringify({ stage: "saju_only", palmFacts: null, leftPalmFacts: null, rightPalmFacts: null, dominantHand: null, finalReport: free.freeReport.report, tripleCompare: [], personalityKey: "null" }));
  }, { KEY, body, legacy, palmKey, free, palmEntryKey: PALM_ENTRY_KEY, entry: palmEntry(birthFixture), trialReceipt });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on("pageerror", e => errors.push(e.message));
  const saved = () => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), KEY);
  const url = BASE + "/diagnosis/palm";
  const revealEditions = async () => {
    await page.waitForFunction(() => document.querySelector("#premium-report")
      || Array.from(document.querySelectorAll("button")).some(button => button.textContent?.trim() === "프리미엄 무료 체험 다시 보기"));
    const ready = page.getByRole("button", { name: "프리미엄 무료 체험 다시 보기", exact: true });
    if (await ready.isVisible()) await ready.click();
    const summary = page.getByText("저장해둔 풀이 다시 보기", { exact: true });
    await summary.waitFor();
    if (!(await summary.evaluate(el => el.parentElement.open))) await summary.click();
  };
  await page.goto(url);
  const upgrade = () => page.getByRole("button", { name: "새 풀이판으로 리포트 만들기", exact: true });
  await revealEditions();
  await upgrade().waitFor();
  assert.deepEqual((await saved()).report, legacy);
  assert.ok((await page.locator("#premium-report").innerText()).includes(legacy.overall?.paragraphs[0] ?? legacy.corePatterns[0]));
  await page.reload(); await revealEditions(); await upgrade().waitFor();
  assert.deepEqual((await saved()).report, legacy);
  assert.equal(requests.length, 0, "even an older reference month never silently regenerates");
  await upgrade().click();
  await page.getByRole("alert").filter({ hasText: "리포트를 불러오지 못했어요" }).waitFor();
  assert.deepEqual((await saved()).report, legacy, "failed update cannot replace saved text");
  mode = "normal";
  await page.getByRole("button", { name: "새 리포트 다시 요청", exact: true }).click();
  await revealEditions();
  await page.getByText("지금 보고 있는 풀이", { exact: true }).waitFor();
  assert.equal(requests.length, 2, "retry after failed explicit update actually requests the new edition");
  assert.deepEqual((await saved()).report, current.report);
  assert.deepEqual((await saved()).previousReport, legacy);
  assert.deepEqual(requests.map(r => JSON.parse(r.body)), [{ ...JSON.parse(body), trialReceipt }, { ...JSON.parse(body), trialReceipt }]);
  await page.getByRole("button", { name: "다른 저장본 보기", exact: true }).click();
  await upgrade().waitFor();
  await page.reload(); await revealEditions(); await upgrade().waitFor();
  assert.deepEqual((await saved()).report, legacy);
  mode = "hold"; await upgrade().click();
  await page.getByRole("status").filter({ hasText: "깊은풀이를 준비" }).waitFor();
  await waitForHeld;
  await page.getByRole("button", { name: "리포트 요청 취소", exact: true }).click();
  await page.getByRole("button", { name: "프리미엄 무료 체험 다시 보기", exact: true }).click();
  await revealEditions();
  await upgrade().waitFor();
  assert.deepEqual((await saved()).report, legacy);
  if (held) await held.fulfill({ json: current }).catch(() => {});
  await page.getByRole("button", { name: "다른 저장본 보기", exact: true }).click();
  await revealEditions();
  await page.getByText("지금 보고 있는 풀이", { exact: true }).waitFor();
  await page.reload(); await revealEditions(); await page.getByText("지금 보고 있는 풀이", { exact: true }).waitFor();
  assert.deepEqual((await saved()).report, current.report);
  assert.equal(requests.length, 3);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [selector, name] of [["#premium-overall", "overall"], ["#premium-domain-money", "money"], ["#premium-annual", "annual"]]) {
      await page.locator(selector).evaluate(el => el.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: `${evidence}/narrative-${name}-${width}.png` });
    }
    await page.getByText("12개월 전체 흐름 펼쳐보기", { exact: true }).evaluate(el => el.parentElement.open = true);
    const first = page.locator('[aria-label="12개월 흐름"] > li').first();
    await first.locator("details").evaluate(el => el.open = true);
    await first.evaluate(el => el.scrollIntoView({ block: "start" }));
    await page.screenshot({ path: `${evidence}/narrative-period-reason-${width}.png` });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  }
  await page.evaluate(({ key, entry }) => sessionStorage.setItem(key, entry), { key: PALM_ENTRY_KEY, entry: palmEntry({ ...birthFixture, day: 16 }) });
  await page.goto(url);
  await page.getByRole("button", { name: "손금은 나중에 추가하고, 먼저 사주 결과 보기", exact: true }).waitFor();
  assert.equal(await page.locator("#premium-report").count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  fs.writeFileSync(`${evidence}/report-editions-browser-${previousRevision}.json`, JSON.stringify({ synthetic: true, previousRevision, restoredLegacyWithoutRequest: true, explicitUpgradeFailureRetry: true, canceledUpgradePreservesOriginal: true, bothSnapshotsSurviveReload: true, originalPeriod: legacy.annual.startLabel, currentPeriod: current.report.annual.startLabel, requests: requests.map(r => r.mode), errors, unexpected }, null, 2));
  console.log("PASS old-period/old-edition exact restore, explicit upgrade failure/retry/cancel, both snapshots selectable across reload, other birth isolated, mobile/desktop narrative and reasons, no unrelated API calls");
} finally { await browser.close(); }
