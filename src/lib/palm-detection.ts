// 브라우저 전용 모듈. MediaPipe HandLandmarker(Apache-2.0, 재사용)로 손을
// 검출하고, 랜드마크 기반 관심영역 위에서 palm-line-features.ts의 엣지
// 휴리스틱(직접 구현 — GAP)을 돌려 PalmFacts를 조립한다.
// 이미지는 서버로 전송하지 않고 전부 클라이언트에서 처리한다.

import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { analyzeEdgeBand, analyzeVerticalCreaseBand } from "@/lib/palm-line-features";
import { runPalmLineOnnx, preloadPalmLineModel, type OnnxLineClass, type OnnxLineObservation } from "@/lib/palm-line-onnx";
import type {
  HandShape,
  HandSide,
  ImageQuality,
  LineFeature,
  LineName,
  OnnxLineDetail,
  PalmFacts,
} from "@/lib/palm-facts";

let handLandmarkerPromise: Promise<HandLandmarker> | null = null;

function getHandLandmarker(): Promise<HandLandmarker> {
  if (!handLandmarkerPromise) {
    handLandmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
      return HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "/models/hand_landmarker.task",
        },
        runningMode: "IMAGE",
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
      });
    })();
  }
  return handLandmarkerPromise;
}

/** 앱 진입 시 미리 불러 첫 분석 지연을 줄이고 싶을 때 호출 (실패해도 무시) */
export function preloadHandLandmarker() {
  getHandLandmarker().catch(() => {});
  preloadPalmLineModel();
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function px(landmark: NormalizedLandmark, width: number, height: number) {
  return { x: landmark.x * width, y: landmark.y * height };
}

function averageBrightness(imageData: ImageData): number {
  const { data } = imageData;
  let sum = 0;
  const step = 16; // 전체 픽셀을 다 안 보고 샘플링해 속도 확보
  let count = 0;
  for (let i = 0; i < data.length; i += 4 * step) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function imageSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData;
  let sum = 0;
  let count = 0;
  const gray = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  };
  for (let y = 1; y < height - 1; y += 3) {
    for (let x = 1; x < width - 1; x += 3) {
      const gx = Math.abs(gray(x + 1, y) - gray(x - 1, y));
      const gy = Math.abs(gray(x, y + 1) - gray(x, y - 1));
      sum += gx + gy;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

function highlightRatio(imageData: ImageData): number {
  const { data } = imageData;
  let highlights = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4 * 8) {
    const y = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (y >= 245) highlights++;
    count++;
  }
  return count > 0 ? highlights / count : 0;
}

function isNearEdge(p: { x: number; y: number }, w: number, h: number, margin = 0.02) {
  return p.x < w * margin || p.x > w * (1 - margin) || p.y < h * margin || p.y > h * (1 - margin);
}

function classifyHandShape(landmarksPx: { x: number; y: number }[]): HandShape {
  const wrist = landmarksPx[0];
  const middleMcp = landmarksPx[9];
  const middleTip = landmarksPx[12];
  const indexMcp = landmarksPx[5];
  const pinkyMcp = landmarksPx[17];

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const palmLength = dist(wrist, middleMcp);
  const palmWidth = dist(indexMcp, pinkyMcp);
  const fingerLength = dist(middleMcp, middleTip);

  if (palmLength < 1e-3) return "unknown";

  const squareness = palmWidth / palmLength; // 클수록 사각형에 가까움
  const fingerRatio = fingerLength / palmLength; // 클수록 손가락이 긴 편

  const isSquare = squareness > 0.78;
  const isLongFingers = fingerRatio > 0.72;

  if (isSquare && !isLongFingers) return "square";
  if (isSquare && isLongFingers) return "rectangular";
  if (!isSquare && !isLongFingers) return "elongated";
  return "slender";
}

function palmBoundingBox(landmarksPx: { x: number; y: number }[]): Rect {
  const keyIdx = [0, 5, 9, 13, 17];
  const xs = keyIdx.map((i) => landmarksPx[i].x);
  const ys = keyIdx.map((i) => landmarksPx[i].y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function adaptivePalmMargin(landmarksPx: { x: number; y: number }[]): number {
  const box = palmBoundingBox(landmarksPx);
  const palmScale = Math.max(box.width, box.height);
  return Math.round(Math.max(70, Math.min(135, palmScale * 0.28)));
}

function enhancePalmContrast(source: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(source, 0, 0);

  const image = ctx.getImageData(0, 0, out.width, out.height);
  const { data, width, height } = image;
  const gray = new Float32Array(width * height);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const stride = width + 1;
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    for (let x = 1; x <= width; x++) {
      rowSum += gray[(y - 1) * width + (x - 1)];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }

  const radius = Math.max(6, Math.round(Math.min(width, height) * 0.025));
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * stride + (x1 + 1)] -
        integral[y0 * stride + (x1 + 1)] -
        integral[(y1 + 1) * stride + x0] +
        integral[y0 * stride + x0];
      const localMean = sum / area;
      const p = y * width + x;
      const delta = (gray[p] - localMean) * 0.55;
      const i = p * 4;
      data[i] = clamp((data[i] - 128) * 1.06 + 128 + delta);
      data[i + 1] = clamp((data[i + 1] - 128) * 1.06 + 128 + delta);
      data[i + 2] = clamp((data[i + 2] - 128) * 1.06 + 128 + delta);
    }
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

function extractLineFeatures(imageData: ImageData, landmarksPx: { x: number; y: number }[]): LineFeature[] {
  const box = palmBoundingBox(landmarksPx);
  const thumbMcp = landmarksPx[2];
  const palmCenterX = box.x + box.width / 2;
  const thumbOnLeft = thumbMcp.x < palmCenterX;

  const regions: Record<LineName, Rect> = {
    감정선: { x: box.x, y: box.y, width: box.width, height: box.height * 0.32 },
    두뇌선: { x: box.x, y: box.y + box.height * 0.3, width: box.width, height: box.height * 0.3 },
    생명선: thumbOnLeft
      ? { x: box.x, y: box.y, width: box.width * 0.42, height: box.height }
      : { x: box.x + box.width * 0.58, y: box.y, width: box.width * 0.42, height: box.height },
  };

  const DETECT_THRESHOLD = 0.12;

  return (Object.keys(regions) as LineName[]).map((name) => {
    const signal = analyzeEdgeBand(imageData, regions[name]);
    const detected = signal.density > DETECT_THRESHOLD && signal.span > 0.15;
    if (!detected) {
      return { name, detected: false, length: null, direction: null, confidence: Math.min(1, signal.density) };
    }
    const length = signal.span < 0.35 ? "짧음" : signal.span < 0.65 ? "보통" : "김";
    const direction = signal.curved ? "완만한 곡선" : "직선에 가까움";
    return { name, detected: true, length, direction, confidence: Math.min(1, signal.density) };
  });
}

/** palm-line-reader의 실제 학습 전처리(pipeline/hand_preprocess.py의
 * crop_and_rotate_hand)를 그대로 재현한다. 이전 버전(cropToCanvas, axis-aligned
 * bbox + 비례 padding)은 이 모델이 학습 때 실제로 본 프레임과 달라서
 * heart_line/head_line이 거의 검출되지 않았다 — upstream을 직접 읽어 확인한
 * 원인은 "손가락이 항상 위를 향하도록 회전"시킨 뒤 크롭한다는 점이었다
 * (우리는 원본 방향 그대로 axis-aligned crop만 하고 있었음).
 *
 * upstream 순서: wrist(0)→middle-MCP(9) 벡터가 수직 위를 향하도록 전체
 * 이미지를 회전 → 회전된 21개 랜드마크의 bbox + 고정 100px 마진으로 크롭 →
 * MediaPipe handedness가 "Left"가 아니면 좌우반전(학습 시 형태 변이를 줄이기
 * 위한 것으로, 실제 손잡이 판정이 아니라고 upstream 주석이 명시함).
 * 마진 100px은 upstream 스크립트의 고정값을 그대로 쓴 것 — 우리가 임의로
 * 추측한 padding 비율이 아니다. */
function cropAndRotatePalm(
  source: HTMLCanvasElement,
  landmarksPx: { x: number; y: number }[],
  isLeftHanded: boolean,
  margin = 100,
): HTMLCanvasElement {
  const wrist = landmarksPx[0];
  const middleMcp = landmarksPx[9];
  const v = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y };
  // wrist->middle-MCP 벡터를 수직 위(0,-r)로 돌리는 회전각.
  const angle = Math.atan2(-v.x, -v.y);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const cx = landmarksPx.reduce((sum, p) => sum + p.x, 0) / landmarksPx.length;
  const cy = landmarksPx.reduce((sum, p) => sum + p.y, 0) / landmarksPx.length;

  const rotatedRelative = landmarksPx.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  });
  const xs = rotatedRelative.map((p) => p.x);
  const ys = rotatedRelative.map((p) => p.y);
  const minX = Math.min(...xs) - margin;
  const minY = Math.min(...ys) - margin;
  const maxX = Math.max(...xs) + margin;
  const maxY = Math.max(...ys) + margin;
  const outW = Math.max(1, Math.round(maxX - minX));
  const outH = Math.max(1, Math.round(maxY - minY));

  const rotatedCanvas = document.createElement("canvas");
  rotatedCanvas.width = outW;
  rotatedCanvas.height = outH;
  const rctx = rotatedCanvas.getContext("2d");
  if (!rctx) return rotatedCanvas;
  rctx.translate(-minX, -minY);
  rctx.rotate(angle);
  rctx.translate(-cx, -cy);
  rctx.drawImage(source, 0, 0);

  if (isLeftHanded) return rotatedCanvas;

  const flipped = document.createElement("canvas");
  flipped.width = outW;
  flipped.height = outH;
  const fctx = flipped.getContext("2d");
  if (!fctx) return rotatedCanvas;
  fctx.translate(outW, 0);
  fctx.scale(-1, 1);
  fctx.drawImage(rotatedCanvas, 0, 0);
  return flipped;
}

