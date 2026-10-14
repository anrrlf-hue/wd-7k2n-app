import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const bundle = process.env.CREASE_BUNDLE || path.resolve("dist/additional-vertical-crease.js");
const out = process.env.CREASE_EVIDENCE_DIR || path.resolve(".tmp/additional-crease-browser");
fs.mkdirSync(out, { recursive: true });

const server = http.createServer((req, res) => {
  if (req.url === "/additional-vertical-crease.js") {
    res.setHeader("content-type", "text/javascript");
    res.setHeader("access-control-allow-origin", "*");
    res.end(fs.readFileSync(bundle));
  } else { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const moduleUrl = `http://127.0.0.1:${server.address().port}/additional-vertical-crease.js`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setContent(`<script type="module">window.ready = import(${JSON.stringify(moduleUrl)}).then(m => { window.tracker = m.trackAdditionalVerticalCreases; });</script>`);
await page.waitForFunction(() => window.tracker);

async function runSynthetic(kind, scale = 1) {
  const points = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }));
  for (const [idx, x, y] of [[0,.52,.90],[5,.27,.35],[9,.43,.33],[13,.58,.34],[17,.73,.40]]) points[idx] = { x, y, z: 0 };
  return page.evaluate(({ kind, points, scale }) => {
    const c = document.createElement("canvas"); c.width = 600 * scale; c.height = 800 * scale;
    const d = c.getContext("2d"); d.fillStyle = "rgb(188,137,116)"; d.fillRect(0, 0, c.width, c.height);
    const x = 348 * scale; d.strokeStyle = kind === "weak_contrast" ? "rgb(170,125,108)" : "rgb(70,45,40)"; d.lineWidth = 1 * scale;
    if (kind === "clear_vertical_curve") { d.beginPath(); for (let y=330*scale; y<580*scale; y++) { const yy=y/scale, xx=x+.000005*(yy-319)**2*scale; if (y===330*scale) d.moveTo(xx,y); else d.lineTo(xx,y); } d.stroke(); }
    if (kind === "clear_curved") { d.beginPath(); for (let y=330*scale; y<580*scale; y++) { const yy=y/scale, xx=x+.00005*(yy-319)**2*scale; if (y===330*scale) d.moveTo(xx,y); else d.lineTo(xx,y); } d.stroke(); }
    if (kind === "sloped_vertical") { d.lineWidth = 1 * scale; d.beginPath(); d.moveTo(x-12*scale,330*scale); d.lineTo(x+12*scale,580*scale); d.stroke(); }
    if (kind === "weak_contrast") { d.beginPath(); d.moveTo(x,330*scale); d.lineTo(x,580*scale); d.stroke(); }
    if (kind === "short_high_contrast") { d.beginPath(); d.moveTo(x,430*scale); d.lineTo(x,445*scale); d.stroke(); }
    if (kind === "broken_vertical") { d.beginPath(); d.moveTo(x,330*scale); d.lineTo(x,350*scale); d.moveTo(x,465*scale); d.lineTo(x+3*scale,485*scale); d.stroke(); }
    if (kind === "broken_long") { d.beginPath(); d.moveTo(x,330*scale); d.lineTo(x,390*scale); d.moveTo(x,520*scale); d.lineTo(x+3*scale,565*scale); d.stroke(); }
    if (kind === "parallel_double") { d.beginPath(); d.moveTo(338*scale,330*scale); d.lineTo(338*scale,580*scale); d.moveTo(343*scale,330*scale); d.lineTo(343*scale,580*scale); d.stroke(); }
    if (kind === "dense_texture") {
      for (let yy = 300 * scale; yy < 600 * scale; yy += 6 * scale) { d.strokeStyle = `rgb(${125 + (yy % 17)},105,100)`; d.beginPath(); d.moveTo(250 * scale, yy); d.lineTo(450 * scale, yy + 2 * scale); d.stroke(); }
      for (let xx = 250 * scale; xx < 450 * scale; xx += 7 * scale) { d.strokeStyle = `rgb(145,${115 + (xx % 13)},105)`; d.beginPath(); d.moveTo(xx, 280 * scale); d.lineTo(xx + 2 * scale, 620 * scale); d.stroke(); }
    }
    if (kind === "horizontal_cross") for (const y of [380,450,520]) { d.beginPath(); d.moveTo(300*scale,y*scale); d.lineTo(390*scale,y*scale); d.stroke(); }
    if (kind === "lighting_edge") for (let xx=x; xx<c.width; xx++) { d.strokeStyle=`rgb(${Math.round(188+30*(xx-x)/(c.width-x))},137,116)`; d.beginPath(); d.moveTo(xx,0); d.lineTo(xx,c.height); d.stroke(); }
    return window.tracker(d.getImageData(0, 0, c.width, c.height), points);
  }, { kind, points, scale });
}

