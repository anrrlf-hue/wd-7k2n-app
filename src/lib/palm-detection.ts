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
import type { HandShape, HandSide, ImageQuality, LineFeature, LineName, PalmFacts } from "@/lib/palm-facts";

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
  const majorLines = lineFeatures.filter((f) => f.detected).map((f) => f.name);

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
    confidence,
    warnings,
  };
}