function landmarksInPalmCrop(
  landmarksPx: { x: number; y: number }[],
  isLeftHanded: boolean,
  margin = 100,
): { x: number; y: number }[] {
  const wrist = landmarksPx[0];
  const middleMcp = landmarksPx[9];
  const v = { x: middleMcp.x - wrist.x, y: middleMcp.y - wrist.y };
  const angle = Math.atan2(-v.x, -v.y);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cx = landmarksPx.reduce((sum, p) => sum + p.x, 0) / landmarksPx.length;
  const cy = landmarksPx.reduce((sum, p) => sum + p.y, 0) / landmarksPx.length;
  const rotated = landmarksPx.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  });
  const minX = Math.min(...rotated.map((p) => p.x)) - margin;
  const minY = Math.min(...rotated.map((p) => p.y)) - margin;
  const maxX = Math.max(...rotated.map((p) => p.x)) + margin;
  const outW = Math.max(1, Math.round(maxX - minX));

  return rotated.map((p) => {
    const x = p.x - minX;
    const y = p.y - minY;
    return { x: isLeftHanded ? x : outW - x, y };
  });
}

const ONNX_CLASS_TO_LINE_NAME: Record<OnnxLineClass, LineName> = {
  heart_line: "감정선",
  head_line: "두뇌선",
  life_line: "생명선",
};

