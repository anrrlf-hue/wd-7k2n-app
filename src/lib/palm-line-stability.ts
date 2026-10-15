/**
 * Diagnostic comparison for two foreground paths produced from different
 * crops/variants of the same palm image. This module never creates a path
 * from landmarks and never decides that a path is an anatomical line.
 */

export interface PalmFrameLandmark { x: number; y: number }
export interface PalmPathPoint { x: number; y: number }

export interface PalmPathFrame {
  landmarks: PalmFrameLandmark[];
  cropWidth: number;
  cropHeight: number;
}

export interface PalmPathAgreement {
  valid: boolean;
  reason: "ok" | "missing_path" | "invalid_frame";
  coordinateSpace: "wrist-middle-axis-palm-width";
  orientation: "same" | "reversed" | null;
  sampleCount: number;
  meanDistance: number | null;
  maxDistance: number | null;
  endpointDistance: number | null;
  lengthA: number | null;
  lengthB: number | null;
  lengthRatio: number | null;
}

interface FramePoint { along: number; across: number }

function projectPath(path: PalmPathPoint[], frame: PalmPathFrame): FramePoint[] | null {
  if (path.length < 5 || frame.cropWidth <= 1 || frame.cropHeight <= 1 || frame.landmarks.length < 18) return null;
  const wrist = frame.landmarks[0], thumb = frame.landmarks[2], middle = frame.landmarks[9];
  const axisX = middle.x - wrist.x, axisY = middle.y - wrist.y;
  const axisLength = Math.hypot(axisX, axisY);
  const palmWidth = Math.hypot(frame.landmarks[5].x - frame.landmarks[17].x, frame.landmarks[5].y - frame.landmarks[17].y);
  if (axisLength < 2 || palmWidth < 2) return null;
  const ux = axisX / axisLength, uy = axisY / axisLength;
  const nx = -uy, ny = ux;
  const side = axisX * (thumb.y - wrist.y) - axisY * (thumb.x - wrist.x) >= 0 ? 1 : -1;
  return path.map(point => {
    const x = point.x * Math.max(1, frame.cropWidth - 1), y = point.y * Math.max(1, frame.cropHeight - 1);
    const rx = x - wrist.x, ry = y - wrist.y;
    return {
      along: (rx * ux + ry * uy) / axisLength,
      across: side * (rx * nx + ry * ny) / palmWidth,
    };
  });
}

function distance(a: FramePoint, b: FramePoint): number {
  return Math.hypot(a.along - b.along, a.across - b.across);
}

function length(path: FramePoint[]): number {
  return path.slice(1).reduce((sum, point, index) => sum + distance(point, path[index]), 0);
}

function resample(path: FramePoint[], count: number): FramePoint[] {
  const total = length(path);
  if (!Number.isFinite(total) || total <= 0) return [];
  const cumulative = [0];
  for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + distance(path[i - 1], path[i]));
  const result: FramePoint[] = [];
  for (let sample = 0; sample < count; sample++) {
    const target = total * sample / (count - 1);
    let index = 1;
    while (index < cumulative.length && cumulative[index] < target) index++;
    if (index >= cumulative.length) { result.push(path[path.length - 1]); continue; }
    const before = cumulative[index - 1], span = cumulative[index] - before;
    const ratio = span > 0 ? (target - before) / span : 0;
    result.push({
      along: path[index - 1].along + (path[index].along - path[index - 1].along) * ratio,
      across: path[index - 1].across + (path[index].across - path[index - 1].across) * ratio,
    });
  }
  return result;
}

function score(a: FramePoint[], b: FramePoint[]) {
  const distances = a.map((point, index) => distance(point, b[index]));
  return {
    mean: distances.reduce((sum, value) => sum + value, 0) / distances.length,
    max: Math.max(...distances),
    endpoint: (distances[0] + distances[distances.length - 1]) / 2,
  };
}

/** Compare two observed paths without assigning an anatomical identity. */
export function comparePalmPaths(
  pathA: PalmPathPoint[] | undefined,
  frameA: PalmPathFrame,
  pathB: PalmPathPoint[] | undefined,
  frameB: PalmPathFrame,
  sampleCount = 16,
): PalmPathAgreement {
  if (!pathA || !pathB || pathA.length < 5 || pathB.length < 5) {
    return { valid: false, reason: "missing_path", coordinateSpace: "wrist-middle-axis-palm-width", orientation: null, sampleCount: 0, meanDistance: null, maxDistance: null, endpointDistance: null, lengthA: null, lengthB: null, lengthRatio: null };
  }
  const projectedA = projectPath(pathA, frameA), projectedB = projectPath(pathB, frameB);
  if (!projectedA || !projectedB || sampleCount < 2) {
    return { valid: false, reason: "invalid_frame", coordinateSpace: "wrist-middle-axis-palm-width", orientation: null, sampleCount: 0, meanDistance: null, maxDistance: null, endpointDistance: null, lengthA: null, lengthB: null, lengthRatio: null };
  }
  const samplesA = resample(projectedA, sampleCount), samplesB = resample(projectedB, sampleCount);
  if (samplesA.length !== sampleCount || samplesB.length !== sampleCount) {
    return { valid: false, reason: "missing_path", coordinateSpace: "wrist-middle-axis-palm-width", orientation: null, sampleCount: 0, meanDistance: null, maxDistance: null, endpointDistance: null, lengthA: null, lengthB: null, lengthRatio: null };
  }
  const same = score(samplesA, samplesB);
  const reversed = score(samplesA, [...samplesB].reverse());
  const selected = reversed.mean < same.mean ? reversed : same;
  const lengthA = length(projectedA), lengthB = length(projectedB);
  return {
    valid: true,
    reason: "ok",
    coordinateSpace: "wrist-middle-axis-palm-width",
    orientation: reversed.mean < same.mean ? "reversed" : "same",
    sampleCount,
    meanDistance: selected.mean,
    maxDistance: selected.max,
    endpointDistance: selected.endpoint,
    lengthA,
    lengthB,
    lengthRatio: Math.min(lengthA, lengthB) / Math.max(lengthA, lengthB),
  };
}
