// 브라우저 전용 모듈. MediaPipe HandLandmarker(Apache-2.0, 재사용)로 손을
// 검출하고, 랜드마크 기반 관심영역 위에서 palm-line-features.ts의 엣지
// 휴리스틱(직접 구현 — GAP)을 돌려 PalmFacts를 조립한다.
// 이미지는 서버로 전송하지 않고 전부 클라이언트에서 처리한다.

import {
  FilesetResolver,
  HandLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { analyzeEdgeBand } from "@/lib/palm-line-features";
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

/** MediaPipe 손 랜드마크로 잡은 손바닥 영역을 여유(padding)를 두고 잘라낸다.
 * palm-line-reader 모델은 "손금이 프레임을 채운 근접 크롭"으로 학습돼서,
 * 원본 전체 사진을 그대로 넣는 것보다 이렇게 잘라 넣어야 학습 조건에 가깝다. */
function cropToCanvas(source: HTMLCanvasElement, box: Rect, padding = 0.18): HTMLCanvasElement {
  const padX = box.width * padding;
  const padY = box.height * padding;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const w = Math.min(source.width - x, box.width + padX * 2);
  const h = Math.min(source.height - y, box.height + padY * 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(source, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const ONNX_CLASS_TO_LINE_NAME: Record<OnnxLineClass, LineName> = {
  heart_line: "감정선",
  head_line: "두뇌선",
  life_line: "생명선",
};

/** ONNX 추론이 실제로 반환한 픽셀 통계(lineLength/avgThickness/curveScore)를
 * 사람이 읽는 라벨로 분류한다. 라벨 경계값은 우리가 정한 근사 기준이지만,
 * 그 재료(픽셀 수·주성분 투영 범위)는 전부 실제 모델 출력에서 나온다. */
function mapOnnxObservation(obs: OnnxLineObservation): OnnxLineDetail {
  if (!obs.detected) {
    return {
      detected: false,
      confidence: Math.min(1, obs.coverage * 40),
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
    confidence: Math.min(1, obs.coverage * 40),
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

  // 실제 ONNX 모델 추론 — MediaPipe로 잡은 손바닥 영역만 크롭해서 넣는다.
  // 실패해도(모델 로드 실패, 추론 오류) null만 반환하고 Sobel 결과로 계속 진행한다.
  const box = palmBoundingBox(landmarksPx);
  const palmCrop = cropToCanvas(canvas, box);
  const onnxRaw = await runPalmLineOnnx(palmCrop);
  const onnxLines: PalmFacts["onnxLines"] = onnxRaw
    ? {
        modelExecuted: true,
        heartLine: mapOnnxObservation(onnxRaw.observations.find((o) => o.class === "heart_line")!),
        headLine: mapOnnxObservation(onnxRaw.observations.find((o) => o.class === "head_line")!),
        lifeLine: mapOnnxObservation(onnxRaw.observations.find((o) => o.class === "life_line")!),
        fateLine: { presence: "unknown", note: "이 모델은 재물선(fate line)을 분할하지 않아 확인할 수 없어요." },
        mounts: "unknown",
        marks: "unknown",
        modelConfidence:
          onnxRaw.observations.filter((o) => o.detected).reduce((sum, o) => sum + Math.min(1, o.coverage * 40), 0) /
          Math.max(1, onnxRaw.observations.filter((o) => o.detected).length),
      }
    : null;

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
  if (majorLines.length === 0) {
    warnings.push("주요 선이 뚜렷하게 검출되지 않았어요. 손바닥을 펴고 조명이 잘 드는 곳에서 다시 찍어보세요.");
  }

  return {
    handSide,
    imageQuality,
    handShape,
    majorLines,
    lineFeatures,
    onnxLines,
    confidence,
    warnings,
  };
}
