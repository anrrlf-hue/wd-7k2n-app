/**
 * Backend-neutral prototype for evaluating a ridge response map.
 *
 * It uses only hand landmarks, response values, and 8-connected pixels. It
 * never joins gaps and never assigns a palm-line name. The fixed geometry is
 * deliberately broad: it excludes fingertips/background without being drawn
 * around a hand-written trace.
 */

export interface LandmarkPoint { x: number; y: number }
export interface RidgeMap { width: number; height: number; response: Float32Array; winningScale?: Float32Array }
export type RidgeCandidateKind = "thumb_side_curve" | "transverse_fold"
export interface RidgeCandidate {
  kind: RidgeCandidateKind;
  status: "candidate" | "insufficient_evidence";
  componentSize: number;
  responseMean: number;
  density: number;
  alongSpan: number;
  acrossSpan: number;
  occupiedBins: number;
  binCount: number;
  maximumEmptyBinRun: number;
  directionTurnMaxDeg: number;
  points: LandmarkPoint[];
}
export interface LandmarkRidgeAnalysis {
  status: "ok" | "invalid_input";
  roiMask: Uint8Array;
  responseMask: Uint8Array;
  candidates: RidgeCandidate[];
  thresholds: { response: number; minDensity: number; maxDensity: number };
  reason?: "invalid_map" | "invalid_landmarks";
}

// Fixed for diagnostic comparability; no per-photo tuning is allowed.
const RESPONSE_THRESHOLD = 0.65;
const MIN_DENSITY = 0.004;
const MAX_DENSITY = 0.55;
const MAX_ROI_FRACTION = 0.35;
const ROI_ALONG_MIN = 0.18;
const ROI_ALONG_MAX = 0.88;
const ROI_ACROSS_MIN = -0.72;
const ROI_ACROSS_MAX = 0.72;
const BIN_COUNT = 8;

interface Frame { ux: number; uy: number; nx: number; ny: number; length: number; width: number; side: number }
function frame(p: LandmarkPoint[]): Frame | null {
  const axisX = p[9].x - p[0].x, axisY = p[9].y - p[0].y;
  const length = Math.hypot(axisX, axisY), width = Math.hypot(p[5].x - p[17].x, p[5].y - p[17].y);
  if (length < 2 || width < 2) return null;
  const cross = axisX * (p[2].y - p[0].y) - axisY * (p[2].x - p[0].x);
  return { ux: axisX / length, uy: axisY / length, nx: -axisY / length, ny: axisX / length, length, width, side: cross >= 0 ? 1 : -1 };
}
function coordinates(x: number, y: number, p: LandmarkPoint[], f: Frame) {
  const rx = x - p[0].x, ry = y - p[0].y;
  return { along: (rx * f.ux + ry * f.uy) / f.length, across: f.side * (rx * f.nx + ry * f.ny) / f.width };
}
function finitePoints(p: LandmarkPoint[]): boolean { return p.length === 21 && p.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)); }
function empty(width: number, height: number): LandmarkRidgeAnalysis {
  return { status: "invalid_input", roiMask: new Uint8Array(width * height), responseMask: new Uint8Array(width * height), candidates: [], thresholds: { response: RESPONSE_THRESHOLD, minDensity: MIN_DENSITY, maxDensity: MAX_DENSITY } };
}
function addComponent(mask: Uint8Array, seen: Uint8Array, width: number, height: number, start: number): number[] {
  const points: number[] = [start]; seen[start] = 1;
  for (let cursor = 0; cursor < points.length; cursor++) {
    const index = points[cursor], x = index % width, y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= width || yy < 0 || yy >= height) continue;
      const next = yy * width + xx;
      if (mask[next] && !seen[next]) { seen[next] = 1; points.push(next); }
    }
  }
  return points;
}
function maxEmptyRun(occupied: boolean[]): number {
  let best = 0, current = 0;
  for (const value of occupied) { current = value ? 0 : current + 1; best = Math.max(best, current); }
  return best;
}
function turnMax(centroids: LandmarkPoint[]): number {
  let maximum = 0;
  for (let i = 2; i < centroids.length; i++) {
    const a = Math.atan2(centroids[i - 1].y - centroids[i - 2].y, centroids[i - 1].x - centroids[i - 2].x);
    const b = Math.atan2(centroids[i].y - centroids[i - 1].y, centroids[i].x - centroids[i - 1].x);
    const degrees = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)) * 180 / Math.PI);
    maximum = Math.max(maximum, degrees);
  }
  return maximum;
}

