// 실제 ONNX 런타임 실행 레이어. samuelwbarber/palm-line-reader(MIT)의
// 실제 학습된 가중치(student_fp16.onnx, val_fg_dice 0.81)를
// onnxruntime-web(npm 런타임 의존성, 실제 설치)으로 브라우저에서 직접
// 추론한다. 여기서 계산하는 값(픽셀 마스크 → 바운딩박스/시작점/끝점/
// 곡률)은 전부 그 실제 추론 결과에서 나온 관측값이며, 사전에 정의한
// 조건문으로 지어낸 값이 아니다.
//
// MediaPipe로 만든 손 크롭을 512x512로 넣는 이 모델의 훈련 프레이밍과
// 완전히 같지는 않아(모델은 "손금이 꽉 찬" 근접 크롭으로 학습됨) 정확도가
// 낮아질 수 있다는 점을 UI 쪽에 그대로 노출한다(관측값 vs 해석 분리 원칙).

import * as ort from "onnxruntime-web";
import { PalmLineSegmenter } from "@/lib/vendor/palm-line-reader/palmLines.js";

// public/ort/에 self-host한 wasm 번들만 사용 — CDN에 의존하지 않는다
// (이 프로젝트가 MediaPipe wasm도 동일하게 자체 호스팅하는 것과 같은 원칙).
ort.env.wasm.wasmPaths = "/ort/";
// threaded wasm은 SharedArrayBuffer(COOP/COEP 크로스오리진 격리 헤더)가
// 필요한데 이 배포 환경에 그 헤더가 없다 — numThreads=1로 강제해 메인
// 스레드에서 단일 스레드로 동작하게 해서 별도 서버 설정 없이 안정적으로
// 돌아가게 한다. webgpu는 브라우저 지원 편차가 커서 이번엔 wasm(CPU)로
// 고정해 "실제로 항상 돌아가는 것"을 우선한다.
ort.env.wasm.numThreads = 1;

let segmenterPromise: Promise<InstanceType<typeof PalmLineSegmenter>> | null = null;

function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = PalmLineSegmenter.create(ort, {
      modelUrl: "/models/palm_line_student_fp16.onnx",
      executionProviders: ["wasm"],
    });
  }
  return segmenterPromise;
}

/** 앱 진입 시 미리 불러 첫 분석 지연을 줄이고 싶을 때 호출 (실패해도 무시) */
export function preloadPalmLineModel() {
  getSegmenter().catch(() => {});
}

export type OnnxLineClass = "heart_line" | "head_line" | "life_line";
const CLASS_INDEX: Record<OnnxLineClass, number> = { heart_line: 1, head_line: 2, life_line: 3 };
const MIN_PIXELS_FOR_DETECTION = 60; // 선택한 8-connected component의 최소 픽셀 수.

export interface OnnxLineObservation {
  class: OnnxLineClass;
  detected: boolean;
  /** Component was observed, but its geometry may be ambiguous. */
  geometryStatus: "not_detected" | "measurable" | "ambiguous";
  /** 마스크에서 이 클래스로 분류된 픽셀 수 — 실제 추론 결과 원값 */
  pixelCount: number;
  /** 0~1, 모델 마스크 전체 대비 선택 component의 픽셀 비율 */
  coverage: number;
  boundingBox: { x0: number; y0: number; x1: number; y1: number } | null;
  /** 선택된 foreground skeleton path의 양 끝점 */
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  /** 주성분 직선 대비 수직 잔차의 표준편차를 선 길이로 정규화한 값.
   * 0에 가까울수록 직선, 클수록 곡선. 임의 스케일(대략 0~1+)이며
   * "곡률의 물리량"이 아니라 상대적 지표다. */
  curveScore: number;
  /** 선택된 skeleton path의 구간 합 in source-crop pixel coordinates. */
  lineLength: number;
  /** 주성분 길이 / same-crop wrist-to-middle-MCP (or MCP) span. */
  normalizedLineLength: number;
  /** pixelCount / skeleton length in model-mask pixels; legacy depth proxy units. */
  avgThickness: number;
  /** Actual foreground skeleton path in source-crop normalized coordinates. */
  pathPoints?: Array<{ x: number; y: number }>;
}

export interface OnnxPalmLineResult {
  observations: OnnxLineObservation[];
  maskWidth: number;
  maskHeight: number;
  /** Test-only raw class mask; never included in PalmFacts. */
  mask?: Uint8Array;
  /** start/end are 0~1 in the source crop; measurements remain crop-pixel based. */
  coordinateSpace: "source-crop-normalized-0to1";
}

