import assert from "node:assert/strict";
import "./register-test-typescript.mjs";

const { rankConnectedCreasePaths } = await import("../src/lib/prototypes/connected-crease-paths.ts");

const evidence = new Map();
const addEvidence = (points, valleyResponse = 12, probeAngleDeg = 90) => points.forEach(point => evidence.set(`${point.x},${point.y}`, { valleyResponse, probeAngleDeg }));
const segments = [
  { componentId: 0, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], pathLengthPx: 2, supportPixelCount: 3, responseMean: 12, status: "measurable" },
  { componentId: 0, points: [{ x: 2, y: 0 }, { x: 3, y: 1 }, { x: 4, y: 2 }], pathLengthPx: 2.8, supportPixelCount: 3, responseMean: 11, status: "measurable" },
  { componentId: 0, points: [{ x: 2, y: 0 }, { x: 3, y: -1 }, { x: 4, y: -2 }], pathLengthPx: 2.8, supportPixelCount: 3, responseMean: 10.9, status: "measurable" },
  // Same-looking endpoint, different component: must never connect.
  { componentId: 1, points: [{ x: 4, y: 2 }, { x: 5, y: 2 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
];
segments.forEach(segment => addEvidence(segment.points));
const result = rankConnectedCreasePaths(segments, [], evidence, { thumbRegion: { xMin: 0, xMax: 1, yMin: -1, yMax: 1 } }, { used: 0, limit: 8192 });
assert.ok(result.pathCandidates.length >= 2, "Y junction keeps competing connected paths");
assert.ok(result.pathCandidates.some(candidate => candidate.ambiguous), "similar Y branches remain ambiguous");
assert.ok(result.pathCandidates.every(candidate => candidate.orientedSegmentRefs.every(ref => ref.segmentIndex !== 3)), "different component is never connected");
assert.ok(result.pathCandidates.every(candidate => candidate.orderedPoints.every((point, index, points) => index === 0 || Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) <= Math.SQRT2)), "ordered path remains pixel-adjacent");
assert.ok(result.pathCandidates.every(candidate => candidate.orderedPoints.every(point => (evidence.get(`${point.x},${point.y}`)?.valleyResponse ?? 0) > 0)), "selected ordered path has pixel-level ridge support");
assert.ok(result.pathCandidates.every(candidate => candidate.actualSupportLengthPx <= 6), "junction search does not inflate length");
assert.ok(result.pathCandidates.some(candidate => candidate.terminationReason === "terminal"), "open paths end as terminal rather than loop");
assert.ok(result.pathCandidates.every(candidate => candidate.orientedSegmentRefs.length > 1), "termination prefix is evaluated but not reported as an independent competing path");

const reversible = rankConnectedCreasePaths([segments[0]], [], evidence, {}, { used: 0, limit: 8192 });
assert.equal(reversible.pathCandidates.length, 1, "forward/reverse views of one segment collapse to one canonical path");

const tangentEvidence = new Map();
const tangentSegments = [
  // The first two pixels point down, but the final arc-length interval enters
  // the junction at -45 degrees. The -45 branch must therefore win.
  { componentId: 3, points: [{ x: 30, y: 30 }, { x: 30, y: 31 }, { x: 31, y: 31 }, { x: 32, y: 30 }], pathLengthPx: 3.4, supportPixelCount: 4, responseMean: 12, status: "measurable" },
  { componentId: 3, points: [{ x: 32, y: 30 }, { x: 33, y: 29 }, { x: 34, y: 28 }], pathLengthPx: 2.8, supportPixelCount: 3, responseMean: 12, status: "measurable" },
  { componentId: 3, points: [{ x: 32, y: 30 }, { x: 33, y: 31 }, { x: 34, y: 32 }], pathLengthPx: 2.8, supportPixelCount: 3, responseMean: 12, status: "measurable" },
];
tangentSegments.forEach(segment => segment.points.forEach(point => tangentEvidence.set(`${point.x},${point.y}`, { valleyResponse: 12, probeAngleDeg: 45 })));
const tangentResult = rankConnectedCreasePaths(tangentSegments, [], tangentEvidence, {}, { used: 0, limit: 8192 });
const tangentBest = tangentResult.pathCandidates[0];
assert.ok(tangentBest?.orientedSegmentRefs.some(ref => ref.segmentIndex === 1), "junction ranking uses the incoming tangent at the actual segment end");
assert.ok(!tangentBest?.orientedSegmentRefs.some(ref => ref.segmentIndex === 2), "wrong branch is rejected by end tangent continuity");

const loopSegments = [
  { componentId: 2, points: [{ x: 10, y: 10 }, { x: 11, y: 10 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
  { componentId: 2, points: [{ x: 11, y: 10 }, { x: 11, y: 11 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
  { componentId: 2, points: [{ x: 11, y: 11 }, { x: 10, y: 11 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
  { componentId: 2, points: [{ x: 10, y: 11 }, { x: 10, y: 10 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
];
loopSegments.forEach(segment => addEvidence(segment.points));
const loopResult = rankConnectedCreasePaths(loopSegments, [], evidence, {}, { used: 0, limit: 8192 });
assert.ok(loopResult.pathCandidates.every(candidate => candidate.actualSupportLengthPx <= 4), "loop revisit does not inflate path length");
const selfLoop = [{ componentId: 9, points: [{ x: 40, y: 40 }, { x: 41, y: 40 }, { x: 40, y: 40 }], pathLengthPx: 2, supportPixelCount: 3, responseMean: 12, status: "ambiguous" }];
assert.equal(rankConnectedCreasePaths(selfLoop, [], evidence, {}, { used: 0, limit: 8192 }).pathCandidates.length, 0, "self-loop observation is not promoted as a start path");

const truncated = rankConnectedCreasePaths(segments, [], evidence, {}, { used: 0, limit: 1 });
assert.equal(truncated.searchTruncated, true, "small budget is explicitly reported");
assert.ok(truncated.budget.used <= 1, "global budget is not exceeded across starts");
assert.ok(truncated.pathCandidates.every(candidate => candidate.searchTruncated || candidate.terminationReason === "terminal"), "budget termination is preserved on candidates");

console.log("PASS connected crease path ranking: exact junctions, component isolation, Y ambiguity, bounded search, ordered support paths");