/** ONNX 추론이 실제로 반환한 픽셀 통계(lineLength/avgThickness/curveScore)를
 * 사람이 읽는 라벨로 분류한다. 라벨 경계값은 우리가 정한 근사 기준이지만,
 * 그 재료(픽셀 수·주성분 투영 범위)는 전부 실제 모델 출력에서 나온다.
 * 이전에는 여기서 Math.min(1, obs.coverage * 40)을 "confidence"로 반환했는데,
 * 40이라는 배율에 근거가 없어 검증된 정확도처럼 보이는 가짜 수치였다 —
 * 제거하고 detected(참/거짓)와 실제 관측 라벨만 반환한다. */
function classifySecondarySignal(
  signal: ReturnType<typeof analyzeVerticalCreaseBand>,
): "clear" | "faint" | "not_seen" {
  if (signal.continuity >= 0.38 && signal.contrast >= 0.25 && signal.density >= 0.08) return "clear";
  if (signal.continuity >= 0.22 && signal.contrast >= 0.18 && signal.density >= 0.04) return "faint";
  return "not_seen";
}

function secondarySignalScore(signal: ReturnType<typeof analyzeVerticalCreaseBand>): number {
  return signal.continuity * 0.55 + signal.contrast * 0.3 + signal.density * 0.15;
}