export interface OnnxMeasurementContext {
  cropWidth: number;
  cropHeight: number;
  referenceSpan: number;
}
export function computeObservation(
  mask: Uint8Array,
  width: number,
  height: number,
  cls: OnnxLineClass,
  context: OnnxMeasurementContext = { cropWidth: width, cropHeight: height, referenceSpan: Math.max(width, height) },
): OnnxLineObservation {
  const classIndex = CLASS_INDEX[cls];
  const visited = new Uint8Array(width * height);
  let largest: number[] = [];
  const neighbors = [-1, 0, 1];
  for (let seed = 0; seed < mask.length; seed++) {
    if (mask[seed] !== classIndex || visited[seed]) continue;
    const component: number[] = [seed];
    const queue: number[] = [seed];
    visited[seed] = 1;
    for (let q = 0; q < queue.length; q++) {
      const index = queue[q];
      const y = Math.floor(index / width);
      const x = index - y * width;
      for (const dy of neighbors) for (const dx of neighbors) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (mask[next] !== classIndex || visited[next]) continue;
        visited[next] = 1;
        queue.push(next);
        component.push(next);
      }
    }
    if (component.length > largest.length) largest = component;
  }

  const pixelCount = largest.length;
  const coverage = pixelCount / (width * height);
  const detected = pixelCount >= MIN_PIXELS_FOR_DETECTION;
  if (!detected) {
    return { class: cls, detected: false, geometryStatus: "not_detected", pixelCount, coverage, boundingBox: null,
      start: null, end: null, curveScore: 0, lineLength: 0, normalizedLineLength: 0, avgThickness: 0 };
  }
  const toCropPoint = (index: number) => {
    const x = index % width, y = Math.floor(index / width);
    return { x: x / Math.max(1, width - 1) * Math.max(1, context.cropWidth - 1), y: y / Math.max(1, height - 1) * Math.max(1, context.cropHeight - 1) };
  };
  const componentPoints = largest.map(toCropPoint);
  const observedBoundingBox = {
    x0: Math.min(...componentPoints.map(point => point.x)), x1: Math.max(...componentPoints.map(point => point.x)),
    y0: Math.min(...componentPoints.map(point => point.y)), y1: Math.max(...componentPoints.map(point => point.y)),
  };
  const ambiguousObservation = (): OnnxLineObservation => ({ class: cls, detected: true, geometryStatus: "ambiguous", pixelCount, coverage,
    boundingBox: observedBoundingBox, start: null, end: null, curveScore: 0, lineLength: 0, normalizedLineLength: 0, avgThickness: 0 });

  // Thin the selected foreground component to a one-pixel skeleton. This is
  // deliberately mask-only: no line is inferred through background pixels.
  const binary = new Uint8Array(width * height);
  for (const index of largest) binary[index] = 1;
  const componentXs = largest.map(index => index % width), componentYs = largest.map(index => Math.floor(index / width));
  const componentWidth = Math.max(...componentXs) - Math.min(...componentXs) + 1;
  const componentHeight = Math.max(...componentYs) - Math.min(...componentYs) + 1;
  const alreadyThin = componentWidth <= 2 || componentHeight <= 2;
  const at = (x: number, y: number) => (x < 0 || x >= width || y < 0 || y >= height ? 0 : binary[y * width + x]);
  const neighbours = (x: number, y: number) => [
    at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1),
    at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1),
  ];
  const transitions = (values: number[]) => values.reduce((count, value, index) => count + (value === 0 && values[(index + 1) % values.length] === 1 ? 1 : 0), 0);
  let changed = true;
  while (changed) {
    changed = false;
    for (const phase of [0, 1]) {
      const remove: number[] = [];
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        if (!binary[y * width + x]) continue;
        const n = neighbours(x, y);
        const count = n.reduce((sum, value) => sum + value, 0);
        // A one-pixel-wide path is already a skeleton. Keeping degree-two
        // path pixels also prevents Zhang-Suen from eroding a valid thin line.
        if (alreadyThin && count === 2) continue;
        if (count < 2 || count > 6 || transitions(n) !== 1) continue;
        const [p2, , p4, , p6, , p8] = n;
        if (phase === 0 ? p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0 : p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) continue;
        remove.push(y * width + x);
      }
      for (const index of remove) binary[index] = 0;
      if (remove.length) changed = true;
    }
  }
  const skeleton = Array.from({ length: width * height }, (_, index) => index).filter(index => binary[index]);
  const skeletonNeighbours = (index: number) => {
    const y = Math.floor(index / width), x = index - y * width;
    const result: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || !binary[ny * width + nx]) continue;
      // Keep a genuine diagonal connection (e.g. a 45-degree line). If either
      // orthogonal side is foreground, the diagonal is a corner shortcut;
      // dropping that edge prevents a false triangle/junction while preserving
      // diagonals whose pixels are not connected through an orthogonal step.
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1 && (binary[y * width + x + dx] || binary[(y + dy) * width + x])) continue;
      result.push(ny * width + nx);
    }
    return result;
  };
  const endpoints = skeleton.filter(index => skeletonNeighbours(index).length === 1);
  const junctions = skeleton.filter(index => skeletonNeighbours(index).length > 2);
  // A loop has no endpoints; a fork has a junction or more than two ends.
  // Neither has a defensible single reading, so leave it undetected rather
  // than inventing a path through the mask.
  if (endpoints.length !== 2 || junctions.length > 0) {
    return ambiguousObservation();
  }
  const endpointSet = new Set(endpoints);
  const path: number[] = [endpoints[0]];
  let previous: number | null = null;
  let current = endpoints[0];
  while (current !== endpoints[1]) {
    const next = skeletonNeighbours(current).filter(index => index !== previous);
    if (next.length !== 1) {
      return ambiguousObservation();
    }
    previous = current;
    current = next[0];
    if (endpointSet.has(current) && current !== endpoints[1]) {
      return ambiguousObservation();
    }
    path.push(current);
    if (path.length > skeleton.length + 1) break;
  }
  if (current !== endpoints[1]) {
    return ambiguousObservation();
  }
  const points = path.map(toCropPoint);
  const fitAxis = (samples: { x: number; y: number }[]) => {
    const meanX = samples.reduce((sum, p) => sum + p.x, 0) / samples.length;
    const meanY = samples.reduce((sum, p) => sum + p.y, 0) / samples.length;
    let sxx = 0, syy = 0, sxy = 0;
    for (const p of samples) {
      const dx = p.x - meanX, dy = p.y - meanY;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
    }
    sxx /= samples.length; syy /= samples.length; sxy /= samples.length;
    const trace = sxx + syy;
    const determinant = sxx * syy - sxy * sxy;
    const discriminant = Math.max(0, trace * trace / 4 - determinant);
    const lambda = trace / 2 + Math.sqrt(discriminant);
    let dirX = sxy, dirY = lambda - sxx;
    const length = Math.hypot(dirX, dirY);
    if (length < 1e-6) { dirX = 1; dirY = 0; } else { dirX /= length; dirY /= length; }
    return { meanX, meanY, dirX, dirY };
  };
  const axis = fitAxis(points);
  const projected = points.map(point => ({
    point,
    projection: (point.x - axis.meanX) * axis.dirX + (point.y - axis.meanY) * axis.dirY,
    perpendicular: -(point.x - axis.meanX) * axis.dirY + (point.y - axis.meanY) * axis.dirX,
  }));
  // Curvature and length use consecutive skeleton pixels, not per-bin
  // averages. Thus a U keeps its two arms and its foreground-only turn.
  const pathLength = points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
  const maskPathLength = path.slice(1).reduce((sum, index, pathIndex) => {
    const previousIndex = path[pathIndex];
    return sum + Math.hypot((index % width) - (previousIndex % width), Math.floor(index / width) - Math.floor(previousIndex / width));
  }, 0);
  const centerMean = projected.reduce((sum, item) => sum + item.perpendicular, 0) / projected.length;
  const residualStd = Math.sqrt(projected.reduce((sum, item) => sum + (item.perpendicular - centerMean) ** 2, 0) / projected.length);
  const lineLength = Math.max(1, pathLength);
  const curveScore = residualStd / lineLength * 10;
  const pointNormalized = (point: { x: number; y: number }) => {
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    return { x: clamp(point.x / Math.max(1, context.cropWidth)), y: clamp(point.y / Math.max(1, context.cropHeight)) };
  };
  const x0 = Math.min(...points.map(point => point.x)), x1 = Math.max(...points.map(point => point.x));
  const y0 = Math.min(...points.map(point => point.y)), y1 = Math.max(...points.map(point => point.y));
  return {
    class: cls, detected: true, geometryStatus: "measurable", pixelCount, coverage,
    boundingBox: { x0, y0, x1, y1 },
    start: pointNormalized(points[0]), end: pointNormalized(points[points.length - 1]), curveScore,
    lineLength, normalizedLineLength: lineLength / Math.max(1, context.referenceSpan), avgThickness: pixelCount / Math.max(1, maskPathLength),
    pathPoints: points.map(pointNormalized),
  };
}

