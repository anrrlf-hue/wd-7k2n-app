// Synthetic geometry regressions only. These do not claim photo recognition
// accuracy; they verify coordinate conversion and path measurement invariants.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
const { computeObservation } = await import("../src/lib/palm-line-onnx.ts");

function mask(width, height, paint) {
  const value = new Uint8Array(width * height);
  paint(value, width, height);
  return value;
}
function rect(value, width, x0, x1, y0, y1, cls = 2) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) value[y * width + x] = cls;
}
function diagonal(value, width, x0, y0, length, dx, dy, cls = 2) {
  for (let i = 0; i < length; i++) value[(y0 + i * dy) * width + x0 + i * dx] = cls;
}
function assertMeasured(name, observation, sourceMask, width, expected) {
  assert.equal(observation.detected, true, `${name} line remains observed`);
  assert.equal(observation.geometryStatus, "measurable", `${name} line has measurable geometry`);
  assert.ok(observation.lineLength >= expected.minLength, `${name} path length is retained`);
  assert.ok(observation.curveScore < 0.1, `${name} straight path remains straight`);
  for (const point of [observation.start, observation.end]) {
    assert.ok(point, `${name} has a path endpoint`);
    const x = Math.round(point.x * (width - 1)), y = Math.round(point.y * (width - 1));
    const nearbyForeground = Array.from({ length: 3 }, (_, dy) => Array.from({ length: 3 }, (_, dx) => sourceMask[(y + dy - 1) * width + x + dx - 1] === 2)).flat().some(Boolean);
    assert.equal(nearbyForeground, true, `${name} endpoint remains on foreground`);
  }
  const dx = Math.abs(observation.end.x - observation.start.x);
  const dy = Math.abs(observation.end.y - observation.start.y);
  assert.ok(dx >= expected.minDx && dy >= expected.minDy, `${name} direction is preserved`);
}
const context = { cropWidth: 100, cropHeight: 100, referenceSpan: 100 };
const thick = computeObservation(mask(100, 100, (v, w) => rect(v, w, 5, 94, 44, 56)), 100, 100, "head_line", context);
const thin = computeObservation(mask(100, 100, (v, w) => rect(v, w, 5, 94, 50, 50)), 100, 100, "head_line", context);
assert.ok(thick.detected && thin.detected);
assert.ok(thick.curveScore < 0.1 && thin.curveScore < 0.1, "line thickness is not curvature");
assert.ok(Math.abs(thick.curveScore - thin.curveScore) < 0.05, "thick and thin straight paths have stable curvature");

for (const [name, paint, expected] of [
  ["vertical", (v, w) => rect(v, w, 50, 50, 10, 89), { minLength: 70, minDx: 0, minDy: 0.5 }],
  ["diagonal", (v, w) => diagonal(v, w, 10, 10, 80, 1, 1), { minLength: 90, minDx: 0.5, minDy: 0.5 }],
  ["shallow", (v, w) => { for (let i = 0; i < 80; i++) v[(30 + Math.floor(i / 3)) * w + 10 + i] = 2; }, { minLength: 75, minDx: 0.5, minDy: 0.15 }],
]) {
  const sourceMask = mask(100, 100, paint);
  assertMeasured(name, computeObservation(sourceMask, 100, 100, "head_line", context), sourceMask, 100, expected);
}

const rightAngle = computeObservation(mask(100, 100, (v, w) => {
  rect(v, w, 20, 20, 20, 80); rect(v, w, 20, 80, 79, 79);
}), 100, 100, "head_line", context);
assert.equal(rightAngle.geometryStatus, "measurable", "a right-angle path remains measurable");

const uShape = computeObservation(mask(400, 400, (v, w) => {
  rect(v, w, 198, 202, 100, 300);
  rect(v, w, 238, 242, 100, 300);
  rect(v, w, 198, 242, 298, 302);
}), 400, 400, "head_line", { cropWidth: 400, cropHeight: 400, referenceSpan: 200 });
assert.ok(uShape.detected, "a single U-shaped foreground path remains measurable");
assert.ok(uShape.curveScore > 0.35, "U path is not collapsed into a straight bin-average line");
assert.ok(uShape.start && uShape.end);
for (const point of [uShape.start, uShape.end]) {
  const x = Math.round(point.x * 399), y = Math.round(point.y * 399);
  assert.equal(mask(400, 400, (v, w) => {
    rect(v, w, 198, 202, 100, 300); rect(v, w, 238, 242, 100, 300); rect(v, w, 198, 242, 298, 302);
  })[y * 400 + x], 2, "U endpoint stays on foreground");
}

const fork = computeObservation(mask(100, 100, (v, w) => {
  rect(v, w, 48, 52, 10, 90);
  rect(v, w, 10, 50, 48, 52);
  rect(v, w, 50, 90, 48, 52);
}), 100, 100, "head_line", context);
assert.equal(fork.detected, true, "a fork remains an observed foreground component");
assert.equal(fork.geometryStatus, "ambiguous", "a fork is not forced into one reading path");

const loop = computeObservation(mask(100, 100, (v, w) => {
  rect(v, w, 20, 80, 20, 22); rect(v, w, 20, 80, 78, 80);
  rect(v, w, 20, 22, 20, 80); rect(v, w, 78, 80, 20, 80);
}), 100, 100, "head_line", context);
assert.equal(loop.detected, true, "a loop remains an observed foreground component");
assert.equal(loop.geometryStatus, "ambiguous", "a loop is not forced into one reading path");

const islands = computeObservation(mask(100, 100, (v, w) => {
  rect(v, w, 5, 34, 50, 50);
  rect(v, w, 65, 94, 50, 50);
}), 100, 100, "head_line", context);
assert.equal(islands.detected, false, "separate sub-threshold islands do not become one detected line");

const wide = computeObservation(mask(200, 100, (v, w) => rect(v, w, 20, 180, 50, 51)), 200, 100, "head_line", { cropWidth: 400, cropHeight: 200, referenceSpan: 200 });
const resized = computeObservation(mask(100, 100, (v, w) => rect(v, w, 10, 90, 50, 51)), 100, 100, "head_line", { cropWidth: 200, cropHeight: 200, referenceSpan: 100 });
assert.ok(wide.detected && resized.detected);
assert.ok(Math.abs(wide.normalizedLineLength - resized.normalizedLineLength) < 0.05, "aspect-resized equivalent paths keep normalized length");
console.log("PASS observation geometry: thick/thin straight paths, disconnected islands, and aspect-resized paths remain stable");