const synthetic = {};
for (const kind of ["clear_vertical_curve", "clear_curved", "sloped_vertical", "broken_vertical", "broken_long", "parallel_double", "horizontal_cross", "lighting_edge", "no_line", "weak_contrast", "short_high_contrast"]) synthetic[kind] = await runSynthetic(kind);
assert.equal(synthetic.clear_vertical_curve.corridors.ring_direction.stability.stableCandidate, true);
assert.equal(synthetic.clear_vertical_curve.corridors.ring_direction.raw.points[0].x, 348);
assert.ok(["candidate", "insufficient_evidence"].includes(synthetic.clear_curved.corridors.ring_direction.raw.status));
assert.ok(synthetic.clear_curved.corridors.ring_direction.raw.selectedSpanPx > 0);
assert.equal(synthetic.clear_curved.corridors.ring_direction.stability.stableCandidate, true);
assert.equal(synthetic.sloped_vertical.corridors.ring_direction.stability.stableCandidate, true);
assert.ok(synthetic.clear_curved.corridors.ring_direction.stability.supportOverlapRatio >= .6);
assert.ok(synthetic.sloped_vertical.corridors.ring_direction.stability.supportOverlapRatio >= .6);
const doublePoints = synthetic.parallel_double.corridors.ring_direction.raw.points;
assert.ok(doublePoints.length > 100);
assert.ok(doublePoints.every(p => Math.abs(p.x - 338) < .6 || Math.abs(p.x - 343) < .6));
for (const kind of ["broken_vertical", "broken_long", "horizontal_cross", "lighting_edge", "no_line", "weak_contrast", "short_high_contrast"]) assert.equal(Object.values(synthetic[kind].corridors).some(v => v.stability.stableCandidate), false, kind);
assert.equal(synthetic.short_high_contrast.corridors.ring_direction.raw.status, "insufficient_evidence");
assert.equal(synthetic.broken_vertical.corridors.ring_direction.raw.status, "insufficient_evidence");
assert.ok(synthetic.broken_long.corridors.ring_direction.raw.componentCount >= 2 || synthetic.broken_long.corridors.ring_direction.raw.competingComponentCount >= 1);
assert.equal(synthetic.broken_long.corridors.ring_direction.stability.stableCandidate, false);
const normalPoints = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 })); normalPoints[0] = { x: .52, y: .9, z: 0 }; normalPoints[5] = { x: .27, y: .35, z: 0 }; normalPoints[9] = { x: .43, y: .33, z: 0 }; normalPoints[13] = { x: .58, y: .34, z: 0 }; normalPoints[17] = { x: .73, y: .40, z: 0 };
const nanPoints = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 })); nanPoints[0] = { x: Number.NaN, y: .9, z: 0 };
const invalid = await page.evaluate(({ points }) => window.tracker(new ImageData(32, 32), points), { points: nanPoints });
assert.equal(invalid.status, "invalid_input");
const nullData = await page.evaluate(({ points }) => window.tracker({ width: 32, height: 32, data: null }, points), { points: normalPoints ?? nanPoints });
assert.equal(nullData.status, "invalid_input"); assert.equal(nullData.errorCode, "invalid_image");
const nullLandmark = await page.evaluate(() => window.tracker(new ImageData(32, 32), [null, ...Array.from({ length: 20 }, () => ({ x: .5, y: .5, z: 0 }))]));
assert.equal(nullLandmark.status, "invalid_input"); assert.equal(nullLandmark.errorCode, "invalid_landmarks");
const degenerate = await page.evaluate(() => window.tracker(new ImageData(32, 32), Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }))));
assert.equal(degenerate.status, "invalid_input");
const outsidePoints = normalPoints.map((p, i) => i === 13 ? { ...p, x: 1.2 } : p);
const outside = await page.evaluate(({ points }) => window.tracker(new ImageData(32, 32), points), { points: outsidePoints });
assert.equal(outside.status, "invalid_input"); assert.equal(outside.errorCode, "invalid_landmarks");
const oversized = await page.evaluate(({ points }) => window.tracker(new ImageData(2500, 2500), points), { points: normalPoints });
assert.equal(oversized.status, "invalid_input"); assert.ok(["image_too_large", "work_limit"].includes(oversized.errorCode));
const rotatePoints = (turns) => normalPoints.map(p => turns === 1 ? ({ x: .5 - (p.y - .5), y: .5 + (p.x - .5), z: p.z }) : ({ x: 1 - p.x, y: 1 - p.y, z: p.z }));
for (const points of [rotatePoints(1), rotatePoints(2)]) assert.equal((await page.evaluate(({ points }) => window.tracker(new ImageData(32, 32), points), { points })).status, "unsupported_pose");
const posePoints = normalPoints.map(p => ({ ...p })); posePoints[9] = { x: .52, y: .33, z: 0 };
const rotateByDegrees = (degrees) => posePoints.map(p => { const r = degrees * Math.PI / 180, dx = p.x - .5, dy = p.y - .5; return { x: .5 + dx * Math.cos(r) - dy * Math.sin(r), y: .5 + dx * Math.sin(r) + dy * Math.cos(r), z: p.z }; });
for (const degrees of [-29, 0, 29]) assert.notEqual((await page.evaluate(({ points }) => window.tracker(new ImageData(32, 32), points), { points: rotateByDegrees(degrees) })).status, "unsupported_pose");
for (const degrees of [-31, 31, 45]) assert.equal((await page.evaluate(({ points }) => window.tracker(new ImageData(32, 32), points), { points: rotateByDegrees(degrees) })).status, "unsupported_pose");
const resolution = {}; for (const scale of [1, 2, 3]) resolution[scale] = await runSynthetic("clear_vertical_curve", scale);
assert.equal(resolution[2].corridors.ring_direction.stability.stableCandidate, true); assert.equal(resolution[3].corridors.ring_direction.stability.stableCandidate, true);
const denseTexture = {}; for (const scale of [1, 2, 3]) denseTexture[scale] = await runSynthetic("dense_texture", scale);
fs.writeFileSync(path.join(out, "synthetic-results.json"), JSON.stringify({ synthetic, resolution, denseTexture, contract: "ImageData + 21 normalized MediaPipe landmarks -> pixel-only corridor tracks; no semantic line names" }, null, 2));
console.log(JSON.stringify({ synthetic: Object.fromEntries(Object.entries(synthetic).map(([k,v]) => [k, Object.fromEntries(Object.entries(v.corridors).map(([d,c]) => [d, c.stability.stableCandidate]))])), resolution: Object.fromEntries(Object.entries(resolution).map(([k,v]) => [k, v.elapsedMs])), denseTexture: Object.fromEntries(Object.entries(denseTexture).map(([k,v]) => [k, v.elapsedMs])) }, null, 2));
await browser.close(); server.close();
