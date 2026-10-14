export type AdditionalDirection = "middle_direction" | "ring_direction" | "pinky_direction";
export type AdditionalStatus = "candidate" | "insufficient_evidence" | "not_seen";
export type AdditionalAnalysisStatus = "ok" | "invalid_input" | "unsupported_pose" | "error";
const MAX_IMAGE_PIXELS = 6_000_000;
const MAX_IMAGE_DIMENSION = 3_000;
const MAX_CORRIDOR_PIXELS = 500_000;
const MAX_WORK_UNITS = 30_000_000;

export interface NormalizedHandLandmark { x: number; y: number; z?: number }
export interface PixelPoint { x: number; y: number }
export interface VariantTrack {
  status: AdditionalStatus;
  evidenceReason: "none" | "short" | "weak_contrast";
  pathLengthPx: number;
  verticalSpanPx: number;
  coverage: number;
  widthSpan: number;
  contrast: number;
  points: PixelPoint[];
  componentCount: number;
  selectedSpanPx: number;
  gapRows: number;
  supportPixelCount: number;
  supportRows: number;
  competingComponentCount: number;
}
export interface AdditionalCorridorResult {
  direction: AdditionalDirection;
  roi: { x: number; y: number; width: number; height: number };
  raw: VariantTrack;
  localContrast: VariantTrack;
  stability: {
    bothNonEmpty: boolean;
    coverageDelta: number;
    pathDistancePx: number | null;
    supportOverlapRatio: number;
    stableCandidate: boolean;
  };
}
export interface AdditionalCreaseAnalysis {
  status: AdditionalAnalysisStatus;
  errorCode?: "invalid_image" | "invalid_landmarks" | "image_too_large" | "work_limit" | "unsupported_pose" | "runtime";
  width: number;
  height: number;
  elapsedMs: number;
  corridors: Partial<Record<AdditionalDirection, AdditionalCorridorResult>>;
  interpretation: "pixel_candidate_only";
}

function gray(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const p = i * 4;
    out[i] = .299 * data[p] + .587 * data[p + 1] + .114 * data[p + 2];
  }
  return out;
}

function blur(input: Float32Array, width: number, height: number, radius: number): Float32Array {
  const out = new Float32Array(input.length);
  const horizontal = new Float32Array(input.length);
  const prefix = new Float64Array(width + 1);
  for (let y = 0; y < height; y++) {
    prefix[0] = 0;
    for (let x = 0; x < width; x++) prefix[x + 1] = prefix[x] + input[y * width + x];
    for (let x = 0; x < width; x++) { const lo = Math.max(0, x - radius), hi = Math.min(width - 1, x + radius); horizontal[y * width + x] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1); }
  }
  const verticalPrefix = new Float64Array(height + 1);
  for (let x = 0; x < width; x++) {
    verticalPrefix[0] = 0;
    for (let yy = 0; yy < height; yy++) verticalPrefix[yy + 1] = verticalPrefix[yy] + horizontal[yy * width + x];
    for (let y = 0; y < height; y++) {
      const lo = Math.max(0, y - radius), hi = Math.min(height - 1, y + radius);
      out[y * width + x] = (verticalPrefix[hi + 1] - verticalPrefix[lo]) / (hi - lo + 1);
    }
  }
  return out;
}

function crop(source: Float32Array, width: number, height: number, roi: { x: number; y: number; width: number; height: number }) {
  const x0 = Math.max(0, Math.floor(roi.x)), y0 = Math.max(0, Math.floor(roi.y));
  const x1 = Math.min(width, Math.floor(roi.x + roi.width)), y1 = Math.min(height, Math.floor(roi.y + roi.height));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) out.set(source.subarray((y0 + y) * width + x0, (y0 + y) * width + x1), y * w);
  return { data: out, width: w, height: h, x0, y0 };
}

function emptyTrack(): VariantTrack { return { status: "not_seen", evidenceReason: "none", pathLengthPx: 0, verticalSpanPx: 0, coverage: 0, widthSpan: 0, contrast: 0, points: [], componentCount: 0, selectedSpanPx: 0, gapRows: 0, supportPixelCount: 0, supportRows: 0, competingComponentCount: 0 }; }

