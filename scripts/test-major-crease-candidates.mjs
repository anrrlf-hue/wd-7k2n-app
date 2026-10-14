// Synthetic-only regression for the diagnostic pixel-path tracker.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
const { trackMajorCreaseCandidates, traceForegroundSegments, traceForegroundSegmentsWithBudget } = await import("../src/lib/prototypes/major-crease-candidates.ts");

const width = 160, height = 160;
function image(background = 210) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([background, background, background, 255], i * 4);
  return { width, height, data };
}
function dot(im, x, y, value = 55, radius = 2) {
  for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy++) for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx++) {
    if ((xx - x) ** 2 + (yy - y) ** 2 > radius ** 2) continue;
    const i = (yy * width + xx) * 4; im.data[i] = value; im.data[i + 1] = value; im.data[i + 2] = value;
  }
}
function stroke(im, points, value = 55, radius = 2) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i], length = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let step = 0; step <= length; step++) dot(im, Math.round(x0 + (x1 - x0) * step / Math.max(1, length)), Math.round(y0 + (y1 - y0) * step / Math.max(1, length)), value, radius);
  }
}
function landmarks(mirror = false) {
  const p = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  p[0] = { x: 80, y: 145 }; p[1] = { x: 54, y: 112 }; p[2] = { x: 42, y: 92 }; p[5] = { x: 42, y: 45 }; p[9] = { x: 80, y: 45 }; p[17] = { x: 118, y: 45 };
  return mirror ? p.map(point => ({ x: width - point.x, y: point.y })) : p;
}
function curve(mirror = false) {
  const source = [[42, 58], [41, 78], [40, 98], [44, 118], [54, 134], [76, 144]];
  return source.map(([x, y]) => [mirror ? width - x : x, y]);
}
function track(imageValue, mirror = false, seeds = []) {
  return trackMajorCreaseCandidates(imageValue, landmarks(mirror), seeds);
}
function pathPoints(candidate) {
  return candidate.segments.flatMap(segment => segment.points);
}
function assertForegroundPath(result, sourceImage, expectedMinCoverage, label) {
  const candidate = result.candidate;
  assert.ok(candidate && candidate.status === "candidate", `${label} is a candidate`);
  const points = pathPoints(candidate);
  assert.ok(points.length > 10, `${label} has a substantial path`);
  let covered = 0, expected = 0;
  const foreground = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (sourceImage.data[(y * width + x) * 4] < 180) {
    foreground.push({ x, y });
    expected++;
    const distance = Math.min(...points.map(point => Math.hypot(point.x - x, point.y - y)));
    if (distance <= 2) covered++;
  }
  assert.ok(covered / expected >= expectedMinCoverage, `${label} restores visible foreground coverage`);
  assert.ok(points.every(point => Math.min(...foreground.map(pixel => Math.hypot(point.x - pixel.x, point.y - pixel.y))) <= 2), `${label} does not drift outside the visible crease`);
  for (const segment of candidate.segments) for (let i = 1; i < segment.points.length; i++) {
    assert.ok(Math.max(Math.abs(segment.points[i].x - segment.points[i - 1].x), Math.abs(segment.points[i].y - segment.points[i - 1].y)) <= 1, `${label} path stays 8-neighbor continuous`);
  }
}

const curved = image(); stroke(curved, curve(), 45, 1);
const curvedResult = track(curved, false, [{ x: 130, y: 30, classIndex: 3 }]);
assert.equal(curvedResult.status, "ok");
assert.ok(curvedResult.candidate && curvedResult.candidate.status === "candidate", "visible curve becomes a candidate");
assertForegroundPath(curvedResult, curved, .7, "complete curve");
assert.equal(curvedResult.candidate.rawSupport.modelSeedSupport, 0, "false model seed does not force support");

const mirrored = image(); stroke(mirrored, curve(true), 45, 1);
const mirroredResult = track(mirrored, true);
assert.equal(mirroredResult.candidate?.status, "candidate", "left/right mirror remains detectable");
assert.equal(curvedResult.candidate?.direction.thumbSide, "left", "crop-left thumb-side metadata is correct");
assert.equal(mirroredResult.candidate?.direction.thumbSide, "right", "mirror updates crop-side metadata");

const thickCurved = image(); stroke(thickCurved, curve(), 45, 2);
const thickMask = new Uint8Array(width * height);
for (let i = 0; i < width * height; i++) if (thickCurved.data[i * 4] < 180) thickMask[i] = 1;
const thickSegments = traceForegroundSegments(thickMask, width, height);
assert.ok(thickSegments.length, "thick curve retains observed maximal segments");
assert.ok(thickSegments.some(segment => segment.status === "ambiguous" || segment.points.length > 10), "thick curve is preserved without forced semantics");
assert.ok(thickSegments.every(segment => segment.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)) && segment.supportPoints.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))), "thick mask path/support coordinates are finite");
const filled = new Uint8Array(width * height);
for (let y = 60; y < 100; y++) for (let x = 50; x < 55; x++) filled[y * width + x] = 1;
const filledSegments = traceForegroundSegments(filled, width, height);
assert.ok(filledSegments.length && filledSegments.some(segment => segment.supportPoints.length >= 180), "filled rectangle preserves raw support and a centerline segment");
const manyComponents = new Uint8Array(512 * 512);
for (let y = 10; y < 500; y += 20) for (let x = 10; x < 500; x += 20) for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) manyComponents[(y + yy) * 512 + x + xx] = 1;
assert.equal(traceForegroundSegmentsWithBudget(manyComponents, 512, 512).truncatedReason, "component_limit", "18px+ component limit is explicit");
const edge = image(); stroke(edge, [[0, 58], [0, 92], [10, 120], [28, 144]], 45, 3);
const edgeMask = new Uint8Array(width * height);
for (let i = 0; i < width * height; i++) if (edge.data[i * 4] < 180) edgeMask[i] = 1;
assert.ok(traceForegroundSegments(edgeMask, width, height).length, "bbox-padded thinning retains a boundary curve");
const thickCurvedResult = track(thickCurved);
assert.ok(thickCurvedResult.candidate?.segments.every(segment => segment.supportPoints.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))), "end-to-end thick curve keeps finite support coordinates");