export function analyzeLandmarkRidgeMap(map: RidgeMap, landmarks: LandmarkPoint[]): LandmarkRidgeAnalysis {
  if (!map || !Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width <= 0 || map.height <= 0 || map.response.length !== map.width * map.height) {
    const result = empty(map?.width ?? 0, map?.height ?? 0); result.reason = "invalid_map"; return result;
  }
  if (!finitePoints(landmarks)) { const result = empty(map.width, map.height); result.reason = "invalid_landmarks"; return result; }
  const f = frame(landmarks);
  if (!f) { const result = empty(map.width, map.height); result.reason = "invalid_landmarks"; return result; }
  const roiMask = new Uint8Array(map.response.length), responseMask = new Uint8Array(map.response.length);
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const c = coordinates(x, y, landmarks, f), index = y * map.width + x;
    if (c.along >= ROI_ALONG_MIN && c.along <= ROI_ALONG_MAX && c.across >= ROI_ACROSS_MIN && c.across <= ROI_ACROSS_MAX) {
      roiMask[index] = 1;
      if (Number.isFinite(map.response[index]) && map.response[index] >= RESPONSE_THRESHOLD) responseMask[index] = 1;
    }
  }
  const seen = new Uint8Array(responseMask.length), candidates: RidgeCandidate[] = [];
  for (let index = 0; index < responseMask.length; index++) {
    if (!responseMask[index] || seen[index]) continue;
    const component = addComponent(responseMask, seen, map.width, map.height, index);
    const pixels = component.map(value => ({ x: value % map.width, y: Math.floor(value / map.width) }));
    const minX = pixels.reduce((value, point) => Math.min(value, point.x), Infinity), maxX = pixels.reduce((value, point) => Math.max(value, point.x), -Infinity);
    const minY = pixels.reduce((value, point) => Math.min(value, point.y), Infinity), maxY = pixels.reduce((value, point) => Math.max(value, point.y), -Infinity);
    const density = component.length / ((maxX - minX + 1) * (maxY - minY + 1));
    const mapped = pixels.map(point => coordinates(point.x, point.y, landmarks, f));
    const alongMin = mapped.reduce((value, point) => Math.min(value, point.along), Infinity), alongMax = mapped.reduce((value, point) => Math.max(value, point.along), -Infinity);
    const acrossMin = mapped.reduce((value, point) => Math.min(value, point.across), Infinity), acrossMax = mapped.reduce((value, point) => Math.max(value, point.across), -Infinity);
    const alongSpan = alongMax - alongMin, acrossSpan = acrossMax - acrossMin;
    const occupied = Array.from({ length: BIN_COUNT }, () => false), bins = Array.from({ length: BIN_COUNT }, () => [] as LandmarkPoint[]);
    for (let pointIndex = 0; pointIndex < mapped.length; pointIndex++) {
      const point = mapped[pointIndex];
      const rawBin = Math.floor((point.along - alongMin) / Math.max(1e-9, alongSpan) * BIN_COUNT);
      const bin = Number.isFinite(rawBin) ? Math.max(0, Math.min(BIN_COUNT - 1, rawBin)) : 0;
      occupied[bin] = true;
      bins[bin].push(pixels[pointIndex]);
    }
    const centroids = bins.filter(bin => bin.length).map(bin => ({ x: bin.reduce((sum, point) => sum + point.x, 0) / bin.length, y: bin.reduce((sum, point) => sum + point.y, 0) / bin.length }));
    const responseMean = component.reduce((sum, value) => sum + map.response[value], 0) / component.length;
    const base = { componentSize: component.length, responseMean, density, alongSpan, acrossSpan, occupiedBins: occupied.filter(Boolean).length, binCount: BIN_COUNT, maximumEmptyBinRun: maxEmptyRun(occupied), directionTurnMaxDeg: turnMax(centroids), points: pixels };
    const curveLike = alongSpan >= 0.28 && acrossSpan >= 0.15;
    const transverseLike = acrossSpan >= 0.30 && alongSpan <= 0.24;
    const roiFraction = component.length / Math.max(1, roiMask.reduce((sum, value) => sum + value, 0));
    const structurallyUsable = density >= MIN_DENSITY && density <= MAX_DENSITY && roiFraction <= MAX_ROI_FRACTION && base.occupiedBins >= 6 && base.maximumEmptyBinRun <= 1 && base.directionTurnMaxDeg <= 100;
    if (curveLike) candidates.push({ kind: "thumb_side_curve", status: structurallyUsable ? "candidate" : "insufficient_evidence", ...base });
    if (transverseLike) candidates.push({ kind: "transverse_fold", status: structurallyUsable ? "candidate" : "insufficient_evidence", ...base });
  }
  return { status: "ok", roiMask, responseMask, candidates: candidates.sort((a, b) => b.responseMean - a.responseMean), thresholds: { response: RESPONSE_THRESHOLD, minDensity: MIN_DENSITY, maxDensity: MAX_DENSITY } };
}
