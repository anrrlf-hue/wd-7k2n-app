/**
 * Pixel-only major-crease candidate tracker.
 *
 * This module is intentionally diagnostic-only. It does not rename a model
 * class, claim an anatomical life line, or connect across unsupported gaps.
 * Every returned point is a pixel in the supplied aligned image.
 */
import { rankConnectedCreasePaths, type ConnectedPathCandidate } from "@/lib/prototypes/connected-crease-paths";

export interface MajorCreasePixelPoint { x: number; y: number }
export interface MajorCreaseLandmarks { x: number; y: number }
export interface MajorCreaseModelSeed { x: number; y: number; classIndex?: number }

export interface MajorCreaseSegment {
  componentId: number;
  points: MajorCreasePixelPoint[];
  pathLengthPx: number;
  supportPixelCount: number;
  responseMean: number;
  status: "measurable" | "ambiguous";
}
export interface MajorCreaseComponent {
  componentId: number;
  supportPoints: MajorCreasePixelPoint[];
  pixelCount: number;
  responseMean: number;
}

export interface MajorCreaseNmsOptions {
  enabled?: boolean;
  /** Distance between the center and the two fixed-probe NMS samples, in image pixels. */
  neighborDistancePx?: number;
}

export interface MajorCreaseNmsDiagnostics {
  enabled: boolean;
  neighborDistancePx: number;
  probeOffsetsPx: number[];
  originalForegroundMask: Uint8Array;
  ridgeCoreMask: Uint8Array;
  ambiguousMask: Uint8Array;
  removedMask: Uint8Array;
  removedReasonCounts: {
    nmsSuppressed: number;
    directionConflict: number;
    invalidDirection: number;
    invalidEvaluation: number;
    truncated: number;
  };
  finiteComparisonCount: number;
  truncated: boolean;
}

export interface MajorCreaseCandidate {
  status: "candidate" | "insufficient_evidence" | "not_seen";
  coordinateSpace: "aligned-image-px";
  imageSize: { width: number; height: number };
  points: MajorCreasePixelPoint[];
  components: MajorCreaseComponent[];
  segments: MajorCreaseSegment[];
  rawSupport: {
    pixelCount: number;
    responseMean: number;
    threshold: number;
    coverage: number;
    modelSeedSupport: number;
  };
  gaps: Array<{ afterSegment: number; pixelDistancePx: number; relation: "unknown" }>;
  competingCandidates: Array<{ supportPixelCount: number; responseMean: number; points: MajorCreasePixelPoint[] }>;
  direction: { axisAngleDeg: number; thumbSide: "left" | "right" };
  probe: { normalAngleDeg: number; offsetPx: number; directionCount: number; offsetCount: number } | null;
  truncated: boolean;
  truncatedReason?: "work_limit" | "component_limit" | "thinning_limit" | "seed_limit";
  /** Diagnostic-only connected paths; `points` above remains the legacy path. */
  pathCandidates?: ConnectedPathCandidate[];
  pathSearch?: { searchTruncated: boolean; budget: { used: number; limit: number }; truncatedReason?: "budget" };
  /** Diagnostic-only NMS masks; absent unless explicitly enabled. */
  nms?: MajorCreaseNmsDiagnostics;
}

export interface MajorCreaseTrackResult {
  status: "ok" | "invalid_input" | "work_limit" | "truncated" | "runtime";
  width: number;
  height: number;
  elapsedMs: number;
  candidate: MajorCreaseCandidate | null;
  errorCode?: "invalid_image" | "invalid_landmarks" | "work_limit" | "runtime";
  budget?: { used: number; limit: number; reason?: "work_limit" | "component_limit" | "thinning_limit" | "seed_limit" };
}

const MAX_IMAGE_PIXELS = 6_000_000;
const MAX_IMAGE_DIMENSION = 3_000;
const MAX_WORK_UNITS = 30_000_000;
const MIN_COMPONENT_PIXELS = 18;
const MAX_COMPONENTS = 96;
const MAX_THINNING_ITERATIONS = 24;
const MAX_MODEL_SEEDS = 1024;
interface WorkBudget { used: number; max: number; truncatedReason?: "work_limit" | "component_limit" | "thinning_limit" | "seed_limit"; }
function consume(budget: WorkBudget, units = 1): boolean { budget.used += units; if (budget.used > budget.max) budget.truncatedReason ??= "work_limit"; return budget.used <= budget.max; }