function trackCrop(c: { data: Float32Array; width: number; height: number; x0: number; y0: number }): VariantTrack {
  if (c.width < 7 || c.height < 12) return emptyTrack();
  const sm = blur(c.data, c.width, c.height, 1);
  const offset = Math.max(2, Math.round(c.width * .035));
  const rw = c.width - 2 * offset;
  const response = new Float32Array(c.height * rw);
  const rowMax = new Float32Array(c.height);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < rw; x++) {
    const center = sm[y * c.width + x + offset];
    const v = Math.max(0, Math.min(sm[y * c.width + x], sm[y * c.width + x + 2 * offset]) - center);
    response[y * rw + x] = v;
    if (v > rowMax[y]) rowMax[y] = v;
  }
  const sorted = Array.from(rowMax).sort((a, b) => a - b);
  const threshold = Math.max(1.5, sorted[Math.floor(sorted.length * .78)] * .7);
  const seen = new Uint8Array(response.length), components: Array<Array<[number, number]>> = [];
  const drift = Math.max(2, Math.round(c.width * .08));
  for (let sy = 0; sy < c.height; sy++) for (let sx = 0; sx < rw; sx++) {
    const start = sy * rw + sx;
    if (seen[start] || response[start] < threshold) continue;
    const stack: Array<[number, number]> = [[sy, sx]], component: Array<[number, number]> = [];
    seen[start] = 1;
    while (stack.length) {
      const [y, x] = stack.pop()!; component.push([y, x]);
      for (const ny of [y - 1, y, y + 1]) {
        if (ny < 0 || ny >= c.height) continue;
        for (let nx = Math.max(0, x - drift); nx <= Math.min(rw - 1, x + drift); nx++) {
          const i = ny * rw + nx;
          if (!seen[i] && response[i] >= threshold) { seen[i] = 1; stack.push([ny, nx]); }
        }
      }
    }
    let componentMinY = c.height, componentMaxY = -1;
    for (const [y] of component) { componentMinY = Math.min(componentMinY, y); componentMaxY = Math.max(componentMaxY, y); }
    if (componentMaxY - componentMinY + 1 >= 2) components.push(component);
  }
  if (!components.length) return emptyTrack();
  const minY = (v: Array<[number, number]>) => { let result = c.height; for (const [y] of v) result = Math.min(result, y); return result; };
  const maxY = (v: Array<[number, number]>) => { let result = -1; for (const [y] of v) result = Math.max(result, y); return result; };
  const meanXAt = (v: Array<[number, number]>, y: number) => {
    const xs = v.filter(([yy]) => yy === y).map(([, x]) => x);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  type Track = { components: Array<Array<[number, number]>>; minY: number; maxY: number; endX: number };
  const tracks: Track[] = [];
  for (const component of components.sort((a, b) => minY(a) - minY(b))) {
    const startY = minY(component), startX = meanXAt(component, startY)!;
    const attach = tracks.filter(t => startY > t.maxY && startY - t.maxY <= 20 && Math.abs(startX - t.endX) <= drift * 2).sort((a, b) => b.maxY - a.maxY)[0];
    if (attach) { attach.components.push(component); attach.maxY = maxY(component); attach.endX = meanXAt(component, attach.maxY)!; }
    else tracks.push({ components: [component], minY: startY, maxY: maxY(component), endX: meanXAt(component, maxY(component))! });
  }
  tracks.sort((a, b) => (b.maxY - b.minY) - (a.maxY - a.minY) || b.components.flat().length - a.components.flat().length);
  const selected = tracks[0];
  const component = selected.components.flat();
  const selectedMeanX = component.reduce((sum, [, x]) => sum + x, 0) / component.length;
  const competingComponentCount = tracks.slice(1).filter(t => {
    if ((t.maxY - t.minY + 1) < Math.max(6, c.height * .08)) return false;
    const separated = t.maxY < selected.minY || t.minY > selected.maxY;
    const tPoints = t.components.flat();
    const tMeanX = tPoints.reduce((sum, [, x]) => sum + x, 0) / tPoints.length;
    return separated || Math.abs(tMeanX - selectedMeanX) > drift * 2;
  }).length;
  const byY = new Map<number, number[]>();
  for (const [y, x] of component) byY.set(y, [...(byY.get(y) ?? []), x]);
  let previousX: number | null = null;
  const points = [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([y, xs]) => {
    const chosen = xs.reduce((best, x) => {
      if (previousX === null) return response[y * rw + x] > response[y * rw + best] ? x : best;
      const distance = Math.abs(x - previousX), bestDistance = Math.abs(best - previousX);
      return distance < bestDistance || (distance === bestDistance && response[y * rw + x] > response[y * rw + best]) ? x : best;
    }, xs[0]);
    previousX = chosen;
    return { x: chosen + c.x0 + offset, y: y + c.y0 };
  });
  const selectedMinY = selected.minY, selectedMaxY = selected.maxY;
  const verticalSpanPx = selectedMaxY - selectedMinY + 1;
  const coverage = verticalSpanPx / c.height;
  const contrast = Math.min(1, component.reduce((sum, [y, x]) => sum + response[y * rw + x], 0) / component.length / 40);
  let minX = rw, maxX = -1;
  for (const [, x] of component) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  let lengthPx = 0;
  for (let i = 1; i < points.length; i++) lengthPx += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  const sufficient = coverage >= .12 && contrast >= .08;
  return { status: sufficient ? "candidate" : "insufficient_evidence", evidenceReason: sufficient ? "none" : coverage < .12 ? "short" : "weak_contrast", pathLengthPx: lengthPx, verticalSpanPx, coverage, widthSpan: (maxX - minX + 1) / c.width, contrast, points, componentCount: selected.components.length, selectedSpanPx: verticalSpanPx, gapRows: verticalSpanPx - byY.size, supportPixelCount: component.length, supportRows: byY.size, competingComponentCount };
}