function bestSecondaryLineSignal(
  rawImage: ImageData,
  enhancedImage: ImageData,
  rois: Rect[],
  label: string,
): NonNullable<PalmFacts["secondaryLines"]>["fate"] {
  const bestFor = (image: ImageData) =>
    rois
      .map((roi) => analyzeVerticalCreaseBand(image, roi))
      .sort((a, b) => secondarySignalScore(b) - secondarySignalScore(a))[0];

  const raw = bestFor(rawImage);
  const enhanced = bestFor(enhancedImage);
  const rawStatus = classifySecondarySignal(raw);
  const enhancedStatus = classifySecondarySignal(enhanced);

  // 보정본 하나만 clear라고 해서 고객용 확정 신호로 승격하지 않는다.
  // 원본 clear 또는 원본 faint + 보정 clear처럼 두 경로가 함께 지지할 때만 clear.
  const status =
    rawStatus === "clear" || (rawStatus === "faint" && enhancedStatus === "clear")
      ? "clear"
      : rawStatus !== "not_seen" || enhancedStatus !== "not_seen"
        ? "faint"
        : "not_seen";

  const best = secondarySignalScore(enhanced) > secondarySignalScore(raw) ? enhanced : raw;
  const strength = Math.min(1, best.contrast * 0.55 + best.density * 0.45);

  return {
    status,
    strength,
    span: best.continuity,
    note:
      status === "clear"
        ? `${label} 후보가 원본과 보정 신호에서 함께 이어집니다.`
        : status === "faint"
          ? `${label} 후보가 일부 보이지만 아직 고객 해석에 쓰기엔 확인이 더 필요합니다.`
          : `${label} 후보의 연속된 주름 신호가 충분히 확인되지 않습니다.`,
  };
}

