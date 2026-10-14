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
assert.ok(result.pathCandidates.every(candidate => candidate.actualSupportLengthPx <= 5), "junction search does not inflate length");

const loopSegments = [
  { componentId: 2, points: [{ x: 10, y: 10 }, { x: 11, y: 10 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
  { componentId: 2, points: [{ x: 11, y: 10 }, { x: 11, y: 11 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
  { componentId: 2, points: [{ x: 11, y: 11 }, { x: 10, y: 11 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
  { componentId: 2, points: [{ x: 10, y: 11 }, { x: 10, y: 10 }], pathLengthPx: 1, supportPixelCount: 2, responseMean: 12, status: "measurable" },
];
loopSegments.forEach(segment => addEvidence(segment.points));
const loopResult = rankConnectedCreasePaths(loopSegments, [], evidence, {}, { used: 0, limit: 8192 });
assert.ok(loopResult.pathCandidates.every(candidate => candidate.actualSupportLengthPx <= 4), "loop revisit does not inflate path length");

const truncated = rankConnectedCreasePaths(segments, [], evidence, {}, { used: 0, limit: 1 });
assert.equal(truncated.searchTruncated, true, "small budget is explicitly reported");
assert.ok(truncated.pathCandidates.every(candidate => candidate.searchTruncated || candidate.terminationReason === "terminal"), "budget termination is preserved on candidates");

console.log("PASS connected crease path ranking: exact junctions, component isolation, Y ambiguity, bounded search, ordered support paths");
