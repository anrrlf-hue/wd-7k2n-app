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

async function runSynthetic(kind) {
  const points = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }));
  for (const [idx, x, y] of [[0,.52,.90],[5,.27,.35],[9,.43,.33],[13,.58,.34],[17,.73,.40]]) points[idx] = { x, y, z: 0 };
  return page.evaluate(({ kind, points }) => {
    const c = document.createElement("canvas"); c.width = 600; c.height = 800;
    const d = c.getContext("2d"); d.fillStyle = "rgb(188,137,116)"; d.fillRect(0, 0, c.width, c.height);
    const x = 348; d.strokeStyle = "rgb(70,45,40)"; d.lineWidth = 1;
    if (kind === "clear_vertical_curve") { d.beginPath(); for (let y=330; y<580; y++) { const xx=x+.000005*(y-319)**2; if (y===330) d.moveTo(xx,y); else d.lineTo(xx,y); } d.stroke(); }
    if (kind === "broken_vertical") { d.beginPath(); d.moveTo(x,330); d.lineTo(x,350); d.moveTo(x,465); d.lineTo(x+3,485); d.stroke(); }
    if (kind === "horizontal_cross") for (const y of [380,450,520]) { d.beginPath(); d.moveTo(300,y); d.lineTo(390,y); d.stroke(); }
    if (kind === "lighting_edge") for (let xx=x; xx<c.width; xx++) { d.strokeStyle=`rgb(${Math.round(188+30*(xx-x)/(c.width-x))},137,116)`; d.beginPath(); d.moveTo(xx,0); d.lineTo(xx,c.height); d.stroke(); }
    return window.tracker(d.getImageData(0, 0, c.width, c.height), points);
  }, { kind, points });
}

const synthetic = {};
for (const kind of ["clear_vertical_curve", "broken_vertical", "horizontal_cross", "lighting_edge", "no_line"]) synthetic[kind] = await runSynthetic(kind);
assert.equal(synthetic.clear_vertical_curve.corridors.ring_direction.stability.stableCandidate, true);
for (const kind of ["broken_vertical", "horizontal_cross", "lighting_edge", "no_line"]) assert.equal(Object.values(synthetic[kind].corridors).some(v => v.stability.stableCandidate), false, kind);
fs.writeFileSync(path.join(out, "synthetic-results.json"), JSON.stringify({ synthetic, contract: "ImageData + 21 normalized MediaPipe landmarks -> pixel-only corridor tracks; no semantic line names" }, null, 2));
console.log(JSON.stringify({ synthetic: Object.fromEntries(Object.entries(synthetic).map(([k,v]) => [k, Object.fromEntries(Object.entries(v.corridors).map(([d,c]) => [d, c.stability.stableCandidate]))])) }, null, 2));
await browser.close(); server.close();
