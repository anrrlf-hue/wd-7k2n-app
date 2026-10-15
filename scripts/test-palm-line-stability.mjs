import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
const { comparePalmPaths } = await import("../src/lib/palm-line-stability.ts");

const transform = (scale, offsetX, offsetY, tilt = 0) => {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const p = (x, y) => ({ x: offsetX + (x * c - y * s) * scale, y: offsetY + (x * s + y * c) * scale });
  return p;
};
const frame = (scale, offsetX, offsetY, tilt = 0) => {
  const p = transform(scale, offsetX, offsetY, tilt);
  const landmarks = [p(100, 250), p(85, 210), p(55, 180), p(40, 150), p(50, 110), p(70, 80), p(90, 45), p(100, 20), p(100, 0), p(100, 50), p(100, 30), p(100, 10), p(100, -10), p(130, 80), p(140, 50), p(145, 20), p(150, -10), p(170, 90)];
  return { landmarks, cropWidth: 400 * scale + offsetX, cropHeight: 400 * scale + offsetY };
};
const pathFor = (scale, offsetX, offsetY, tilt = 0) => {
  const p = transform(scale, offsetX, offsetY, tilt);
  return [0, .12, .24, .37, .5, .63, .76, .88, 1].map((t) => { const point = p(100 + 36 * Math.sin(t * Math.PI), 250 - 232 * t); return { x: point.x / (400 * scale + offsetX - 1), y: point.y / (400 * scale + offsetY - 1) }; });
};
const path = pathFor(1, 0, 0), reversed = [...pathFor(1.7, 31, 17, .18)].reverse();
const same = comparePalmPaths(path, frame(1, 0, 0), reversed, frame(1.7, 31, 17, .18));
assert.equal(same.valid, true);
assert.equal(same.orientation, "reversed");
assert.ok((same.meanDistance ?? 1) < 0.02, "same anatomical path stays close across crop scale/rotation and reversed traversal");
assert.ok((same.lengthRatio ?? 0) > .98, "same anatomical path retains length in frame coordinates");

const shifted = pathFor(1.7, 31, 17, .18).map((point, index) => index === 4 ? { ...point, x: point.x + .12 } : point);
const changed = comparePalmPaths(path, frame(1, 0, 0), shifted, frame(1.7, 31, 17, .18));
assert.equal(changed.valid, true);
assert.ok((changed.meanDistance ?? 0) > (same.meanDistance ?? 1) * 3, "a path shape change is visible in the comparison metric");

assert.equal(comparePalmPaths(path.slice(0, 3), frame(1, 0, 0), path, frame(1, 0, 0)).reason, "missing_path");
assert.equal(comparePalmPaths(path, { ...frame(1, 0, 0), landmarks: [] }, path, frame(1, 0, 0)).reason, "invalid_frame");
console.log("PASS palm path stability: common anatomical frame, reversed traversal, crop transform, and shape change");