function gray(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const p = i * 4;
    out[i] = .299 * data[p] + .587 * data[p + 1] + .114 * data[p + 2];
  }
  return out;
}

function blur(input: Float32Array, width: number, height: number, radius: number): Float32Array {
  const horizontal = new Float32Array(input.length), out = new Float32Array(input.length);
  const row = new Float64Array(width + 1);
  for (let y = 0; y < height; y++) {
    row[0] = 0;
    for (let x = 0; x < width; x++) row[x + 1] = row[x] + input[y * width + x];
    for (let x = 0; x < width; x++) {
      const lo = Math.max(0, x - radius), hi = Math.min(width - 1, x + radius);
      horizontal[y * width + x] = (row[hi + 1] - row[lo]) / (hi - lo + 1);
    }
  }
  const column = new Float64Array(height + 1);
  for (let x = 0; x < width; x++) {
    column[0] = 0;
    for (let y = 0; y < height; y++) column[y + 1] = column[y] + horizontal[y * width + x];
    for (let y = 0; y < height; y++) {
      const lo = Math.max(0, y - radius), hi = Math.min(height - 1, y + radius);
      out[y * width + x] = (column[hi + 1] - column[lo]) / (hi - lo + 1);
    }
  }
  return out;
}

function pathLength(points: MajorCreasePixelPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}

function emptyCandidate(width: number, height: number, axisAngleDeg: number, thumbSide: "left" | "right"): MajorCreaseCandidate {
  return { status: "not_seen", coordinateSpace: "aligned-image-px", imageSize: { width, height }, points: [], components: [], segments: [], rawSupport: { pixelCount: 0, responseMean: 0, threshold: 0, coverage: 0, modelSeedSupport: 0 }, gaps: [], competingCandidates: [], direction: { axisAngleDeg, thumbSide }, probe: null, truncated: false };
}

