// Local Chromium only; recognition, report responses and sharing are fixtures.
// All API calls and external network are intercepted. No model or message sent.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { palmFixture, birthFixture } from "./fixtures/palm-analysis.mjs";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href)) {
    const target = new URL(specifier + ".ts", context.parentURL);
    if (fs.existsSync(target)) return next(target.href, context);
  }
  return next(specifier, context);
} });
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildPremiumReport } = await import("../src/lib/premium-report.ts");
const facts = computeSajuFacts(birthFixture);
const freeReport = buildFreeSajuReport(facts, { mbti: null, check: null });
const report = buildPremiumReport({ facts, freeReport, referenceDate: new Date("2026-10-12T00:00:00Z") });
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3016";
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const events = [], errors = [], reportRequests = [];
let releaseReport;
await context.route("**/*", async route => {
  const url = new URL(route.request().url());
  if (url.origin !== BASE) return route.abort();
  if (url.pathname === "/api/analytics") {
    events.push(route.request().postDataJSON());
    return route.fulfill({ status: 204 });
  }
  if (url.pathname === "/api/palm/interpret") {
    reportRequests.push(route.request().postDataJSON());
    await new Promise(resolve => { releaseReport = resolve; });
    return route.fulfill({ json: { usable: true, palmSkipped: false, freeReport: { report: freeReport }, bilateralReading: null, verdict: null } });
  }
  if (url.pathname === "/api/premium-report") return route.fulfill({ json: { report } });
  if (url.pathname.startsWith("/api/")) throw new Error("UNEXPECTED_API:" + url.pathname);
  return route.continue();
});
await context.addInitScript(fixture => {
  window.Worker = class extends EventTarget {
    terminate() {}
    postMessage({ id }) { setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { id, facts: fixture } })), 10); }
  };
  Object.defineProperty(navigator, "share", { configurable: true, value: async () => { throw new DOMException("cancelled", "AbortError"); } });
  Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } });
}, palmFixture);
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on("pageerror", error => errors.push(error.message));
const names = () => events.map(event => event.event);
async function waitEvent(name) {
  for (let i = 0; i < 150 && !names().includes(name); i++) await page.waitForTimeout(100);
  assert.ok(names().includes(name), `missing ${name}: ${names().join(",")}`);
}
try {
  await page.goto(BASE);
  await waitEvent("landing_viewed");
  await page.goto(BASE + "/diagnosis/palm?" + new URLSearchParams(birthFixture));
  await page.getByRole("button", { name: "오른손", exact: true }).click();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    c.getContext("2d").fillRect(0, 0, 256, 256); return c.toDataURL().split(",")[1];
  });
  const file = { name: "synthetic.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") };
  await page.locator("input[type=file]").last().setInputFiles(file);
  await page.getByText("이제 왼손을 찍어주세요", { exact: true }).waitFor();
  assert.equal(reportRequests.length, 0);
  await page.locator("input[type=file]").last().setInputFiles(file);
  await page.getByRole("status").filter({ hasText: "서버 응답" }).waitFor();
  await waitEvent("reading_started");
  assert.ok(!names().includes("free_report_completed") && !names().includes("result_viewed"));
  assert.equal(reportRequests.length, 1);
  assert.equal(reportRequests[0].leftPalmFacts.handSide, "left");
  assert.equal(reportRequests[0].rightPalmFacts.handSide, "right");
  assert.ok(!JSON.stringify(reportRequests).includes("data:image"));
  releaseReport();
  await page.getByText("양손 분석 완료", { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitEvent("result_viewed");
  assert.ok(names().indexOf("reading_started") < names().indexOf("free_report_completed"));
  assert.ok(names().indexOf("free_report_completed") < names().indexOf("result_viewed"));
  assert.equal(new Set(events.filter(e => e.event === "reading_started").map(e => e.readingId)).size, 1);
  await page.getByRole("button", { name: "프리미엄 보기", exact: true }).click();
  await page.locator("section.mt-8").scrollIntoViewIfNeeded();
  await waitEvent("premium_report_viewed");
  assert.ok(!JSON.stringify(events).includes("1990") && !JSON.stringify(events).includes("data:image"));
  assert.ok(events.filter(e => e.event === "reading_started").every(e => e.path === "/diagnosis/palm"));
  assert.deepEqual(errors, []);
  const dir = process.env.TEST_EVIDENCE_DIR || "/tmp/saju-integration-evidence";
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + "/browser-analytics.json", JSON.stringify({ fixture: true, eventNames: names(), errors, reportRequests: reportRequests.length }, null, 2));
  console.log("PASS local Chromium: two hands -> completed -> visible result -> visible annual report; one reading; no images/birth data in telemetry.");
} finally { await browser.close(); }
