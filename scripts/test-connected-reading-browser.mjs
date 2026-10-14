// Actual local API + mobile-sized DOM, with invented structured observations.
// No photos, recognition model, external service or customer input is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { birthFixture } from './fixtures/palm-analysis.mjs';
import { leftReadingFixture, rightReadingFixture } from './fixtures/palm-reading.mjs';
import { PALM_ENTRY_KEY, palmEntry } from './fixtures/palm-entry.mjs';
const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3108';
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const evidence = process.env.TEST_EVIDENCE_DIR || '/tmp/saju-connected-reading';
fs.mkdirSync(evidence, { recursive: true });
const births = [birthFixture, { year: 1988, month: 12, day: 2, hour: 6, minute: 15, gender: '여' },
  { year: 2001, month: 2, day: 3, hour: null, minute: null, gender: '여' }];
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const results = [], errors = [];
try {
  for (let index = 0; index < 4; index++) {
    const birth = births[index % 3], left = structuredClone(leftReadingFixture), right = structuredClone(rightReadingFixture);
    if (index === 3) for (const key of ['headLine', 'heartLine', 'lifeLine']) left.onnxLines[key].curve = '직선에 가까움';
    const freeResponse = await fetch(BASE + '/api/palm/interpret', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...birth, palmFacts: right, leftPalmFacts: left, rightPalmFacts: right, dominantHand: 'right' }) });
    assert.equal(freeResponse.status, 200); const free = await freeResponse.json();
    assert.equal(free.annualReport, undefined);
    const key = ['saju-app:reality-journey:v2', 'overall', birth.year, birth.month, birth.day, birth.hour ?? 'x', birth.minute ?? 'x', birth.gender, 'palm'].join(':');
    const saved = { stage: 'result', personalityKey: 'null', palmFacts: free.rightPalmFacts, leftPalmFacts: free.leftPalmFacts,
      rightPalmFacts: free.rightPalmFacts, dominantHand: 'right', bilateralReading: free.bilateralReading,
      finalReport: free.freeReport.report, tripleCompare: free.tripleCompare, verdict: free.verdict };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === BASE ? route.continue() : route.abort());
    await context.addInitScript(({ entryKey, entry, key, saved }) => {
      if (!sessionStorage.getItem('connected-reading-seed')) {
        sessionStorage.setItem('connected-reading-seed', '1'); sessionStorage.setItem(entryKey, entry); sessionStorage.setItem(key, JSON.stringify(saved));
      }
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
    }, { entryKey: PALM_ENTRY_KEY, entry: palmEntry(birth), key, saved });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(BASE + '/diagnosis/palm');
    await page.getByText('양손에서 읽힌 손금 풀이', { exact: true }).waitFor();
    await page.getByRole('button', { name: '링크 복사하고 무료 체험', exact: true }).click();
    await page.locator('#premium-report').waitFor();
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
    const report = await page.evaluate(() => JSON.parse(sessionStorage.getItem('saju-app:integrated-premium:v1')).report);
    assert.equal(report.version, 'year-connected-reading-2026-10-v13');
    const body = await page.locator('#premium-report').innerText();
    for (const paragraph of [...report.overall.paragraphs, ...report.domains.flatMap(d => d.paragraphs),
      ...report.periods.flatMap(p => p.interpretation.passages.map(x => x.text))]) {
      assert.equal(body.split(paragraph).length - 1, 1, 'each complete paragraph appears once in actual customer DOM');
    }
    assert.equal(body.split(report.note).length - 1, 1);
    assert.doesNotMatch(body, /전체 풀이의 중심|맥락으로 삼았습니다|공통 기준으로|마음의 질문이 옮겨|정재이|편재이|무게과|무게이|결과을/);
    assert.doesNotMatch(body, /sourceVariant|attributeSupport|modelExecuted|Error|\bleft\b|\bright\b|[{}]/);
    assert.ok(body.includes('12개월 전체 흐름 펼쳐보기'));
    assert.equal(report.periods.flatMap(p => p.months).length, 12);
    const full = await page.locator('body').innerText();
    if (index === 3) for (const label of ['두뇌선', '감정선', '생명선']) assert.ok(full.includes(`두 사진의 ${label} 모양이 달라`));
    fs.writeFileSync(`${evidence}/synthetic-${index + 1}.txt`, full);
    fs.writeFileSync(`${evidence}/synthetic-${index + 1}.json`, JSON.stringify({ synthetic: true, birth, left, right, free, report }, null, 2));
    await page.locator('#premium-report').screenshot({ path: `${evidence}/synthetic-${index + 1}.png` });
    if (index === 0) {
      for (const [name, selector] of [['overall', '#premium-overall'], ['work', '#premium-domain-work'], ['october', '#premium-period-0'], ['february', '#premium-period-4'], ['march', '#premium-period-5']]) {
        await page.locator(selector).evaluate(element => element.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: `${evidence}/case-1-${name}-viewport.png` });
      }
    }
    results.push({ synthetic: true, case: index + 1, monthCount: 12, wholeParagraphsVisibleOnce: true,
      fullTextCharacters: full.length, differentHandsBodyComparison: index === 3, version: report.version });
    await context.close();
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(`${evidence}/summary.json`, JSON.stringify({ synthetic: true, results, errors, recognition: 'not executed', phoneCamera: 'unverified' }, null, 2));
  console.log('PASS 3 synthetic customer reports + 1 different-hands report: actual API, full mobile DOM, every paragraph once, 12 months, folded evidence, no exposed diagnostic fields, no browser errors');
} finally { await browser.close(); }
