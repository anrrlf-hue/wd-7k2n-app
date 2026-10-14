export type AdditionalDirection = "middle_direction" | "ring_direction" | "pinky_direction";
export type AdditionalStatus = "candidate" | "insufficient_evidence" | "not_seen";
export type AdditionalAnalysisStatus = "ok" | "invalid_input" | "unsupported_pose" | "error";

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
    stableCandidate: boolean;
  };
}
export interface AdditionalCreaseAnalysis {
  status: AdditionalAnalysisStatus;
  errorCode?: "invalid_landmarks" | "image_too_large" | "unsupported_pose" | "runtime";
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

function emptyTrack(): VariantTrack { return { status: "not_seen", evidenceReason: "none", pathLengthPx: 0, verticalSpanPx: 0, coverage: 0, widthSpan: 0, contrast: 0, points: [], componentCount: 0, selectedSpanPx: 0, gapRows: 0, supportPixelCount: 0, supportRows: 0 }; }

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
  const threshold = Math.max(2.5, sorted[Math.floor(sorted.length * .78)] * .9);
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
    const ys = component.map(([y]) => y);
    if (Math.max(...ys) - Math.min(...ys) + 1 >= 2) components.push(component);
  }
  if (!components.length) return emptyTrack();
  const component = components.sort((a, b) => {
    const span = (v: Array<[number, number]>) => Math.max(...v.map(([y]) => y)) - Math.min(...v.map(([y]) => y)) + 1;
    return span(b) - span(a) || b.length - a.length;
  })[0];
  const byY = new Map<number, number[]>();
  for (const [y, x] of component) byY.set(y, [...(byY.get(y) ?? []), x]);
  const points = [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([y, xs]) => ({ x: xs.reduce((a, b) => a + b, 0) / xs.length + c.x0 + offset, y: y + c.y0 }));
  const minY = Math.min(...component.map(([y]) => y)), maxY = Math.max(...component.map(([y]) => y));
  const verticalSpanPx = maxY - minY + 1;
  const coverage = verticalSpanPx / c.height;
  const contrast = Math.min(1, component.reduce((sum, [y, x]) => sum + response[y * rw + x], 0) / component.length / 40);
  const minX = Math.min(...component.map(([, x]) => x)), maxX = Math.max(...component.map(([, x]) => x));
  let lengthPx = 0;
  for (let i = 1; i < points.length; i++) lengthPx += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  const sufficient = coverage >= .12 && contrast >= .08;
  return { status: sufficient ? "candidate" : "insufficient_evidence", evidenceReason: sufficient ? "none" : coverage < .12 ? "short" : "weak_contrast", pathLengthPx: lengthPx, verticalSpanPx, coverage, widthSpan: (maxX - minX + 1) / c.width, contrast, points, componentCount: components.length, selectedSpanPx: verticalSpanPx, gapRows: verticalSpanPx - byY.size, supportPixelCount: component.length, supportRows: byY.size };
}

function trackVariant(source: Float32Array, imageWidth: number, imageHeight: number, roi: { x: number; y: number; width: number; height: number }): VariantTrack {
  return trackCrop(crop(source, imageWidth, imageHeight, roi));
}

function pathXAtY(points: PixelPoint[], y: number): number | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * ((y - a.y) / Math.max(1e-6, b.y - a.y));
  }
  return null;
}

function pathDistance(a: PixelPoint[], b: PixelPoint[]): number | null {
  if (!a.length || !b.length) return null;
  const start = Math.max(a[0].y, b[0].y), end = Math.min(a[a.length - 1].y, b[b.length - 1].y);
  if (end < start) return null;
  let sum = 0, count = 0;
  for (let y = Math.ceil(start); y <= Math.floor(end); y++) { const ax = pathXAtY(a, y), bx = pathXAtY(b, y); if (ax !== null && bx !== null) { sum += Math.abs(ax - bx); count++; } }
  return count ? sum / count : null;
}

