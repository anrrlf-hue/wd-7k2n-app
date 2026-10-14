export type AdditionalDirection = "middle_direction" | "ring_direction" | "pinky_direction";
export type AdditionalStatus = "candidate" | "faint" | "not_seen";

export interface NormalizedHandLandmark { x: number; y: number; z?: number }
export interface PixelPoint { x: number; y: number }
export interface VariantTrack {
  status: AdditionalStatus;
  lengthPx: number;
  continuity: number;
  widthSpan: number;
  contrast: number;
  points: PixelPoint[];
}
export interface AdditionalCorridorResult {
  direction: AdditionalDirection;
  roi: { x: number; y: number; width: number; height: number };
  raw: VariantTrack;
  localContrast: VariantTrack;
  stability: {
    bothNonEmpty: boolean;
    continuityDelta: number;
    pathDistancePx: number | null;
    stableCandidate: boolean;
  };
}
export interface AdditionalCreaseAnalysis {
  width: number;
  height: number;
  elapsedMs: number;
  corridors: Record<AdditionalDirection, AdditionalCorridorResult>;
  interpretation: "pixel_candidate_only";
}

const INDEX = { wrist: 0, middle: 9, ring: 13, pinky: 17 } as const;

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
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      verticalPrefix[0] = 0;
      for (let yy = 0; yy < height; yy++) verticalPrefix[yy + 1] = verticalPrefix[yy] + horizontal[yy * width + x];
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

function emptyTrack(): VariantTrack { return { status: "not_seen", lengthPx: 0, continuity: 0, widthSpan: 0, contrast: 0, points: [] }; }

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
  const drift = Math.max(1, Math.round(c.width * .025));
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
    if (Math.max(...ys) - Math.min(...ys) + 1 >= 6) components.push(component);
  }
  if (!components.length) return emptyTrack();
  const component = components.sort((a, b) => {
    const span = (v: Array<[number, number]>) => Math.max(...v.map(([y]) => y)) - Math.min(...v.map(([y]) => y)) + 1;
    return span(b) - span(a) || b.length - a.length;
  })[0];
  const byY = new Map<number, number[]>();
  for (const [y, x] of component) byY.set(y, [...(byY.get(y) ?? []), x]);
  const points = [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([y, xs]) => ({ x: xs.reduce((a, b) => a + b, 0) / xs.length + c.x0, y: y + c.y0 }));
  const minY = Math.min(...component.map(([y]) => y)), maxY = Math.max(...component.map(([y]) => y));
  const continuity = (maxY - minY + 1) / c.height;
  const contrast = Math.min(1, component.reduce((sum, [y, x]) => sum + response[y * rw + x], 0) / component.length / 40);
  const minX = Math.min(...component.map(([, x]) => x)), maxX = Math.max(...component.map(([, x]) => x));
  return { status: continuity >= .12 && contrast >= .08 ? "candidate" : "faint", lengthPx: points.length, continuity, widthSpan: (maxX - minX + 1) / c.width, contrast, points };
}

function trackVariant(source: Float32Array, imageWidth: number, imageHeight: number, roi: { x: number; y: number; width: number; height: number }): VariantTrack {
  return trackCrop(crop(source, imageWidth, imageHeight, roi));
}

function pathDistance(a: PixelPoint[], b: PixelPoint[]): number | null {
  if (!a.length || !b.length) return null;
  const n = Math.min(a.length, b.length); let sum = 0;
  for (let i = 0; i < n; i++) {
    const pa = a[Math.round(i * (a.length - 1) / Math.max(1, n - 1))], pb = b[Math.round(i * (b.length - 1) / Math.max(1, n - 1))];
    sum += Math.hypot(pa.x - pb.x, pa.y - pb.y);
  }
  return sum / n;
}

export function trackAdditionalVerticalCreases(image: ImageData, landmarks: NormalizedHandLandmark[]): AdditionalCreaseAnalysis {
  const started = performance.now();
  if (landmarks.length !== 21) throw new Error("trackAdditionalVerticalCreases requires 21 MediaPipe landmarks");
  const p = landmarks.map(v => ({ x: v.x * image.width, y: v.y * image.height }));
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
    return [direction, { direction, roi, raw: rawTrack, localContrast: localTrack, stability: { bothNonEmpty: rawTrack.points.length > 0 && localTrack.points.length > 0, continuityDelta: Math.abs(rawTrack.continuity - localTrack.continuity), pathDistancePx: distance, stableCandidate: rawTrack.status === "candidate" && localTrack.status === "candidate" && distance !== null && distance <= 24 } }];
  })) as Record<AdditionalDirection, AdditionalCorridorResult>;
  return { width: image.width, height: image.height, elapsedMs: performance.now() - started, corridors, interpretation: "pixel_candidate_only" };
}