function trackVariant(source: Float32Array, imageWidth: number, imageHeight: number, roi: { x: number; y: number; width: number; height: number }): VariantTrack {
  return trackCrop(crop(source, imageWidth, imageHeight, roi));
}

function pathComparison(a: PixelPoint[], b: PixelPoint[]): { distance: number | null; supportOverlapRatio: number } {
  if (!a.length || !b.length) return { distance: null, supportOverlapRatio: 0 };
  let ai = 0, bi = 0, sum = 0, count = 0;
  while (ai < a.length && bi < b.length) {
    if (a[ai].y === b[bi].y) { sum += Math.abs(a[ai].x - b[bi].x); count++; ai++; bi++; }
    else if (a[ai].y < b[bi].y) ai++;
    else bi++;
  }
  return { distance: count ? sum / count : null, supportOverlapRatio: count / Math.max(a.length, b.length) };
}

export function trackAdditionalVerticalCreases(image: ImageData, landmarks: NormalizedHandLandmark[]): AdditionalCreaseAnalysis {
  const started = performance.now();
  const base = { width: image?.width ?? 0, height: image?.height ?? 0, elapsedMs: 0, corridors: {}, interpretation: "pixel_candidate_only" as const };
  const imageWidth = image?.width, imageHeight = image?.height, imageData = image?.data;
  if (!image || !Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth <= 0 || imageHeight <= 0 || imageWidth > MAX_IMAGE_DIMENSION || imageHeight > MAX_IMAGE_DIMENSION || !(imageData instanceof Uint8ClampedArray) || imageData.length !== imageWidth * imageHeight * 4) {
    const tooLarge = Boolean(imageWidth && imageHeight && (imageWidth * imageHeight > MAX_IMAGE_PIXELS || imageWidth > MAX_IMAGE_DIMENSION || imageHeight > MAX_IMAGE_DIMENSION));
    return { ...base, status: "invalid_input", errorCode: tooLarge ? "image_too_large" : "invalid_image", elapsedMs: performance.now() - started };
  }
  if (!Array.isArray(landmarks) || landmarks.length !== 21 || landmarks.some(v => !v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || v.x < 0 || v.x > 1 || v.y < 0 || v.y > 1 || !Number.isFinite(v.z ?? 0))) {
    return { ...base, status: "invalid_input", errorCode: "invalid_landmarks", elapsedMs: performance.now() - started };
  }
  if (imageWidth * imageHeight * 6 > MAX_WORK_UNITS) {
    return { ...base, status: "invalid_input", errorCode: "work_limit", elapsedMs: performance.now() - started };
  }
  try {
  const p = landmarks.map(v => ({ x: v.x * image.width, y: v.y * image.height }));
  if (Math.hypot(p[9].x - p[0].x, p[9].y - p[0].y) < 1 || Math.abs(p[5].x - p[17].x) < 1) {
    return { ...base, status: "invalid_input", errorCode: "invalid_landmarks", elapsedMs: performance.now() - started };
  }
  const poseAngle = Math.atan2(p[9].y - p[0].y, p[9].x - p[0].x) * 180 / Math.PI;
  const poseDeviation = Math.abs(((poseAngle + 90 + 180) % 360) - 180);
  if (poseDeviation > 30) return { ...base, status: "unsupported_pose", errorCode: "unsupported_pose", elapsedMs: performance.now() - started };
  const palmTop = (p[5].y + p[9].y + p[13].y + p[17].y) / 4;
  const palmHeight = Math.max(20, p[0].y - palmTop), palmWidth = Math.max(12, Math.abs(p[5].x - p[17].x));
  const lowerY = Math.min(image.height - 1, p[0].y - palmHeight * .08);
  const defs: Array<[AdditionalDirection, number, number, number, number]> = [["middle_direction", 9, .22, .12, .82], ["ring_direction", 13, .22, .08, .70], ["pinky_direction", 17, .25, .06, .58]];
  const raw = gray(image.data, image.width, image.height);
  const corridors = Object.fromEntries(defs.map(([direction, centerIndex, widthRatio, start, end]) => {
    const width = palmWidth * widthRatio, y = palmTop + palmHeight * start, endY = Math.min(lowerY, palmTop + palmHeight * end);
    const roi = { x: Math.max(0, Math.min(image.width - width, p[centerIndex].x - width / 2)), y: Math.max(0, y), width: Math.max(6, Math.min(width, image.width)), height: Math.max(10, endY - y) };
    if (!Number.isFinite(roi.x) || !Number.isFinite(roi.y) || !Number.isFinite(roi.width) || !Number.isFinite(roi.height) || roi.x < 0 || roi.y < 0 || roi.x + roi.width > image.width || roi.y + roi.height > image.height || roi.width * roi.height > MAX_CORRIDOR_PIXELS) throw new Error("invalid_roi");
    const rawTrack = trackVariant(raw, image.width, image.height, roi);
    const localCrop = crop(raw, image.width, image.height, roi);
    const localBlur = blur(localCrop.data, localCrop.width, localCrop.height, 15);
    const localData = localCrop.data.map((v, i) => v - localBlur[i]);
    const localTrack = trackCrop({ ...localCrop, data: localData });
    const comparison = pathComparison(rawTrack.points, localTrack.points);
    const pathTolerancePx = Math.max(2, palmWidth * .08);
    const supportOverlapRatio = comparison.supportOverlapRatio;
    const supportDensity = (track: VariantTrack) => track.verticalSpanPx > 0 ? track.supportRows / track.verticalSpanPx : 0;
    return [direction, { direction, roi, raw: rawTrack, localContrast: localTrack, stability: { bothNonEmpty: rawTrack.points.length > 0 && localTrack.points.length > 0, coverageDelta: Math.abs(rawTrack.coverage - localTrack.coverage), pathDistancePx: comparison.distance, supportOverlapRatio, stableCandidate: rawTrack.status === "candidate" && localTrack.status === "candidate" && rawTrack.competingComponentCount === 0 && localTrack.competingComponentCount === 0 && supportDensity(rawTrack) >= .5 && supportDensity(localTrack) >= .5 && supportOverlapRatio >= .6 && Math.abs(rawTrack.coverage - localTrack.coverage) <= .08 && comparison.distance !== null && comparison.distance <= pathTolerancePx } }];
  })) as Record<AdditionalDirection, AdditionalCorridorResult>;
  return { width: image.width, height: image.height, elapsedMs: performance.now() - started, status: "ok", corridors, interpretation: "pixel_candidate_only" };
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_roi") return { ...base, status: "invalid_input", errorCode: "invalid_landmarks", elapsedMs: performance.now() - started };
    return { ...base, status: "error", errorCode: "runtime", elapsedMs: performance.now() - started };
  }
}
