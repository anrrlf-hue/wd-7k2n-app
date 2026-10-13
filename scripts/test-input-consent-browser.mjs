// Synthetic input, notices only. Block every API/external request; no analysis.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3096";
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const evidence = process.env.TEST_EVIDENCE_DIR || "/tmp/saju-operation-consent";
fs.mkdirSync(evidence, { recursive: true });
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const errors = [], apiRequests = [], widths = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.origin !== BASE) return route.abort();
      if (url.pathname.startsWith("/api/")) { apiRequests.push(url.pathname); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(BASE + "/diagnosis?mode=free&focus=overall&start=free");
    await page.getByText("입력·풀이·손금 특징은 이 탭에, 내 출생정보는 이 기기에 자동 저장됩니다.", { exact: true }).waitFor();
    await page.getByText("운영자가 외부 해석을 켜면 계산된 사주 정보와 입력한 MBTI·질문이 Anthropic에 전송될 수 있습니다.", { exact: true }).waitFor();
    assert.equal(await page.locator("input").count(), 2);
    await page.locator('input[type="date"]').fill("1990-05-15");
    const next = page.getByRole("button", { name: "다음", exact: true });
    assert.equal(await next.isDisabled(), true);
    await page.getByRole("checkbox").check();
    assert.equal(await next.isEnabled(), true);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.getByRole("checkbox").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}/input-consent-${width}.png`, fullPage: true });
    const popupReady = context.waitForEvent("page");
    await page.getByRole("link", { name: "개인정보처리방침 보기", exact: true }).click();
    const policy = await popupReady;
    await policy.waitForURL(BASE + "/privacy");
    await policy.getByText(/내 출생정보\(생년월일·성별·입력한 출생시간\)/).waitFor();
    await policy.getByText(/운영자가 외부 해석을 명시적으로 켠 경우에만 Anthropic/).waitFor();
    widths.push(width);
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(apiRequests, []);
  fs.writeFileSync(`${evidence}/input-consent-browser.json`, JSON.stringify({ synthetic: true, widths, requiredConsent: true, noAddedInput: true, policyLinkAndCopyAligned: true, errors, apiRequests }, null, 2));
  console.log("PASS input consent 390/1440px: storage/external processing visible, consent required, two existing inputs, policy link works, no overflow or API calls");
} finally { await browser.close(); }
