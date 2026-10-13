import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import ts from "typescript";
import { palmFixture, birthFixture } from "./fixtures/palm-analysis.mjs";
const { buildPalmBilateralReading } = await import("../src/lib/palm-bilateral.ts");
const oldSource = execFileSync("git", ["show", "c3392b1:src/lib/palm-bilateral.ts"], { encoding: "utf8" });
const js = ts.transpileModule(oldSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const old = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const left = { ...palmFixture, handSide: "left" }, right = structuredClone(palmFixture);
const prior = old.buildPalmBilateralReading(left, right, "right");
const next = buildPalmBilateralReading(left, right, "right");
assert.equal(prior.items[0].text, prior.items[1].text, "reproduce full duplicated hand narratives on same features");
assert.equal(new Set(next.items.map(x => x.text)).size, next.items.length);
assert.ok(next.items.every(x => x.observation.startsWith("양손:")));
const different = structuredClone(right);
different.onnxLines.headLine.curve = "직선에 가까움";
assert.notEqual(buildPalmBilateralReading(left, different, "right").items[0].text, next.items[0].text);
assert.match(buildPalmBilateralReading(left, different, "right").items[0].observation, /왼손:.*오른손:/);
assert.notEqual(buildPalmBilateralReading(left, different, "left").items[0].text, buildPalmBilateralReading(left, different, "right").items[0].text);
const unread = structuredClone(right);
for (const key of ["headLine", "heartLine"]) unread.onnxLines[key] = { detected: false, length: null, curve: null, depthStrength: null, start: null, end: null, branchDetected: null };
const partial = buildPalmBilateralReading(left, unread, "right");
assert.ok(partial.items.slice(0, 2).every(x => x.text.includes("보류")));
assert.ok(partial.items[2].text.includes("수명·건강을 판단할 수는 없습니다"));
const empty = { ...unread, onnxLines: null };
assert.ok(buildPalmBilateralReading(empty, empty, "right").items.every(x => x.text.includes("보류")));
console.log("PASS reproduced old duplicate paragraphs; new same/different/dominant-hand branches and missing-line abstention");

const BASE = process.env.TEST_BASE_URL || "http://127.0.0.1:3027";
assert.match(BASE, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
async function call(l, r) {
  const response = await fetch(BASE + "/api/palm/interpret", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...birthFixture, leftPalmFacts: l, rightPalmFacts: r, dominantHand: "right" }) });
  assert.equal(response.status, 200); return response.json();
}
const normal = await call(left, right);
assert.deepEqual(normal.bilateralReading, next);
assert.equal(normal.futurePalmTimeline, undefined);
assert.equal((await call(left, unread)).usable, true, "keep confirmed-line quality threshold");
assert.equal((await call(left, empty)).usable, false);
const skipped = await call(null, null);
assert.equal(skipped.palmSkipped, true); assert.equal(skipped.bilateralReading, null);
console.log("PASS actual API: same generator, no age-theme rotation, partial lines preserved, rejected/skip never forged success");

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const evidence = process.env.TEST_EVIDENCE_DIR || "/tmp/saju-report-polish";
fs.mkdirSync(evidence, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const requests = [], errors = [];
  await context.route("**/*", route => { const u = new URL(route.request().url()); if (u.origin !== BASE) return route.abort(); if (u.pathname.startsWith("/api/")) { requests.push(u.pathname); return route.abort(); } return route.continue(); });
  await context.addInitScript(({ normal, birthFixture }) => {
    const key = ["saju-app:reality-journey:v2", "overall", birthFixture.year, birthFixture.month, birthFixture.day, birthFixture.hour, birthFixture.minute, birthFixture.gender].join(":") + ":palm";
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({ stage: "result", palmFacts: normal.palmFacts, leftPalmFacts: normal.leftPalmFacts, rightPalmFacts: normal.rightPalmFacts, dominantHand: "right", bilateralReading: { summary: "LEGACY_REPEATED_COPY", items: [] }, futurePalmTimeline: { windows: [{ combined: "LEGACY_FUTURE" }] }, finalReport: normal.freeReport.report, tripleCompare: normal.tripleCompare, verdict: normal.verdict }));
  }, { normal, birthFixture });
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  const url = BASE + "/diagnosis/palm?" + new URLSearchParams(birthFixture);
  await page.goto(url);
  await page.getByText("양손 분석 완료", { exact: true }).waitFor();
  const text = await page.locator("body").innerText();
  assert.ok(!text.includes("LEGACY_") && !text.includes("유파마다") && !text.includes("과거는 제외"));
  for (const item of next.items) assert.equal(text.split(item.text).length - 1, 1);
  await page.getByText("양손에서 보이는 특징과 해석", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: evidence + "/palm-observations-restored.png" });
  await page.reload(); await page.getByText("양손 분석 완료", { exact: true }).waitFor();
  assert.deepEqual(requests, [], "restoration must not trigger a generation or analytics call");
  await page.goto(url + "&mbti=ENTJ");
  await page.getByRole("alert").filter({ hasText: "성향 정보가 달라졌어요" }).waitFor();
  assert.equal(await page.getByText("양손 분석 완료", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "촬영 유지하고 리포트 다시 받기" }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS legacy session re-entry regenerates new copy from observed facts, no duplicate/stale generation; changed personality requires retry with hands retained");
  fs.writeFileSync(evidence + "/palm-duplication.json", JSON.stringify({ synthetic: true, previousDuplicateParagraphs: [prior.items[0].text, prior.items[1].text], newReading: next, partialReading: partial, restoredWithoutRequests: true, errors }, null, 2));
} finally { await browser.close(); }
