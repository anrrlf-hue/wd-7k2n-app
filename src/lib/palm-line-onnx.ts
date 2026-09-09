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
const MIN_PIXELS_FOR_DETECTION = 60; // 512x512=262144픽셀 중 임계치. 노이즈성 소수 픽셀은 미검출로 처리.

export interface OnnxLineObservation {
  class: OnnxLineClass;
  detected: boolean;
  /** 마스크에서 이 클래스로 분류된 픽셀 수 — 실제 추론 결과 원값 */
  pixelCount: number;
  /** 0~1, 512x512 대비 픽셀 비율 */
  coverage: number;
  boundingBox: { x0: number; y0: number; x1: number; y1: number } | null;
  /** 주성분(선의 진행 방향) 투영값이 가장 작은/큰 점 — "시작점/끝점" 근사 */
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  /** 주성분 직선 대비 수직 잔차의 표준편차를 선 길이로 정규화한 값.
   * 0에 가까울수록 직선, 클수록 곡선. 임의 스케일(대략 0~1+)이며
   * "곡률의 물리량"이 아니라 상대적 지표다. */
  curveScore: number;
  /** 주성분 투영 범위(시작~끝 픽셀 거리). 512 기준 픽셀 단위. */
  lineLength: number;
  /** pixelCount / lineLength — 선의 평균 굵기 근사치(두께 프록시). */
  avgThickness: number;
}

export interface OnnxPalmLineResult {
  observations: OnnxLineObservation[];
  maskWidth: number;
  maskHeight: number;
}

function computeObservation(
  mask: Uint8Array,
  width: number,
  height: number,
  cls: OnnxLineClass,
): OnnxLineObservation {
  const classIndex = CLASS_INDEX[cls];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[row + x] === classIndex) {
        xs.push(x);
        ys.push(y);
      }
    }
  }

  const pixelCount = xs.length;
  const coverage = pixelCount / (width * height);
  const detected = pixelCount >= MIN_PIXELS_FOR_DETECTION;

  if (!detected) {
    return {
      class: cls,
      detected: false,
      pixelCount,
      coverage,
      boundingBox: null,
      start: null,
      end: null,
      curveScore: 0,
      lineLength: 0,
      avgThickness: 0,
    };
  }

  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);

  // 주성분 방향(PCA 1st component)을 2x2 공분산의 고유벡터로 직접 계산.
  const meanX = xs.reduce((a, b) => a + b, 0) / pixelCount;
  const meanY = ys.reduce((a, b) => a + b, 0) / pixelCount;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let i = 0; i < pixelCount; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= pixelCount;
  syy /= pixelCount;
  sxy /= pixelCount;

  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const discriminant = Math.max(0, trace * trace / 4 - det);
  const lambda1 = trace / 2 + Math.sqrt(discriminant);
  // 고유벡터 (sxy, lambda1 - sxx) 정규화. sxy가 0에 가까우면 축 정렬된 방향으로 처리.
  let dirX = sxy;
  let dirY = lambda1 - sxx;
  const dirLen = Math.hypot(dirX, dirY);
  if (dirLen < 1e-6) {
    dirX = 1;
    dirY = 0;
  } else {
    dirX /= dirLen;
    dirY /= dirLen;
  }

  let minProj = Infinity;
  let maxProj = -Infinity;
  let minIdx = 0;
  let maxIdx = 0;
  let residualSumSq = 0;
  for (let i = 0; i < pixelCount; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    const proj = dx * dirX + dy * dirY;
    const perp = -dx * dirY + dy * dirX; // 주성분 직선까지의 수직 거리
    residualSumSq += perp * perp;
    if (proj < minProj) {
      minProj = proj;
      minIdx = i;
    }
    if (proj > maxProj) {
      maxProj = proj;
      maxIdx = i;
    }
  }

  const lineLength = Math.max(1, maxProj - minProj);
  const residualStd = Math.sqrt(residualSumSq / pixelCount);
  const curveScore = (residualStd / lineLength) * 10; // 상대 지표로 스케일 조정
  const avgThickness = pixelCount / lineLength;

  return {
    class: cls,
    detected: true,
    pixelCount,
    coverage,
    boundingBox: { x0, y0, x1, y1 },
    start: { x: xs[minIdx], y: ys[minIdx] },
    end: { x: xs[maxIdx], y: ys[maxIdx] },
    curveScore,
    lineLength,
    avgThickness,
  };
}

/**
 * 실제 ONNX 추론을 실행한다. 실패(모델 로드/추론 오류)하면 null을 반환하고
 * 절대 throw하지 않는다 — 호출부는 Sobel 휴리스틱으로만 계속 진행할 수 있다.
 * 성공 시 반환되는 모든 수치는 실제 model output에서 계산된 값이다.
 */
export async function runPalmLineOnnx(source: CanvasImageSource): Promise<OnnxPalmLineResult | null> {
  try {
    const segmenter = await getSegmenter();
    const { mask, width, height } = await segmenter.segment(source);
    const observations: OnnxLineObservation[] = (["heart_line", "head_line", "life_line"] as const).map((cls) =>
      computeObservation(mask, width, height, cls),
    );
    return { observations, maskWidth: width, maskHeight: height };
  } catch (err) {
    console.error("palm-line ONNX inference failed:", err);
    return null;
  }
}
