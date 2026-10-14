import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
const { analyzeLandmarkRidgeMap } = await import("../src/lib/prototypes/landmark-ridge-candidates.ts");
const width = 180, height = 180;
const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
points[0] = { x: 90, y: 170 }; points[2] = { x: 45, y: 110 }; points[5] = { x: 45, y: 40 }; points[9] = { x: 90, y: 40 }; points[17] = { x: 135, y: 40 };
function map() { return { width, height, response: new Float32Array(width * height) }; }
function stroke(out, line, value = 1, radius = 1) { for (let i = 1; i < line.length; i++) { const [x0, y0] = line[i - 1], [x1, y1] = line[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let s = 0; s <= n; s++) { const x = Math.round(x0 + (x1 - x0) * s / Math.max(1, n)), y = Math.round(y0 + (y1 - y0) * s / Math.max(1, n)); for (let yy = y - radius; yy <= y + radius; yy++) for (let xx = x - radius; xx <= x + radius; xx++) if (xx >= 0 && xx < width && yy >= 0 && yy < height) out.response[yy * width + xx] = value; } } }
const curve = map(); stroke(curve, [[64, 110], [60, 100], [60, 78], [78, 58]], 1, 1); const curveResult = analyzeLandmarkRidgeMap(curve, points); assert.equal(curveResult.status, "ok", "connected curve map is analyzable");
const filled = map(); for (let y = 45; y < 145; y++) for (let x = 35; x < 145; x++) filled.response[y * width + x] = 1; const filledResult = analyzeLandmarkRidgeMap(filled, points); assert.ok(filledResult.candidates.every(c => c.status !== "candidate"), "filled texture is rejected by density");
const broken = map(); stroke(broken, [[64, 110], [60, 100]], 1, 0); stroke(broken, [[60, 78], [78, 58]], 1, 0); const brokenResult = analyzeLandmarkRidgeMap(broken, points); assert.ok(brokenResult.candidates.every(c => c.status !== "candidate"), "gapped curve is not connected by the prototype");
console.log("PASS landmark ridge candidates: anatomical ROI, density guard, and no-gap invariant");