/**
 * 실제 ONNX 추론을 실행한다. 실패(모델 로드/추론 오류)하면 null을 반환하고
 * 절대 throw하지 않는다 — 호출부는 Sobel 휴리스틱으로만 계속 진행할 수 있다.
 * 성공 시 반환되는 모든 수치는 실제 model output에서 계산된 값이다.
 */
export async function runPalmLineOnnx(source: CanvasImageSource, context?: OnnxMeasurementContext): Promise<OnnxPalmLineResult | null> {
  try {
    const segmenter = await getSegmenter();
    const { mask, width, height } = await segmenter.segment(source);
    const sourceRecord = source as CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number; videoWidth?: number; videoHeight?: number; displayWidth?: number; displayHeight?: number };
    const sourceWidth = sourceRecord.width || sourceRecord.naturalWidth || sourceRecord.videoWidth || sourceRecord.displayWidth || width;
    const sourceHeight = sourceRecord.height || sourceRecord.naturalHeight || sourceRecord.videoHeight || sourceRecord.displayHeight || height;
    const observations: OnnxLineObservation[] = (["heart_line", "head_line", "life_line"] as const).map((cls) =>
      computeObservation(mask, width, height, cls, context ?? {
        cropWidth: sourceWidth,
        cropHeight: sourceHeight,
        referenceSpan: Math.max(sourceWidth, sourceHeight),
      }),
    );
    return { observations, maskWidth: width, maskHeight: height, mask, coordinateSpace: "source-crop-normalized-0to1" };
  } catch (err) {
    console.error("palm-line ONNX inference failed:", err);
    return null;
  }
}
