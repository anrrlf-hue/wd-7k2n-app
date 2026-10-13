import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire, registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href)) {
    const target = new URL(specifier + ".ts", context.parentURL);
    if (fs.existsSync(target)) return next(target.href, context);
  }
  return next(specifier, context);
} });
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const { buildServiceShare, FREE_SHARE_ENTRY_PATH } = await import("../src/lib/relationship-share.ts");
const { diagnoseSaju } = await import("../src/lib/saju.ts");
const { computeSajuFacts } = await import("../src/lib/saju-facts.ts");
const { buildFreeSajuReport } = await import("../src/lib/free-report-mock.ts");
const { buildMyeongsikView } = await import("../src/lib/myeongsik-view.ts");
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
assert.ok(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE) || (process.env.ALLOW_PUBLIC_SMOKE === "1" && BASE === "https://saju-app-rouge.vercel.app"), "known local app or explicitly enabled official service only");
const evidence = process.env.TEST_EVIDENCE_DIR || "/tmp/wd-7k2n-evidence";
fs.mkdirSync(evidence, { recursive: true });
const shared = buildServiceShare();
const birth = { year: 1988, month: 12, day: 2, hour: null, minute: null, gender: "여" };
const facts = computeSajuFacts(birth);
const diagnosis = {
  ...diagnoseSaju(birth), focus: "overall", birthInput: birth, resultSource: "fallback", deep: null,
  freeReport: { source: "mock", report: buildFreeSajuReport(facts, { mbti: null, check: null }) },
  focusedReport: null, personalityInput: null, daeunAnalysis: null, lifetimeStory: null,
  myeongsik: buildMyeongsikView(facts), wealthType: null,
};
const saved = { focus: "overall", birthDate: "1988-12-02", gender: "여", knowsTime: false, birthTime: "", mbti: "모름", diagnosis };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const pageErrors = [];
const network = [];
async function open({ native = "resolve", copy = "resolve", seed = true, mobile = true, storageBlocked = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }, isMobile: mobile, hasTouch: mobile });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== BASE) return route.abort();
    if (url.pathname.startsWith("/api/")) {
      network.push({ path: url.pathname, body: route.request().postData() });
      // These UI tests never need models, analytics writes, customer data or messages.
      return route.fulfill({ status: url.pathname === "/api/analytics" ? 204 : 409, body: "" });
    }
    return route.continue();
  });
  await context.addInitScript(({ native, copy, seed, saved, storageBlocked }) => {
    window.__serviceShareTest = { native, copy, payloads: [], copies: [] };
    if (seed) sessionStorage.setItem("saju-app:diagnosis-session:v3", JSON.stringify(saved));
    if (storageBlocked) Object.defineProperty(Storage.prototype, "getItem", { value: () => { throw new DOMException("blocked", "SecurityError"); } });
    Object.defineProperty(navigator, "share", { configurable: true, value: native === "unsupported" ? undefined : async data => {
      const test = window.__serviceShareTest;
      test.payloads.push(data);
      if (test.native === "cancel") throw new DOMException("cancelled", "AbortError");
      if (test.native === "reject") throw new DOMException("blocked", "NotAllowedError");
      if (test.native === "pending") await new Promise(resolve => { test.finish = resolve; });
    } });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => native !== "cannot_share" });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: copy === "unsupported" ? undefined : { writeText: async text => {
      if (window.__serviceShareTest.copy === "reject") throw new DOMException("denied", "NotAllowedError");
      window.__serviceShareTest.copies.push(text);
    } } });
  }, { native, copy, seed, saved, storageBlocked });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => pageErrors.push(error.message));
  return { context, page };
}
async function result(session) {
  await session.page.goto(BASE + "/diagnosis?mode=free", { waitUntil: "domcontentloaded", timeout: 30000 });
  const card = session.page.getByRole("region", { name: "무료 사주 링크 공유" });
  await session.page.getByRole("button", { name: "손금 없이 결과 마무리하기", exact: true }).waitFor();
  assert.equal(await card.count(), 0, "sharing must not precede the palm decision");
  await session.page.getByRole("button", { name: "손금 없이 결과 마무리하기", exact: true }).click();
  await card.waitFor();
  assert.equal(await card.getByLabel("공유할 주소").inputValue(), shared.url);
  assert.ok(await session.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no horizontal overflow");
  return card;
}
try {
  for (const native of ["resolve", "cancel", "reject", "pending"]) {
    const s = await open({ native });
    const card = await result(s);
    await card.getByRole("button", { name: "공유하기", exact: true }).click();
    if (native === "pending") {
      assert.equal(await card.getByRole("button", { name: "링크 복사", exact: true }).isDisabled(), true);
      await s.page.evaluate(() => window.__serviceShareTest.finish());
    }
    await card.getByRole(native === "reject" ? "alert" : "status").waitFor();
    const test = await s.page.evaluate(() => window.__serviceShareTest);
    assert.deepEqual(test.payloads, [shared]);
    assert.deepEqual(test.copies, [], "cancellation/error must not silently copy anything");
    const text = await card.innerText();
    assert.ok(!text.includes("공유 성공") && !text.includes("카카오톡으로 보내기"));
    assert.ok(text.includes(native === "cancel" ? "공유를 취소" : native === "reject" ? "공유창을 열지 못했어요" : "실제 전달 여부는 선택한 앱에서 확인"));
    assert.equal(await card.getByRole("button", { name: "링크 복사", exact: true }).isEnabled(), true);
    if (native === "resolve") await card.screenshot({ path: evidence + "/service-share-mobile.png" });
    await s.context.close();
    console.log(`PASS native ${native}: exact generic payload, no false delivery or silent copy`);
  }
  for (const copy of ["resolve", "reject", "unsupported"]) {
    const s = await open({ native: "unsupported", copy, mobile: copy !== "resolve" });
    const card = await result(s);
    assert.equal(await card.getByRole("button", { name: "공유하기", exact: true }).count(), 0);
    await card.getByRole("button", { name: "링크 복사", exact: true }).click();
    await card.getByRole(copy === "resolve" ? "status" : "alert").waitFor();
    const test = await s.page.evaluate(() => window.__serviceShareTest);
    assert.deepEqual(test.copies, copy === "resolve" ? [shared.url] : []);
    if (copy !== "resolve") {
      const selected = await card.getByLabel("공유할 주소").evaluate(input => input.value.slice(input.selectionStart, input.selectionEnd));
      assert.equal(selected, shared.url, "manual copy fallback selects complete URL");
    }
    await s.context.close();
    console.log(`PASS clipboard ${copy}: truthful outcome and manual fallback`);
  }
  const cannot = await open({ native: "cannot_share" });
  assert.equal(await (await result(cannot)).getByRole("button", { name: "공유하기", exact: true }).count(), 0);
  await cannot.context.close();
  for (const options of [{ seed: false }, { seed: true }, { seed: false, storageBlocked: true }]) {
    const s = await open(options);
    await s.page.goto(BASE + FREE_SHARE_ENTRY_PATH, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.page.getByLabel("생년월일", { exact: true }).waitFor();
    assert.equal(await s.page.getByLabel("생년월일", { exact: true }).inputValue(), "");
    assert.equal(await s.page.getByRole("checkbox").isChecked(), false);
    assert.equal(new URL(s.page.url()).hash, "");
    if (options.seed) assert.equal(await s.page.evaluate(() => sessionStorage.getItem("saju-app:diagnosis-session:v3")), JSON.stringify(saved), "saved result is preserved but not restored at invitation entry");
    await s.context.close();
  }
  console.log("PASS recipient free entry: fresh/existing/blocked storage, no restored personal result or model call");
  for (const token of [Buffer.from(JSON.stringify({ v: 1, shareId: "old", headline: "PRIVATE_REPORT", meName: "PRIVATE_NAME", followUps: [] })).toString("base64url"), "%E0%A4%A"]) {
    const s = await open();
    await s.page.goto(BASE + "/share/relationship#r=" + token, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.page.waitForURL(BASE + FREE_SHARE_ENTRY_PATH);
    await s.page.getByLabel("생년월일", { exact: true }).waitFor();
    assert.equal(new URL(s.page.url()).hash, "");
    assert.ok(!(await s.page.locator("body").innerText()).includes("PRIVATE_REPORT"));
    await s.context.close();
  }
  assert.deepEqual(pageErrors, []);
  assert.ok(network.every(request => request.path === "/api/analytics"), "no model/API generation called");
  assert.ok(!JSON.stringify(network).includes("relationship_share_created"));
  if (process.env.EXPECT_ANALYTICS_ENABLED === "1") {
    const events = network.map(request => JSON.parse(request.body));
    const names = events.map(event => event.event);
    for (const name of ["result_viewed", "share_intent", "share_sheet_resolved", "share_cancelled", "share_failed", "link_copied", "copy_failed"]) {
      assert.ok(names.includes(name), `missing share analytics: ${name}`);
    }
    assert.ok(!JSON.stringify(events).includes("1988-12-02"));
    assert.ok(events.every(event => !Object.hasOwn(event.props, "focus")));
    console.log("PASS share analytics distinguish intent, sheet resolution, cancellation, failure and copy without personal fields");
  }
  fs.writeFileSync(evidence + "/service-share-browser.json", JSON.stringify({ base: BASE, shared, pageErrors, apiPaths: network.map(r => r.path) }, null, 2));
  console.log("PASS legacy encoded/malformed links: discard fragment, no report exposure, free entry; no messages sent");
} finally { await browser.close(); }
