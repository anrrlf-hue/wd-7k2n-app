// 사주 요약 텍스트 + PalmFacts를 근거로 교차 해석을 만드는 프롬프트.
// 손금 쪽은 "정밀 인식이 아니라 랜드마크 기반 휴리스틱"이라는 한계를
// 프롬프트에 명시해, LLM이 손금 부분을 과신하지 않도록 한다.

import type { PalmFacts } from "@/lib/palm-facts";

export const CROSS_INTERPRETATION_SYSTEM_PROMPT = `당신은 사주(四柱) 해석과 손금 특징을 교차 비교해 "재물/돈" 관점 인사이트를 만드는 카피라이터입니다.

절대 규칙:
1. 주어진 사주 요약과 손금 특징(PalmFacts) 바깥의 사실을 지어내지 마세요. 손금 쪽은 신뢰도가 낮거나 검출 안 된 선(major_lines에 없는 선)에 대해서는 절대 있다고 말하지 마세요.
2. 손금 데이터는 랜드마크 기반의 단순 엣지 신호 휴리스틱이며 정밀 의학/감정 수준 인식이 아닙니다 — uncertaintyNote에 이 한계를 반드시 명시하세요.
3. "부자가 된다", "성공한다", "수익을 보장한다" 같은 확정적 미래·보장 표현을 쓰지 마세요.
4. common(공통점)과 differences(차이점)는 반드시 사주 요약의 구체적 내용과 PalmFacts의 구체적 값(손 모양, 검출된 선 이름)을 근거로 연결하세요. 막연한 말을 쓰지 마세요.
5. selfComparisonQuestion에는 사용자가 자기 경험과 비교하게 만드는 질문형 문장을 넣으세요.
6. 반드시 요청된 JSON 스키마로만 응답하세요.`;

export function buildCrossInterpretationUserPrompt(sajuSummaryText: string, palm: PalmFacts): string {
  const lineDesc = palm.lineFeatures
    .map((f) =>
      f.detected
        ? `${f.name}: 검출됨 (길이 ${f.length}, ${f.direction})`
        : `${f.name}: 뚜렷하게 검출되지 않음`,
    )
    .join(" / ");

  return `다음은 한 사람의 사주 해석 요약과, 같은 사람의 손 사진에서 뽑은 손금 특징(PalmFacts)입니다. 이 데이터만 근거로 "사주 x 손금" 교차 해석을 만들어주세요.

## 사주 요약
${sajuSummaryText}

## 손금 특징 (PalmFacts, 랜드마크 기반 휴리스틱 — 정밀 인식 아님)
- 손: ${palm.handSide === "left" ? "왼손" : palm.handSide === "right" ? "오른손" : "확인 안 됨"}
- 손 모양: ${palm.handShape}
- 검출된 주요 선: ${palm.majorLines.length > 0 ? palm.majorLines.join(", ") : "없음"}
- 선별 특징: ${lineDesc}
- 분석 신뢰도: ${(palm.confidence * 100).toFixed(0)}%

## 요청 스키마 (JSON만 응답)
{
  "common": "사주와 손금에서 공통으로 보이는 성향",
  "differences": "사주와 손금에서 서로 다르게 나타나는 부분",
  "moneyConnection": "돈/일/결정 스타일과 연결한 해석",
  "selfComparisonQuestion": "자기 경험과 비교하게 만드는 질문",
  "uncertaintyNote": "이 손금 분석의 한계(사진 기반 단순 특징 추출이며 정밀 인식이 아님)를 명시하는 문장"
}`;
}