function traceSkeleton(component: number[], response: Float32Array, width: number, height: number, budget: WorkBudget, componentId: number): MajorCreaseSegment[] {
  const componentMinX = Math.min(...component.map(index => index % width)), componentMaxX = Math.max(...component.map(index => index % width));
  const componentMinY = Math.min(...component.map(index => Math.floor(index / width))), componentMaxY = Math.max(...component.map(index => Math.floor(index / width)));
  const minX = Math.max(0, componentMinX - 1), maxX = Math.min(width - 1, componentMaxX + 1);
  const minY = Math.max(0, componentMinY - 1), maxY = Math.min(height - 1, componentMaxY + 1);
  const localWidth = maxX - minX + 1, localHeight = maxY - minY + 1;
  const binary = new Uint8Array(localWidth * localHeight);
  for (const index of component) { if (!consume(budget)) return []; binary[(Math.floor(index / width) - minY) * localWidth + index % width - minX] = 1; }
  const bounds = component.map(index => ({ x: index % width, y: Math.floor(index / width) }));
  const componentWidth = Math.max(...bounds.map(point => point.x)) - Math.min(...bounds.map(point => point.x)) + 1;
  const componentHeight = Math.max(...bounds.map(point => point.y)) - Math.min(...bounds.map(point => point.y)) + 1;
  const alreadyThin = componentWidth <= 2 || componentHeight <= 2 || component.length / (componentWidth * componentHeight) < .2;
  const adjacent = (x: number, y: number) => {
    const at = (dx: number, dy: number) => x + dx < 0 || x + dx >= localWidth || y + dy < 0 || y + dy >= localHeight ? 0 : binary[(y + dy) * localWidth + x + dx];
    // Zhang-Suen order: N, NE, E, SE, S, SW, W, NW.
    return [at(0, -1), at(1, -1), at(1, 0), at(1, 1), at(0, 1), at(-1, 1), at(-1, 0), at(-1, -1)];
  };
  const transitions = (values: number[]) => values.reduce((sum, value, i) => sum + (value === 0 && values[(i + 1) % values.length] === 1 ? 1 : 0), 0);
  let changed = true, thinningIterations = 0;
  while (changed) {
    if (++thinningIterations > MAX_THINNING_ITERATIONS) { budget.truncatedReason ??= "thinning_limit"; return []; }
    if (!consume(budget, localWidth * localHeight)) return [];
    changed = false;
    for (const phase of [0, 1]) {
      const remove: number[] = [];
      for (let y = 1; y < localHeight - 1; y++) for (let x = 1; x < localWidth - 1; x++) {
        if (!binary[y * localWidth + x]) continue;
        const values = adjacent(x, y), count = values.reduce((sum, value) => sum + value, 0);
        if (alreadyThin && count === 2 || count < 2 || count > 6 || transitions(values) !== 1) continue;
        const [p2, , p4, , p6, , p8] = values;
        if (phase === 0 ? p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0 : p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue;
        remove.push(y * localWidth + x);
      }
      for (const index of remove) binary[index] = 0;
      if (remove.length) changed = true;
    }
  }
  const neighbours = (index: number) => {
    const y = Math.floor(index / localWidth), x = index - y * localWidth, result: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= localWidth || ny < 0 || ny >= localHeight || !binary[ny * localWidth + nx]) continue;
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1 && (binary[y * localWidth + x + dx] || binary[(y + dy) * localWidth + x])) continue;
      result.push(ny * localWidth + nx);
    }
    return result;
  };
  const skeleton = Array.from({ length: localWidth * localHeight }, (_, index) => index).filter(index => binary[index]);
  const nodes = new Set(skeleton.filter(index => neighbours(index).length !== 2));
  const visitedEdges = new Set<string>(), segments: MajorCreaseSegment[] = [];
  const edgeKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
  const addSegment = (path: number[], status: "measurable" | "ambiguous") => {
    if (path.length < 2) return;
    const points = path.map(index => ({ x: index % localWidth + minX, y: Math.floor(index / localWidth) + minY }));
    const responseMean = path.reduce((sum, index) => sum + response[(Math.floor(index / localWidth) + minY) * width + index % localWidth + minX], 0) / path.length;
    segments.push({ componentId, points, pathLengthPx: pathLength(points), supportPixelCount: component.length, responseMean, status });
  };
  for (const node of nodes) for (const next of neighbours(node)) {
    const firstEdge = edgeKey(node, next);
    if (visitedEdges.has(firstEdge)) continue;
    visitedEdges.add(firstEdge);
    const path = [node, next];
    let previous = node, current = next;
    while (!nodes.has(current)) {
      const nextOptions = neighbours(current).filter(index => index !== previous);
      if (nextOptions.length !== 1) break;
      const following = nextOptions[0];
      visitedEdges.add(edgeKey(current, following));
      path.push(following); previous = current; current = following;
    }
    addSegment(path, "measurable");
  }
  if (!segments.length && skeleton.length > 2) {
    // A loop has no terminal nodes. Preserve an observed foreground walk as
    // ambiguous instead of inventing a start/end or closing a new bridge.
    const path = [skeleton[0]], visited = new Set([skeleton[0]]); let previous = -1, current = skeleton[0];
    for (let count = 0; count < skeleton.length; count++) {
      const next = neighbours(current).find(index => index !== previous && !visited.has(index));
      if (next === undefined) break;
      path.push(next); visited.add(next); previous = current; current = next;
    }
    addSegment(path, "ambiguous");
  }
  if (!segments.length && component.length >= MIN_COMPONENT_PIXELS) {
    // Preserve thick/uncertain foreground evidence even when thinning cannot
    // yield a stable route; this is not promoted to a measurable path.
    segments.push({ componentId, points: [], pathLengthPx: 0, supportPixelCount: component.length, responseMean: component.reduce((sum, index) => sum + response[index], 0) / component.length, status: "ambiguous" });
  }
  return segments;
}

