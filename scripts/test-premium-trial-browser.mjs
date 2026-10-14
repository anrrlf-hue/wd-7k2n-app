// Actual local API and synthetic customer state; browser share/copy callbacks
// are controlled. This cannot establish real delivery or acquisition.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { birthFixture } from './fixtures/palm-analysis.mjs';
import { PALM_ENTRY_KEY, palmEntry } from './fixtures/palm-entry.mjs';
const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3105';
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const evidence = process.env.TEST_EVIDENCE_DIR || '/tmp/saju-premium-trial';
fs.mkdirSync(evidence, { recursive: true });
const input = { ...birthFixture, mbti: null, leftPalmFacts: null, rightPalmFacts: null, dominantHand: null };
const identity = JSON.stringify(input);
const palmKey = ['saju-app:reality-journey:v2', 'overall', birthFixture.year, birthFixture.month, birthFixture.day, birthFixture.hour, birthFixture.minute, birthFixture.gender, 'palm'].join(':');
async function api(body) {
  const response = await fetch(BASE + '/api/premium-report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
assert.equal((await api(input)).status, 403, 'direct generation is denied without a receipt');
assert.equal((await api({ ...input, trialAction: 'participate', participation: 'cancelled' })).status, 400);
const proof = await api({ ...input, trialAction: 'participate', participation: 'clipboard' });
assert.equal(proof.status, 200); assert.equal(proof.data.report, undefined);
const receipt = proof.data.trialReceipt;
const payload = JSON.parse(Buffer.from(receipt.split('.')[0], 'base64url').toString());
assert.deepEqual(Object.keys(payload).sort(), ['campaign', 'completedAt', 'participation', 'scope']);
assert.equal((await api({ ...input, trialAction: 'verify', trialReceipt: receipt })).status, 200);
assert.equal((await api({ ...input, day: 16, trialReceipt: receipt })).status, 403, 'a different reading cannot use this participation');
assert.equal((await api({ ...input, trialReceipt: 'X' + receipt.slice(1) })).status, 403, 'tampering is rejected');
const freeResponse = await fetch(BASE + '/api/palm/interpret', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...birthFixture, palmFacts: null }) });
assert.equal(freeResponse.status, 200);
const free = await freeResponse.json(); assert.equal(free.annualReport, undefined, 'the free route has no premium bypass');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const errors = [], cases = [];
async function open({ share = 'none', copy = 'resolve', savedTrial = null, hold = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const requests = []; let held = null;
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== BASE) return route.abort();
    if (url.pathname === '/api/premium-report') {
      const action = route.request().postDataJSON()?.trialAction ?? 'generate';
      requests.push(action);
      if (hold && action === 'participate') { held = route; return; }
    }
    return route.continue();
  });
  await context.addInitScript(({ entryKey, entry, palmKey, free, share, copy, savedTrial }) => {
    if (!sessionStorage.getItem('trial-seeded')) {
      sessionStorage.setItem('trial-seeded', '1'); sessionStorage.setItem(entryKey, entry);
      sessionStorage.setItem(palmKey, JSON.stringify({ stage: 'saju_only', personalityKey: 'null', palmFacts: null, leftPalmFacts: null, rightPalmFacts: null, dominantHand: null, finalReport: free.freeReport.report, tripleCompare: [] }));
      if (savedTrial) sessionStorage.setItem('saju-app:premium-trial:v1', JSON.stringify(savedTrial));
    }
    window.__trialActions = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: share === 'none' ? undefined : async data => {
      window.__trialActions.push({ action: 'share', data });
      if (share === 'cancel') throw new DOMException('cancelled', 'AbortError');
      if (share === 'error') throw new Error('share failed');
    } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: copy === 'none' ? undefined : { writeText: async text => {
      window.__trialActions.push({ action: 'copy', text }); if (copy === 'error') throw new Error('copy failed');
    } } });
  }, { entryKey: PALM_ENTRY_KEY, entry: palmEntry(birthFixture), palmKey, free, share, copy, savedTrial });
  const page = await context.newPage(); page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(BASE + '/diagnosis/palm');
  await page.getByRole('button', { name: '링크 복사하고 무료 체험', exact: true }).waitFor();
  return { context, page, requests, held: () => held };
}
try {
  for (const [name, share, copy, success] of [
    ['native-complete', 'resolve', 'resolve', true], ['native-cancel', 'cancel', 'resolve', false],
    ['native-error', 'error', 'resolve', false], ['copy-complete', 'none', 'resolve', true],
    ['copy-error', 'none', 'error', false], ['clipboard-unavailable', 'none', 'none', false],
  ]) {
    const session = await open({ share, copy });
    const { page, requests } = session;
    assert.equal(await page.locator('#premium-report').count(), 0);
    await page.getByRole('button', { name: share === 'none' ? '링크 복사하고 무료 체험' : '링크 공유하고 무료 체험', exact: true }).click();
    let actions;
    if (success) {
      await page.locator('#premium-report').waitFor();
      assert.deepEqual(requests, ['participate', 'generate']);
      assert.match(await page.locator('body').innerText(), /실제 전달·신규 방문을 확인한 것은 아닙니다/);
      actions = await page.evaluate(() => window.__trialActions);
      const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('saju-app:integrated-premium:v1')));
      await page.reload(); await page.getByRole('button', { name: '프리미엄 무료 체험 다시 보기', exact: true }).click();
      await page.locator('#premium-report').waitFor();
      assert.deepEqual(requests, ['participate', 'generate', 'verify'], 'reload verifies eligibility without regenerating text');
      assert.deepEqual(await page.evaluate(() => JSON.parse(sessionStorage.getItem('saju-app:integrated-premium:v1'))), saved);
    } else {
      await page.getByText(/공유를 취소|공유창을 열지 못|자동 복사를 하지 못/).waitFor();
      assert.deepEqual(requests, [], 'cancel/error/manual copy never registers participation');
      assert.equal(await page.locator('#premium-report').count(), 0);
      assert.equal(await page.evaluate(() => sessionStorage.getItem('saju-app:premium-trial:v1')), null);
    }
    actions ??= await page.evaluate(() => window.__trialActions);
    assert.ok(actions.every(action => !JSON.stringify(action).includes('1990') && !JSON.stringify(action).includes('palmFacts')), 'shared payload contains only service invitation');
    fs.writeFileSync(`${evidence}/${name}.txt`, await page.locator('body').innerText());
    cases.push({ name, success, requests }); await session.context.close();
  }
  for (const [name, savedTrial, expectedRequests] of [
    ['wrong-reading', { identity: JSON.stringify({ ...input, day: 16 }), receipt }, []],
    ['tampered-receipt', { identity, receipt: 'X' + receipt.slice(1) }, ['verify']],
  ]) {
    const session = await open({ savedTrial });
    await session.page.waitForFunction(() => !document.body.innerText.includes('이 풀이의 이벤트 참여를 확인하고 있어요.'));
    assert.deepEqual(session.requests, expectedRequests); assert.equal(await session.page.locator('#premium-report').count(), 0);
    cases.push({ name, requests: session.requests }); await session.context.close();
  }
  const delayed = await open({ hold: true });
  await delayed.page.getByRole('button', { name: '링크 복사하고 무료 체험', exact: true }).click();
  await delayed.page.getByRole('status').filter({ hasText: '이 풀이의 이벤트 참여를 확인' }).waitFor();
  await delayed.page.getByRole('link', { name: '개인정보처리방침', exact: true }).click();
  await delayed.page.waitForURL(BASE + '/privacy');
  await delayed.held()?.fulfill({ json: proof.data }).catch(() => {});
  assert.equal(await delayed.page.evaluate(() => sessionStorage.getItem('saju-app:premium-trial:v1')), null, 'late participation cannot publish after navigation');
  cases.push({ name: 'late-participation-after-leave', requests: delayed.requests }); await delayed.context.close();
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${evidence}/trial-browser.json`, JSON.stringify({ synthetic: true, cases, errors, apiScopeTamperAndMissingReceipt: 'passed', actualDeliveryVerified: false }, null, 2));
  console.log('PASS API scope/tamper/bypass guards, native/copy completion, cancellation/errors, reload verification, input isolation and late participation exclusion');
} finally { await browser.close(); }