function detectSecondaryPalmLines(
  rawCrop: HTMLCanvasElement,
  enhancedCrop: HTMLCanvasElement,
  landmarks: { x: number; y: number }[],
): NonNullable<PalmFacts["secondaryLines"]> | undefined {
  const rawCtx = rawCrop.getContext("2d");
  const enhancedCtx = enhancedCrop.getContext("2d");
  if (
    !rawCtx ||
    !enhancedCtx ||
    rawCrop.width < 10 ||
    rawCrop.height < 10 ||
    landmarks.length < 18 ||
    rawCrop.width !== enhancedCrop.width ||
    rawCrop.height !== enhancedCrop.height
  ) {
    return undefined;
  }

  const rawImage = rawCtx.getImageData(0, 0, rawCrop.width, rawCrop.height);
  const enhancedImage = enhancedCtx.getImageData(0, 0, enhancedCrop.width, enhancedCrop.height);
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  const palmWidth = Math.max(12, Math.abs(indexMcp.x - pinkyMcp.x));
  const palmTopY = (indexMcp.y + middleMcp.y + ringMcp.y + pinkyMcp.y) / 4;
  const palmHeight = Math.max(20, wrist.y - palmTopY);
  const lowerY = Math.min(rawCrop.height - 1, wrist.y - palmHeight * 0.08);

  const roi = (centerX: number, widthRatio: number, startRatio: number, endRatio: number): Rect => {
    const width = palmWidth * widthRatio;
    const y = palmTopY + palmHeight * startRatio;
    const endY = Math.min(lowerY, palmTopY + palmHeight * endRatio);
    return {
      x: Math.max(0, Math.min(rawCrop.width - width, centerX - width / 2)),
      y: Math.max(0, y),
      width: Math.max(6, Math.min(width, rawCrop.width)),
      height: Math.max(10, endY - y),
    };
  };

  const shifted = (
    centerX: number,
    offsets: number[],
    widthRatio: number,
    startRatio: number,
    endRatio: number,
  ) => offsets.map((offset) => roi(centerX + palmWidth * offset, widthRatio, startRatio, endRatio));

  return {
    fate: bestSecondaryLineSignal(
      rawImage,
      enhancedImage,
      shifted(middleMcp.x, [-0.1, 0, 0.1], 0.24, 0.14, 0.92),
      "운명선",
    ),
    sun: bestSecondaryLineSignal(
      rawImage,
      enhancedImage,
      shifted(ringMcp.x, [-0.08, 0, 0.08], 0.22, 0.1, 0.7),
      "태양선",
    ),
    wealth: bestSecondaryLineSignal(
      rawImage,
      enhancedImage,
      shifted(pinkyMcp.x, [-0.08, 0, 0.08], 0.26, 0.08, 0.58),
      "재물선",
    ),
  };
}

function mapOnnxObservation(obs: OnnxLineObservation): OnnxLineDetail {
  if (!obs.detected) {
    return {
      detected: false,
      length: null,
      curve: null,
      depthStrength: null,
      start: null,
      end: null,
      branchDetected: null,
    };
  }
  const length = obs.lineLength < 150 ? "짧음" : obs.lineLength < 320 ? "보통" : "김";
  const curve = obs.curveScore > 0.35 ? "완만한 곡선" : "직선에 가까움";
  const depthStrength = obs.avgThickness < 2.2 ? "약함" : obs.avgThickness < 4 ? "보통" : "강함";
  const norm = (p: { x: number; y: number } | null) => (p ? { x: p.x / 512, y: p.y / 512 } : null);
  return {
    detected: true,
    length,
    curve,
    depthStrength,
    start: norm(obs.start),
    end: norm(obs.end),
    branchDetected: null,
  };
}

export interface PalmAnalysisSource {
  image: CanvasImageSource & { width: number; height: number };
  canvas: HTMLCanvasElement;
}

/**
 * 이미지(캔버스에 이미 그려진 상태)를 분석해 PalmFacts를 만든다.
 * 손 미검출/저조도/손 잘림 중 하나라도 걸리면 선 분석 없이 바로 재촬영
 * 사유(warnings)와 함께 반환한다 — "억지 해석 금지" 원칙.
 */