function components(response: Float32Array, foreground: Uint8Array, width: number, height: number, budget: WorkBudget): number[][] {
  const seen = new Uint8Array(foreground.length), output: number[][] = [];
  for (let seed = 0; seed < foreground.length; seed++) {
    if (!consume(budget)) break;
    if (!foreground[seed] || seen[seed]) continue;
    const queue = [seed], component: number[] = []; seen[seed] = 1;
    for (let q = 0; q < queue.length; q++) {
      const index = queue[q]; if (!consume(budget)) return output; component.push(index);
      const y = Math.floor(index / width), x = index - y * width;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (foreground[next] && !seen[next]) { seen[next] = 1; queue.push(next); }
      }
    }
    if (component.length >= MIN_COMPONENT_PIXELS) { output.push(component); if (output.length >= MAX_COMPONENTS) { budget.truncatedReason ??= "component_limit"; break; } }
  }
  return output.sort((a, b) => b.length - a.length);
}

/** Small deterministic hook for geometry regressions; no image semantics. */
export function traceForegroundSegments(foreground: Uint8Array, width: number, height: number): MajorCreaseSegment[] {
  return traceForegroundSegmentsWithBudget(foreground, width, height).segments;
}

export function traceForegroundSegmentsWithBudget(foreground: Uint8Array, width: number, height: number, maxWorkUnits = MAX_WORK_UNITS): { segments: MajorCreaseSegment[]; truncatedReason?: "work_limit" | "component_limit" | "thinning_limit" | "seed_limit" } {
  if (foreground.length !== width * height) return { segments: [] };
  const budget: WorkBudget = { used: 0, max: maxWorkUnits };
  const segments = components(new Float32Array(foreground), foreground, width, height, budget).flatMap((component, componentId) => traceSkeleton(component, new Float32Array(foreground), width, height, budget, componentId));
  return { segments, truncatedReason: budget.truncatedReason };
}

