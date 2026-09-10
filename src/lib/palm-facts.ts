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
  /** 0~1, MediaPipe 손 검출 확률과 Sobel 엣지 밀도를 섞은 내부 임계값용
   * 수치일 뿐 검증된 정확도가 아니다 — isPalmFactsUsable()의 재촬영 판단에만
   * 쓰고, 사용자에게 "신뢰도/정확도 %"로 노출하지 않는다. */
  confidence: number;
  /** 사용자에게 보여줄 경고/재촬영 사유 */
  warnings: string[];
}

/** 실제 ONNX가 검출한 선 개수(0~3). majorLines(Sobel+ONNX 합집합)는 성공
 * 판정에 쓰지 않는다 — Sobel 혼자 "검출됐다"고 우겨도 손금 리포트를
 * 만들어서는 안 되기 때문이다(그럴듯해 보이는 가짜 결과 방지). */
export function onnxDetectedLineCount(facts: PalmFacts): number {
  if (!facts.onnxLines) return 0;
  const { heartLine, headLine, lifeLine } = facts.onnxLines;
  return [heartLine, headLine, lifeLine].filter((l) => l.detected).length;
}

/** 해석 단계로 넘어가도 되는지 판단하는 기준. 성공 판정은 오직 실제 ONNX
 * 결과로만 한다 — imageQuality 통과 + 모델이 실제로 실행됐고(modelExecuted)
 * + 3개 선 중 최소 2개를 실제로 검출했을 때만 usable이다. Sobel 휴리스틱
 * (lineFeatures/confidence)은 여기서 절대 성공 기준에 넣지 않는다: Sobel은
 * 촬영 품질 보조/디버그 신호일 뿐, ONNX가 못 본 선을 있다고 우겨서 손금
 * 리포트가 만들어지게 해서는 안 된다. 실패 시 재촬영을 요청한다. */
export function isPalmFactsUsable(facts: PalmFacts): boolean {
  if (facts.imageQuality !== "good") return false;
  if (!facts.onnxLines || !facts.onnxLines.modelExecuted) return false;
  if (onnxDetectedLineCount(facts) < 2) return false;
  return true;
}

/** 재촬영 화면에 보여줄, 실패 원인별 짧은 안내. attempt(1부터)가 올라갈수록
 * 더 구체적인 촬영 팁으로 escalate한다(연속 실패 UX). */
export function describePalmFailureReasons(facts: PalmFacts, attempt: number): string[] {
  const reasons: string[] = [];
  if (facts.imageQuality === "no_hand_detected") {
    reasons.push("사진에서 손을 찾지 못했어요.");
  } else if (facts.imageQuality === "too_dark") {
    reasons.push("사진이 너무 어두워서 선이 잘 안 보여요.");
  } else if (facts.imageQuality === "hand_cropped") {
    reasons.push("손 일부가 사진 밖으로 잘렸어요.");
  } else if (!facts.onnxLines || !facts.onnxLines.modelExecuted) {
    reasons.push("손금선 분석 모델이 이번 사진을 처리하지 못했어요.");
  } else {
    const n = onnxDetectedLineCount(facts);
    reasons.push(`손금선이 ${n}개만 뚜렷하게 읽혀서 결과를 만들기엔 부족해요.`);
  }

  if (attempt >= 2) {
    reasons.push(
      "손바닥을 완전히 펴고, 화면 안에 손바닥 전체(손가락 끝~손목)가 다 들어오게 촬영해보세요.",
      "그림자 없이 정면에서 밝은 빛이 손바닥에 고르게 비치는 곳을 찾아보세요.",
    );
  }
  return reasons;
}
