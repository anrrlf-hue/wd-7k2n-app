// 손 검출/손금 특징 추출 결과의 구조화 타입.
// MediaPipe Hands(손 검출·랜드마크)는 그대로 재사용한다. 선 검출은 두
// 경로를 함께 유지한다:
//   1) lineFeatures — 기존 결정론적 Sobel 엣지 휴리스틱(GAP-BUILD)
//   2) onnxLines — samuelwbarber/palm-line-reader(MIT)의 실제 학습된
//      가중치를 onnxruntime-web으로 브라우저에서 직접 추론한 결과
//      (src/lib/palm-line-onnx.ts). 두 값을 하나로 평균내 섞지 않고
//      "실제 모델 관측값"과 "휴리스틱 신호"를 분리해서 보관한다 —
//      해석 레이어에서 "실제 관측값 vs 전통 해석"을 구분해 설명하기
//      위함이다. ONNX 추론이 실패하면 onnxLines는 null이고, 화면은
//      lineFeatures만으로 계속 동작한다(억지 해석 금지).
// 절대 "클리닉 수준 정밀 인식"이라 주장하지 않고, 낮은 신뢰도는 재촬영으로
// 유도한다.

export type HandSide = "left" | "right" | "unknown";

export type ImageQuality =
  | "good"
  | "no_hand_detected"
  | "too_dark"
  | "hand_cropped";

export type HandShape =
  | "square" // 손바닥이 사각형에 가깝고 손가락이 짧은 편
  | "rectangular" // 손바닥이 사각형에 가깝고 손가락이 긴 편
  | "elongated" // 손바닥이 길쭉하고 손가락이 짧은 편
  | "slender" // 손바닥이 길쭉하고 손가락도 긴 편
  | "unknown";

export type LineName = "생명선" | "감정선" | "두뇌선";
export type LineLength = "짧음" | "보통" | "김";
export type LineDirection = "완만한 곡선" | "직선에 가까움";

export interface LineFeature {
  name: LineName;
  detected: boolean;
  length: LineLength | null;
  direction: LineDirection | null;
  /** 0~1. 엣지 검출 신호 강도 기반 추정치이며 정밀 인식 신뢰도가 아니다. */
  confidence: number;
}

/** ONNX 모델(samuelwbarber/palm-line-reader)이 실제로 반환한 선 하나의
 * 구조화 관측값. 이 모델이 지원하지 않는 항목(분기/fork, 깊이의 물리적
 * 측정치)은 절대 지어내지 않고 null로 둔다. */
export interface OnnxLineDetail {
  detected: boolean;
  /** 0~1, 마스크 픽셀 커버리지 기반 — Sobel의 confidence와는 다른 산출식 */
  confidence: number;
  length: LineLength | null;
  curve: LineDirection | null;
  /** 마스크 픽셀 수(굵기·뚜렷함) 기반 근사치. 실제 "깊이"를 측정한 값이
   * 아니라는 걸 명시하기 위해 depthStrength로 이름 붙였다. */
  depthStrength: "약함" | "보통" | "강함" | null;
  /** 512x512 모델 좌표계를 0~1로 정규화한 시작점/끝점(주성분 투영 극값) */
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
  /** 이 모델은 분기(fork) 검출을 지원하지 않는다 — 항상 null. */
  branchDetected: null;
}

export interface OnnxPalmLines {
  modelExecuted: true;
  heartLine: OnnxLineDetail;
  headLine: OnnxLineDetail;
  lifeLine: OnnxLineDetail;
  /** 이 모델은 생명선/두뇌선/감정선 3종만 분할하며 재물선(fate line)은
   * 지원하지 않는다 — 억지로 채우지 않고 명시적으로 unknown 처리. */
  fateLine: { presence: "unknown"; note: string };
  mounts: "unknown";
  marks: "unknown";
  modelConfidence: number;
}

export interface PalmFacts {
  handSide: HandSide;
  imageQuality: ImageQuality;
  handShape: HandShape;
  /** 신뢰 가능한 수준으로 "존재가 확인된" 선 이름만 포함 (없으면 빈 배열) */
  majorLines: LineName[];
  /** 선별 상세 특징(Sobel 엣지 휴리스틱). 검출되지 않은 선은 detected:false, length/direction:null */
  lineFeatures: LineFeature[];
  /** 실제 ONNX 모델 추론 결과. 모델 로드/추론이 실패하면 null. */
  onnxLines: OnnxPalmLines | null;
  /** 전체 파이프라인 신뢰도 0~1 (손 검출 신뢰도 x 이미지 품질 보정) */
  confidence: number;
  /** 사용자에게 보여줄 경고/재촬영 사유 */
  warnings: string[];
}

/** 해석 단계로 넘어가도 되는지 판단하는 기준. 실패 시 재촬영을 요청한다. */
export function isPalmFactsUsable(facts: PalmFacts): boolean {
  if (facts.imageQuality !== "good") return false;
  if (facts.confidence < 0.35) return false;
  if (facts.majorLines.length === 0) return false;
  return true;
}