export function trackMajorCreaseCandidates(
  rawAlignedImage: ImageData,
  landmarksInSameCropPx: MajorCreaseLandmarks[],
  optionalModelSeeds: MajorCreaseModelSeed[] = [],
  nmsOptions: MajorCreaseNmsOptions = {},
): MajorCreaseTrackResult {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const width = rawAlignedImage?.width ?? 0, height = rawAlignedImage?.height ?? 0;
  const finish = (result: MajorCreaseTrackResult): MajorCreaseTrackResult => ({ ...result, elapsedMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - started });
  if (!rawAlignedImage || !Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION || width * height > MAX_IMAGE_PIXELS || !(rawAlignedImage.data instanceof Uint8ClampedArray) || rawAlignedImage.data.length !== width * height * 4) return finish({ status: "invalid_input", errorCode: "invalid_image", width, height, elapsedMs: 0, candidate: null });
  if (!Array.isArray(landmarksInSameCropPx) || landmarksInSameCropPx.length !== 21 || landmarksInSameCropPx.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) return finish({ status: "invalid_input", errorCode: "invalid_landmarks", width, height, elapsedMs: 0, candidate: null });
  if (width * height * 8 > MAX_WORK_UNITS) return finish({ status: "work_limit", errorCode: "work_limit", width, height, elapsedMs: 0, candidate: null });
  try {
    const p = landmarksInSameCropPx;
    const axisX = p[9].x - p[0].x, axisY = p[9].y - p[0].y, axisLength = Math.hypot(axisX, axisY);
    const palmWidth = Math.hypot(p[5].x - p[17].x, p[5].y - p[17].y);
    if (axisLength < 2 || palmWidth < 2) return finish({ status: "invalid_input", errorCode: "invalid_landmarks", width, height, elapsedMs: 0, candidate: null });
    const ux = axisX / axisLength, uy = axisY / axisLength;
    const nx = -uy, ny = ux;
    const thumbCross = axisX * (p[2].y - p[0].y) - axisY * (p[2].x - p[0].x);
    // Screen-crop contract: x smaller than the wrist is the crop's left side.
    // This is thumb-side metadata only, not anatomical hand-side detection.
    const thumbSide = thumbCross <= 0 ? "left" : "right";
    const side = thumbCross >= 0 ? 1 : -1;
    const angle = Math.atan2(axisY, axisX) * 180 / Math.PI;
    const source = gray(rawAlignedImage.data, width, height);
    const smoothed = blur(source, width, height, 1), local = blur(source, width, height, Math.max(3, Math.round(Math.min(width, height) * .025)));
    const response = new Float32Array(width * height), valleyResponse = new Float32Array(width * height), bestProbeDirection = new Int16Array(width * height), bestProbeOffset = new Int8Array(width * height), values: number[] = [];
    bestProbeDirection.fill(-1); bestProbeOffset.fill(-1);
    const probeDirections = 12, probeOffsets = [Math.max(2, Math.min(palmWidth * .025, 12)), Math.max(3, Math.min(palmWidth * .05, 20)), Math.max(4, Math.min(palmWidth * .08, 28))];
    const probeBudget: WorkBudget = { used: width * height * 2, max: MAX_WORK_UNITS };
    pixelLoop: for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const rx = x - p[0].x, ry = y - p[0].y;
      const along = rx * ux + ry * uy, across = side * (rx * nx + ry * ny);
      const inCorridor = along >= axisLength * .04 && along <= axisLength * 1.05 && across >= -palmWidth * .12 && across <= palmWidth * .95;
      if (!inCorridor) continue;
      const index = y * width + x;
      // Multiple normal offsets prevent one fixed horizontal probe from
      // deciding the answer; all foreground still comes from raw pixels.
      let directional = 0, chosenDirection = -1, chosenOffset = -1;
      for (let directionIndex = 0; directionIndex < probeDirections; directionIndex++) {
        const radians = Math.atan2(ny, nx) + directionIndex * Math.PI / probeDirections;
        const normalX = Math.cos(radians), normalY = Math.sin(radians);
        for (let offsetIndex = 0; offsetIndex < probeOffsets.length; offsetIndex++) {
          if (!consume(probeBudget)) break pixelLoop;
          const offset = probeOffsets[offsetIndex];
          const px = Math.max(0, Math.min(width - 1, Math.round(x + normalX * offset))), py = Math.max(0, Math.min(height - 1, Math.round(y + normalY * offset)));
          const qx = Math.max(0, Math.min(width - 1, Math.round(x - normalX * offset))), qy = Math.max(0, Math.min(height - 1, Math.round(y - normalY * offset)));
          const valley = Math.min(smoothed[py * width + px], smoothed[qy * width + qx]) - smoothed[index];
          if (valley > directional) { directional = valley; chosenDirection = directionIndex; chosenOffset = offsetIndex; }
        }
      }
      const localContrast = Math.max(0, local[index] - source[index], local[index] - smoothed[index]);
      const v = Math.max(localContrast, directional);
      response[index] = v; valleyResponse[index] = directional; bestProbeDirection[index] = chosenDirection; bestProbeOffset[index] = chosenOffset; if (v > 0) values.push(v);
    }
    if (!values.length) {
      const truncatedReason = probeBudget.truncatedReason;
      const candidate = emptyCandidate(width, height, angle, thumbSide);
      candidate.truncated = Boolean(truncatedReason); candidate.truncatedReason = truncatedReason;
      return finish({ status: truncatedReason ? "truncated" : "ok", width, height, elapsedMs: 0, candidate, budget: { used: probeBudget.used, limit: MAX_WORK_UNITS, reason: truncatedReason } });
    }
    values.sort((a, b) => a - b);
    const threshold = Math.max(3, values[Math.floor(values.length * .82)] * .55);
    const foreground = new Uint8Array(response.length);
    for (let i = 0; i < response.length; i++) if (response[i] >= threshold && valleyResponse[i] >= Math.max(3, threshold * .03)) foreground[i] = 1;
    const probeVotes = new Map<string, number>();
    for (let i = 0; i < foreground.length; i++) if (foreground[i] && bestProbeDirection[i] >= 0) {
      const key = `${bestProbeDirection[i]}:${bestProbeOffset[i]}`;
      probeVotes.set(key, (probeVotes.get(key) ?? 0) + 1);
    }
    const winningProbe = [...probeVotes.entries()].sort((a, b) => b[1] - a[1])[0];
    const probe = winningProbe ? (() => {
      const [directionIndex, offsetIndex] = winningProbe[0].split(":").map(Number);
      const normalAngleDeg = (Math.atan2(ny, nx) + directionIndex * Math.PI / probeDirections) * 180 / Math.PI;
      return { normalAngleDeg, offsetPx: probeOffsets[offsetIndex], directionCount: probeDirections, offsetCount: probeOffsets.length };
    })() : null;
    const budget: WorkBudget = { used: width * height * 2 + probeBudget.used, max: MAX_WORK_UNITS };
    const nmsEnabled = nmsOptions.enabled === true;
    const requestedNeighborDistance = Number.isFinite(nmsOptions.neighborDistancePx) ? nmsOptions.neighborDistancePx! : 2;
    const neighborDistancePx = Math.max(1, Math.round(requestedNeighborDistance));
    let analysisForeground = foreground;
    let nms: MajorCreaseNmsDiagnostics | undefined;
    if (nmsEnabled) {
      const ridgeCoreMask = new Uint8Array(foreground.length);
      const ambiguousMask = new Uint8Array(foreground.length);
      const removedMask = new Uint8Array(foreground.length);
      const removedReasonCounts = { nmsSuppressed: 0, directionConflict: 0, invalidDirection: 0, invalidEvaluation: 0, truncated: 0 };
      let finiteComparisonCount = 0;
      // NMS re-evaluates only the center's winning normal and offset. It does
      // not compare each neighbor's independently winning probe.
      const sampleSmoothed = (x: number, y: number): number | null => {
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > width - 1 || y > height - 1) return null;
        const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
        const tx = x - x0, ty = y - y0;
        const top = smoothed[y0 * width + x0] * (1 - tx) + smoothed[y0 * width + x1] * tx;
        const bottom = smoothed[y1 * width + x0] * (1 - tx) + smoothed[y1 * width + x1] * tx;
        const value = top * (1 - ty) + bottom * ty;
        return Number.isFinite(value) ? value : null;
      };
      const fixedValley = (x: number, y: number, directionIndex: number, offsetIndex: number): number | null => {
        const radians = Math.atan2(ny, nx) + directionIndex * Math.PI / probeDirections;
        const normalX = Math.cos(radians), normalY = Math.sin(radians), offset = probeOffsets[offsetIndex];
        const plus = sampleSmoothed(x + normalX * offset, y + normalY * offset);
        const minus = sampleSmoothed(x - normalX * offset, y - normalY * offset);
        const center = sampleSmoothed(x, y);
        if (plus === null || minus === null || center === null) return null;
        return Math.min(plus, minus) - center;
      };
      const axisDistance = (a: number, b: number) => {
        return Math.abs(Math.atan2(Math.sin(2 * (a - b)), Math.cos(2 * (a - b)))) / 2;
      };
      for (let index = 0; index < foreground.length; index++) {
        if (!foreground[index]) continue;
        if (!consume(budget, 3)) {
          ambiguousMask[index] = 1;
          removedReasonCounts.truncated++;
          continue;
        }
        const directionIndex = bestProbeDirection[index], offsetIndex = bestProbeOffset[index];
        if (directionIndex < 0 || offsetIndex < 0) {
          ambiguousMask[index] = 1;
          removedReasonCounts.invalidDirection++;
          continue;
        }
        const x = index % width, y = Math.floor(index / width);
        const radians = Math.atan2(ny, nx) + directionIndex * Math.PI / probeDirections;
        const neighborX = Math.cos(radians) * neighborDistancePx, neighborY = Math.sin(radians) * neighborDistancePx;
        // The three fixed-probe evaluations (center and two NMS neighbors) are
        // charged above; probeOffsetsPx and neighborDistancePx are distinct
        // image-pixel units.
        const center = fixedValley(x, y, directionIndex, offsetIndex);
        const before = fixedValley(x - neighborX, y - neighborY, directionIndex, offsetIndex);
        const after = fixedValley(x + neighborX, y + neighborY, directionIndex, offsetIndex);
        if (center === null || before === null || after === null || !Number.isFinite(center) || !Number.isFinite(before) || !Number.isFinite(after)) {
          ambiguousMask[index] = 1;
          removedReasonCounts.invalidEvaluation++;
          continue;
        }
        finiteComparisonCount += 3;
        const nearbyDirections: number[] = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nxp = x + dx, nyp = y + dy;
          if (nxp < 0 || nxp >= width || nyp < 0 || nyp >= height) continue;
          const nearby = nyp * width + nxp;
          if (foreground[nearby] && bestProbeDirection[nearby] >= 0) nearbyDirections.push(Math.atan2(ny, nx) + bestProbeDirection[nearby] * Math.PI / probeDirections);
        }
        // 2*angle makes this an unoriented 180-degree axis comparison. It is
        // only a conflict/ambiguity score; it never adds a bridge or curve.
        const coherence = nearbyDirections.length ? nearbyDirections.reduce((sum, angleValue) => sum + Math.cos(2 * axisDistance(angleValue, radians)), 0) / nearbyDirections.length : 1;
        if (coherence < 0.25) {
          ambiguousMask[index] = 1;
          removedReasonCounts.directionConflict++;
        } else if (center >= before && center >= after) {
          ridgeCoreMask[index] = 1;
        } else {
          removedMask[index] = 1;
          removedReasonCounts.nmsSuppressed++;
        }
      }
      analysisForeground = new Uint8Array(foreground.length);
      for (let index = 0; index < analysisForeground.length; index++) if (ridgeCoreMask[index] || ambiguousMask[index]) analysisForeground[index] = 1;
      nms = { enabled: true, neighborDistancePx, probeOffsetsPx: [...probeOffsets], originalForegroundMask: foreground, ridgeCoreMask, ambiguousMask, removedMask, removedReasonCounts, finiteComparisonCount, truncated: Boolean(budget.truncatedReason) };
    }
    const allComponents = components(response, analysisForeground, width, height, budget);
    const tracks = allComponents.flatMap((component, componentId) => traceSkeleton(component, response, width, height, budget, componentId));
    const measurable = tracks.filter(track => track.status === "measurable").sort((a, b) => b.pathLengthPx - a.pathLengthPx);
    const ambiguousComponents = tracks.filter(track => track.status === "ambiguous").map(track => ({ componentId: track.componentId, supportPixelCount: track.supportPixelCount, responseMean: track.responseMean, points: track.points }));
    const componentRecords: MajorCreaseComponent[] = allComponents.map((component, componentId) => ({ componentId, supportPoints: component.map(index => ({ x: index % width, y: Math.floor(index / width) })), pixelCount: component.length, responseMean: component.reduce((sum, index) => sum + response[index], 0) / component.length }));
    const selected = measurable[0];
    const segments = [...measurable].sort((a, b) => Math.min(...a.points.map(point => point.y)) - Math.min(...b.points.map(point => point.y)));
    const gaps = segments.slice(1).flatMap((segment, offset) => {
      const originalIndex = offset + 1;
      if (segment.componentId === segments[offset].componentId) return [];
      const previous = segments[offset];
      const distance = Math.min(...previous.points.slice(-1).map(a => segment.points.slice(0, 1).map(b => Math.hypot(a.x - b.x, a.y - b.y))).flat());
      return [{ afterSegment: originalIndex - 1, pixelDistancePx: distance, relation: "unknown" as const }];
    });
    const competingCandidates = [...measurable.filter(track => track !== selected).map(track => ({ supportPixelCount: track.supportPixelCount, responseMean: track.responseMean, points: track.points })), ...ambiguousComponents].slice(0, 8);
    let modelSeedSupport = 0;
    if (optionalModelSeeds.length > MAX_MODEL_SEEDS) budget.truncatedReason ??= "seed_limit";
    for (const seed of optionalModelSeeds.slice(0, MAX_MODEL_SEEDS)) {
      if (!consume(budget)) { budget.truncatedReason ??= "seed_limit"; break; }
      if (selected?.points.some(point => Math.hypot(point.x - seed.x, point.y - seed.y) <= Math.max(4, palmWidth * .04))) modelSeedSupport++;
    }
    const truncatedReason = budget.truncatedReason ?? probeBudget.truncatedReason;
    const truncated = Boolean(truncatedReason);
    const ambiguousSegments = ambiguousComponents.map(item => ({ componentId: item.componentId, points: item.points, pathLengthPx: pathLength(item.points), supportPixelCount: item.supportPixelCount, responseMean: item.responseMean, status: "ambiguous" as const }));
    const allSegments = [...segments, ...ambiguousSegments];
    const ridgeEvidence = new Map<string, { valleyResponse: number; probeAngleDeg: number | null }>();
    for (let index = 0; index < analysisForeground.length; index++) if (analysisForeground[index]) {
      const x = index % width, y = Math.floor(index / width), directionIndex = bestProbeDirection[index];
      ridgeEvidence.set(`${x},${y}`, { valleyResponse: valleyResponse[index], probeAngleDeg: directionIndex >= 0 ? (Math.atan2(ny, nx) + directionIndex * Math.PI / probeDirections) * 180 / Math.PI : null });
    }
    const thumbPoints = [p[1], p[2], p[3]];
    const thumbRegion = { xMin: Math.min(...thumbPoints.map(point => point.x)) - palmWidth * .12, xMax: Math.max(...thumbPoints.map(point => point.x)) + palmWidth * .12, yMin: Math.min(...thumbPoints.map(point => point.y)) - palmWidth * .12, yMax: Math.max(...thumbPoints.map(point => point.y)) + palmWidth * .12 };
    const pathRanking = rankConnectedCreasePaths(allSegments, componentRecords, ridgeEvidence, { axisAngleDeg: angle, thumbRegion }, { used: 0, limit: 8192 });
    const pathSearch = { searchTruncated: pathRanking.searchTruncated, budget: pathRanking.budget, truncatedReason: pathRanking.truncatedReason };
    const candidate: MajorCreaseCandidate = selected ? { status: segments.reduce((sum, segment) => sum + segment.pathLengthPx, 0) >= axisLength * .18 && selected.responseMean >= threshold * .35 ? "candidate" : "insufficient_evidence", coordinateSpace: "aligned-image-px", imageSize: { width, height }, points: selected.points, components: componentRecords, segments: allSegments, rawSupport: { pixelCount: selected.supportPixelCount, responseMean: selected.responseMean, threshold, coverage: selected.supportPixelCount / (width * height), modelSeedSupport }, gaps, competingCandidates, direction: { axisAngleDeg: angle, thumbSide }, probe, truncated, truncatedReason, pathCandidates: pathRanking.pathCandidates, pathSearch, nms } : { ...emptyCandidate(width, height, angle, thumbSide), status: ambiguousComponents.length ? "insufficient_evidence" : "not_seen", components: componentRecords, segments: allSegments, competingCandidates, rawSupport: { pixelCount: ambiguousComponents[0]?.supportPixelCount ?? 0, responseMean: ambiguousComponents[0]?.responseMean ?? 0, threshold, coverage: (ambiguousComponents[0]?.supportPixelCount ?? 0) / (width * height), modelSeedSupport }, probe, truncated, truncatedReason, pathCandidates: pathRanking.pathCandidates, pathSearch, nms };
    // budget.used already includes probeBudget.used from the initial tracker
    // allocation; report the accumulated work exactly once.
    return finish({ status: truncated ? "truncated" : "ok", width, height, elapsedMs: 0, candidate, budget: { used: budget.used, limit: MAX_WORK_UNITS, reason: truncatedReason } });
  } catch {
    return finish({ status: "runtime", errorCode: "runtime", width, height, elapsedMs: 0, candidate: null });
  }
}