export function trackAdditionalVerticalCreases(image: ImageData, landmarks: NormalizedHandLandmark[]): AdditionalCreaseAnalysis {
  const started = performance.now();
  const base = { width: image?.width ?? 0, height: image?.height ?? 0, elapsedMs: 0, corridors: {}, interpretation: "pixel_candidate_only" as const };
  if (!image || image.width <= 0 || image.height <= 0 || image.data.length !== image.width * image.height * 4 || image.width * image.height > 6_000_000) {
    return { ...base, status: "invalid_input", errorCode: image?.width * (image?.height ?? 0) > 6_000_000 ? "image_too_large" : "invalid_landmarks", elapsedMs: performance.now() - started };
  }
  if (!Array.isArray(landmarks) || landmarks.length !== 21 || landmarks.some(v => !Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z ?? 0))) {
    return { ...base, status: "invalid_input", errorCode: "invalid_landmarks", elapsedMs: performance.now() - started };
  }
  try {
  const p = landmarks.map(v => ({ x: v.x * image.width, y: v.y * image.height }));
  if (Math.hypot(p[9].x - p[0].x, p[9].y - p[0].y) < 1 || Math.abs(p[5].x - p[17].x) < 1) {
    return { ...base, status: "invalid_input", errorCode: "invalid_landmarks", elapsedMs: performance.now() - started };
  }
  const poseAngle = Math.atan2(p[9].y - p[0].y, p[9].x - p[0].x) * 180 / Math.PI;
  const poseDeviation = Math.abs(((poseAngle + 90 + 180) % 360) - 180);
  if (poseDeviation > 45) return { ...base, status: "unsupported_pose", errorCode: "unsupported_pose", elapsedMs: performance.now() - started };
  const palmTop = (p[5].y + p[9].y + p[13].y + p[17].y) / 4;
  const palmHeight = Math.max(20, p[0].y - palmTop), palmWidth = Math.max(12, Math.abs(p[5].x - p[17].x));
  const lowerY = Math.min(image.height - 1, p[0].y - palmHeight * .08);
  const defs: Array<[AdditionalDirection, number, number, number, number]> = [["middle_direction", 9, .22, .12, .82], ["ring_direction", 13, .22, .08, .70], ["pinky_direction", 17, .25, .06, .58]];
  const raw = gray(image.data, image.width, image.height);
  const corridors = Object.fromEntries(defs.map(([direction, centerIndex, widthRatio, start, end]) => {
    const width = palmWidth * widthRatio, y = palmTop + palmHeight * start, endY = Math.min(lowerY, palmTop + palmHeight * end);
    const roi = { x: Math.max(0, Math.min(image.width - width, p[centerIndex].x - width / 2)), y: Math.max(0, y), width: Math.max(6, Math.min(width, image.width)), height: Math.max(10, endY - y) };
    const rawTrack = trackVariant(raw, image.width, image.height, roi);
    const localCrop = crop(raw, image.width, image.height, roi);
    const localBlur = blur(localCrop.data, localCrop.width, localCrop.height, 15);
    const localData = localCrop.data.map((v, i) => v - localBlur[i]);
    const localTrack = trackCrop({ ...localCrop, data: localData });
    const distance = pathDistance(rawTrack.points, localTrack.points);
    const pathTolerancePx = Math.max(2, palmWidth * .08);
    return [direction, { direction, roi, raw: rawTrack, localContrast: localTrack, stability: { bothNonEmpty: rawTrack.points.length > 0 && localTrack.points.length > 0, coverageDelta: Math.abs(rawTrack.coverage - localTrack.coverage), pathDistancePx: distance, stableCandidate: rawTrack.status === "candidate" && localTrack.status === "candidate" && rawTrack.componentCount === 1 && localTrack.componentCount === 1 && rawTrack.gapRows === 0 && localTrack.gapRows === 0 && Math.abs(rawTrack.coverage - localTrack.coverage) <= .08 && distance !== null && distance <= pathTolerancePx } }];
  })) as Record<AdditionalDirection, AdditionalCorridorResult>;
  return { width: image.width, height: image.height, elapsedMs: performance.now() - started, status: "ok", corridors, interpretation: "pixel_candidate_only" };
  } catch {
    return { ...base, status: "error", errorCode: "runtime", elapsedMs: performance.now() - started };
  }
}
