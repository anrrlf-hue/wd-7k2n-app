// "실제 관측값"과 "손금 전통 해석"을 분리해서 문장으로 만든다.
// 관측값 문장은 오직 실제 ONNX 추론 결과(palm-line-onnx.ts)의 수치만 쓴다.
// 전통 해석 문장은 명시적으로 "전통적으로/관상학적으로 보는 편"이라고
// 표현해, 과학적으로 검증된 사실처럼 말하지 않는다. 검출되지 않은 선에는
// 전통 해석도 붙이지 않는다("있다고 말하지 않는다").

import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";

const LINE_LABEL = { heartLine: "감정선", headLine: "두뇌선", lifeLine: "생명선" } as const;

/** ① 실제 이미지 관측 — ONNX 모델이 실제로 반환한 수치만 사용 */
export function buildRealObservationText(facts: PalmFacts): string {
  if (!facts.onnxLines) {
    return "이번 사진은 실제 이미지 분석 모델(palm-line-reader)이 결과를 내지 못했어요. 아래 결과는 윤곽선 기반 보조 신호만 사용했어요.";
  }
  const parts = (["heartLine", "headLine", "lifeLine"] as const).map((key) => {
    const d: OnnxLineDetail = facts.onnxLines![key];
    const label = LINE_LABEL[key];
    if (!d.detected) return `${label}: 이번 사진에서는 모델이 뚜렷하게 검출하지 못했어요`;
    return `${label}: 검출됨(${d.length}, ${d.curve})`;
  });
  return parts.join(" · ");
}

/** ② 손금 전통 해석 — 검출된 선에만 붙이고, 항상 "전통적으로 보는 편" 톤을 유지 */
export function buildTraditionalReadingText(facts: PalmFacts): string {
  if (!facts.onnxLines) return "실제 검출 결과가 없어 전통 해석도 이번엔 생략할게요.";

  const notes: string[] = [];
  const heart = facts.onnxLines.heartLine;
  const head = facts.onnxLines.headLine;
  const life = facts.onnxLines.lifeLine;

  if (heart.detected) {
    notes.push(
      heart.curve === "완만한 곡선"
        ? "감정선이 완만한 곡선으로 보여서, 전통적인 손금 해석에서는 감정 표현이 유연한 편으로 보는 경우가 많아요."
        : "감정선이 직선에 가까워서, 전통적인 손금 해석에서는 감정보다 이성을 앞세우는 편으로 보는 경우가 많아요.",
    );
  }
  if (head.detected) {
    notes.push(
      head.curve === "완만한 곡선"
        ? "두뇌선이 완만한 곡선이면, 전통적으로 직관적이고 유연한 사고방식과 연결해서 보는 편이에요."
        : "두뇌선이 직선에 가까우면, 전통적으로 분석적이고 논리적인 사고방식과 연결해서 보는 편이에요.",
    );
  }
  if (life.detected) {
    notes.push(
      life.depthStrength === "강함"
        ? "생명선이 뚜렷하게 나타나서, 전통적으로 활력·지구력과 연결해서 보는 편이에요."
        : "생명선이 비교적 옅게 나타나서, 전통적으로는 컨디션 관리에 좀 더 신경 쓰라는 신호로 보는 편이에요.",
    );
  }

  if (notes.length === 0) {
    return "이번 사진에서는 전통 해석을 붙일 만큼 뚜렷하게 검출된 선이 적어요 — 억지로 해석을 만들지 않을게요.";
  }
  return notes.join(" ");
}
