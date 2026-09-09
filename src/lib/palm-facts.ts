// 손 검출/손금 특징 추출 결과의 구조화 타입.
// MediaPipe Hands(손 검출·랜드마크)는 그대로 재사용하고, "선 검출"은
// 검증된 오픈소스 모델이 없어(REUSE-FIRST 조사 결과) 랜드마크 기반 관심영역
// 위에서 계산하는 결정론적 엣지 휴리스틱으로 직접 만든다(GAP-only-BUILD).
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

export interface PalmFacts {
  handSide: HandSide;
  imageQuality: ImageQuality;
  handShape: HandShape;
  /** 신뢰 가능한 수준으로 "존재가 확인된" 선 이름만 포함 (없으면 빈 배열) */
  majorLines: LineName[];
  /** 선별 상세 특징. 검출되지 않은 선은 detected:false, length/direction:null */
  lineFeatures: LineFeature[];
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