export async function analyzePalmFromCanvas(canvas: HTMLCanvasElement): Promise<PalmFacts> {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      handSide: "unknown",
      imageQuality: "no_hand_detected",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["이미지를 처리할 수 없어요. 다른 사진으로 다시 시도해주세요."],
    };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const brightness = averageBrightness(imageData);
  const sharpness = imageSharpness(imageData);
  const highlights = highlightRatio(imageData);

  if (brightness < 45) {
    return {
      handSide: "unknown",
      imageQuality: "too_dark",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["사진이 너무 어두워요. 밝은 곳에서 손바닥이 잘 보이게 다시 찍어주세요."],
    };
  }

  const landmarker = await getHandLandmarker();
  const result = landmarker.detect(canvas);

  if (!result.landmarks || result.landmarks.length === 0) {
    return {
      handSide: "unknown",
      imageQuality: "no_hand_detected",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["손이 잘 안 보여요. 손바닥 전체가 프레임 안에 들어오게 다시 찍어주세요."],
    };
  }

  const landmarks = result.landmarks[0];
  const landmarksPx = landmarks.map((l) => px(l, canvas.width, canvas.height));

  const keyIndices = [0, 1, 4, 5, 8, 9, 12, 13, 16, 17, 20];
  const cropped = keyIndices.some((i) => isNearEdge(landmarksPx[i], canvas.width, canvas.height));
  if (cropped) {
    return {
      handSide: "unknown",
      imageQuality: "hand_cropped",
      handShape: "unknown",
      majorLines: [],
      lineFeatures: [],
      onnxLines: null,
      confidence: 0,
      warnings: ["손바닥 일부가 사진 밖으로 잘렸어요. 손 전체가 나오게 조금 더 멀리서 다시 찍어주세요."],
    };
  }

  const handednessCategory = result.handedness[0]?.[0];
  const handSide: HandSide =
    handednessCategory?.categoryName === "Left"
      ? "left"
      : handednessCategory?.categoryName === "Right"
        ? "right"
        : "unknown";
  const detectionConfidence = handednessCategory?.score ?? 0.5;

  const handShape = classifyHandShape(landmarksPx);
  const lineFeatures = extractLineFeatures(imageData, landmarksPx);

  // 1차는 upstream과 같은 fixed 100px crop을 그대로 둔다.
  // 2차는 손 크기에 맞춘 crop + 국소 대비 보정본을 사용한다.
  // 기존 원본에서 잡힌 선은 절대 덮어쓰지 않고, 원본이 놓친 선만 2차 결과로 보완한다.
  const rawPalmCrop = cropAndRotatePalm(canvas, landmarksPx, handSide === "left", 100);
  const adaptiveMargin = adaptivePalmMargin(landmarksPx);
  const adaptivePalmCrop = cropAndRotatePalm(canvas, landmarksPx, handSide === "left", adaptiveMargin);
  const enhancedPalmCrop = enhancePalmContrast(adaptivePalmCrop);
  const palmCropLandmarks = landmarksInPalmCrop(landmarksPx, handSide === "left", adaptiveMargin);
  const secondaryLines = detectSecondaryPalmLines(adaptivePalmCrop, enhancedPalmCrop, palmCropLandmarks);

  const onnxRaw = await runPalmLineOnnx(rawPalmCrop);
  const rawDetectedBeforeFallback = onnxRaw?.observations.filter((o) => o.detected).length ?? 0;
  const enhancedAttempted = rawDetectedBeforeFallback < 3;
  const onnxEnhanced = enhancedAttempted ? await runPalmLineOnnx(enhancedPalmCrop) : null;

  const chooseObservation = (cls: OnnxLineClass): { observation: OnnxLineObservation | null; variant: "raw" | "enhanced" } => {
    const raw = onnxRaw?.observations.find((o) => o.class === cls) ?? null;
    const enhanced = onnxEnhanced?.observations.find((o) => o.class === cls) ?? null;
    if (raw?.detected) return { observation: raw, variant: "raw" };
    if (enhanced?.detected) return { observation: enhanced, variant: "enhanced" };
    return { observation: raw ?? enhanced, variant: raw ? "raw" : "enhanced" };
  };

  const heartChoice = chooseObservation("heart_line");
  const headChoice = chooseObservation("head_line");
  const lifeChoice = chooseObservation("life_line");
  const modelExecuted = Boolean(onnxRaw || onnxEnhanced);

  const missingObservation = (cls: OnnxLineClass): OnnxLineObservation => ({
    class: cls,
    detected: false,
    pixelCount: 0,
    coverage: 0,
    boundingBox: null,
    start: null,
    end: null,
    curveScore: 0,
    lineLength: 0,
    avgThickness: 0,
  });

  const onnxLines: PalmFacts["onnxLines"] = modelExecuted
    ? {
        modelExecuted: true,
        heartLine: mapOnnxObservation(heartChoice.observation ?? missingObservation("heart_line")),
        headLine: mapOnnxObservation(headChoice.observation ?? missingObservation("head_line")),
        lifeLine: mapOnnxObservation(lifeChoice.observation ?? missingObservation("life_line")),
        fateLine: { presence: "unknown", note: "현재 3선 모델은 운명선(fate line)을 분할하지 않아 별도 검증이 필요합니다." },
        mounts: "unknown",
        marks: "unknown",
      }
    : null;

  const rawDetectedLineCount = onnxRaw?.observations.filter((o) => o.detected).length ?? 0;
  const enhancedDetectedLineCount = onnxEnhanced?.observations.filter((o) => o.detected).length ?? 0;
  const pixelCount = (result: typeof onnxRaw, cls: OnnxLineClass) =>
    result?.observations.find((o) => o.class === cls)?.pixelCount ?? 0;
  const pipelineDiagnostics = {
    sourceWidth: canvas.width,
    sourceHeight: canvas.height,
    averageBrightness: brightness,
    sharpness,
    highlightRatio: highlights,
    adaptiveMargin,
    rawCropWidth: rawPalmCrop.width,
    rawCropHeight: rawPalmCrop.height,
    enhancedCropWidth: enhancedPalmCrop.width,
    enhancedCropHeight: enhancedPalmCrop.height,
    rawDetectedLineCount,
    enhancedAttempted,
    enhancedDetectedLineCount,
    rawPixelCount: {
      heartLine: pixelCount(onnxRaw, "heart_line"),
      headLine: pixelCount(onnxRaw, "head_line"),
      lifeLine: pixelCount(onnxRaw, "life_line"),
    },
    enhancedPixelCount: {
      heartLine: pixelCount(onnxEnhanced, "heart_line"),
      headLine: pixelCount(onnxEnhanced, "head_line"),
      lifeLine: pixelCount(onnxEnhanced, "life_line"),
    },
    chosenVariant: {
      heartLine: heartChoice.variant,
      headLine: headChoice.variant,
      lifeLine: lifeChoice.variant,
    },
  } as const;
  console.debug("[palm-pipeline]", pipelineDiagnostics);

  const onnxDetectedNames: LineName[] = onnxLines
    ? (["heart_line", "head_line", "life_line"] as const)
        .filter((cls) => onnxLines[cls === "heart_line" ? "heartLine" : cls === "head_line" ? "headLine" : "lifeLine"].detected)
        .map((cls) => ONNX_CLASS_TO_LINE_NAME[cls])
    : [];
  const sobelDetectedNames = lineFeatures.filter((f) => f.detected).map((f) => f.name);
  const majorLines = Array.from(new Set([...sobelDetectedNames, ...onnxDetectedNames]));

  const lineConfidences = lineFeatures.map((f) => f.confidence);
  const avgLineConfidence =
    lineConfidences.length > 0 ? lineConfidences.reduce((a, b) => a + b, 0) / lineConfidences.length : 0;
  const confidence = detectionConfidence * 0.6 + avgLineConfidence * 0.4;

  const warnings: string[] = [];
  const imageQuality: ImageQuality = "good";
  if (highlights > 0.35) {
    warnings.push("손바닥에 빛 반사가 강해 일부 얇은 선이 약하게 보일 수 있어요.");
  }
  if (sharpness < 4) {
    warnings.push("사진 초점이 많이 흐려 얇은 손금선이 덜 잡힐 수 있어요.");
  }
  if (majorLines.length === 0) {
    warnings.push("주요 선이 뚜렷하게 보이지 않았어요. 손바닥을 펴고 조명이 잘 드는 곳에서 다시 찍어보세요.");
  }

  return {
    handSide,
    imageQuality,
    handShape,
    majorLines,
    lineFeatures,
    onnxLines,
    secondaryLines,
    confidence,
    pipelineDiagnostics,
    warnings,
  };
}