const bridge = image();
stroke(bridge, [[30, 92], [55, 92]], 45, 4);
stroke(bridge, [[105, 92], [130, 92]], 45, 4);
stroke(bridge, [[55, 92], [105, 92]], 45, 0); // one-pixel W/E bridge
const bridgeMask = new Uint8Array(width * height);
for (let i = 0; i < width * height; i++) if (bridge.data[i * 4] < 180) bridgeMask[i] = 1;
const bridgeSegments = traceForegroundSegments(bridgeMask, width, height);
assert.ok(bridgeSegments.some(segment => segment.points.some(point => point.y === 92 && point.x > 58 && point.x < 102)), "one-pixel bridge remains foreground-connected after thinning");

const broken = image(); stroke(broken, [[42, 58], [31, 72], [27, 84]], 45, 0); stroke(broken, [[34, 105], [50, 130], [76, 144]], 45, 0);
const brokenResult = track(broken);
assert.ok(brokenResult.candidate && brokenResult.candidate.status === "candidate", "visible broken path remains a candidate");
assert.ok((brokenResult.candidate?.segments.length ?? 0) >= 2, "broken path remains separate segments");
assert.ok((brokenResult.candidate?.gaps.length ?? 0) >= 1, "gap is reported instead of connected");
assert.ok((brokenResult.candidate?.gaps.some(gap => gap.pixelDistancePx > 4) ?? false), "broken gap is not bridged");
assert.ok(brokenResult.candidate?.gaps.every(gap => gap.relation === "unknown"), "separate components are not declared one crease");
assertForegroundPath(brokenResult, broken, .65, "broken curve");

const dim = image(185); stroke(dim, curve(), 120, 0);
const dimResult = track(dim);
assert.equal(dimResult.candidate?.status, "candidate", "local contrast survives brightness change");

const absent = track(image());
assert.ok(!absent.candidate || absent.candidate.status !== "candidate", "no crease does not become a candidate");
const step = image();
for (let y = 0; y < height; y++) for (let x = 0; x <= 45; x++) {
  const i = (y * width + x) * 4; step.data[i] = step.data[i + 1] = step.data[i + 2] = 55;
}
assert.notEqual(track(step).candidate?.status, "candidate", "single shadow edge is rejected without two-sided valley support");
const shading = image();
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const value = 120 + Math.round(x / width * 80), i = (y * width + x) * 4;
  shading.data[i] = shading.data[i + 1] = shading.data[i + 2] = value;
}
assert.notEqual(track(shading).candidate?.status, "candidate", "smooth shading is not a crease");
const texture = image();
for (let y = 40; y < 145; y += 7) for (let x = 25 + (y % 11); x < 135; x += 13) dot(texture, x, y, 80, 1);
assert.notEqual(track(texture).candidate?.status, "candidate", "sparse texture is not a connected crease");
const largeWidth = 512, largeHeight = 512, largeData = new Uint8ClampedArray(largeWidth * largeHeight * 4);
for (let i = 0; i < largeWidth * largeHeight; i++) largeData.set([205, 205, 205, 255], i * 4);
for (let x = 5; x < 505; x += 5) for (let y = 20; y < 480; y++) for (let xx = 0; xx < 2; xx++) {
  const i = (y * largeWidth + x + xx) * 4; largeData[i] = largeData[i + 1] = largeData[i + 2] = 70;
}
const largeLandmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
largeLandmarks[0] = { x: 256, y: 460 }; largeLandmarks[1] = { x: 80, y: 350 }; largeLandmarks[2] = { x: 40, y: 290 }; largeLandmarks[5] = { x: 10, y: 145 }; largeLandmarks[9] = { x: 256, y: 145 }; largeLandmarks[17] = { x: 502, y: 145 };
const largeResult = trackMajorCreaseCandidates({ width: largeWidth, height: largeHeight, data: largeData }, largeLandmarks);
assert.ok(["ok", "truncated"].includes(largeResult.status), "many texture components terminate normally");
const seedOverflow = track(curved, false, Array.from({ length: 1025 }, (_, i) => ({ x: i % width, y: Math.floor(i / width) })));
assert.equal(seedOverflow.status, "truncated", "seed count limit is explicit");
assert.equal(seedOverflow.candidate?.truncated, true, "seed truncation is explicit");
console.log("PASS major crease candidates: foreground paths, mirror, gaps, false seed, brightness, and no-line guard");
