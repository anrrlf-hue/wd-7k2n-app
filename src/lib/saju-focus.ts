export const SAJU_FOCUS_VALUES = [
  "overall",
  "love_relationship",
  "work",
  "money",
  "wellbeing",
] as const;

export type SajuFocus = (typeof SAJU_FOCUS_VALUES)[number];

export const SAJU_FOCUS_LABELS: Record<SajuFocus, string> = {
  overall: "전체 사주",
  love_relationship: "연애·인간관계",
  work: "일·직업·사업",
  money: "돈·재물",
  wellbeing: "생활·건강",
};

export const SAJU_FOCUS_SHORT_DESCRIPTIONS: Record<SajuFocus, string> = {
  overall: "성향·관계·일·재물·생활·현재 흐름을 넓게",
  love_relationship: "연애와 사람관계에서 반복되는 내 패턴을 깊게",
  work: "직업·이직·직장·사업에서 힘이 나는 방식을 깊게",
  money: "돈을 만들고 지키고 기회를 대하는 방식을 깊게",
  wellbeing: "생활 리듬·스트레스·회복 방식을 깊게",
};

/** 과거 7개 선택값도 새 5개 구조로 안전하게 흡수한다. */
export function parseSajuFocus(value: string | null | undefined): SajuFocus {
  if (!value) return "overall";
  if ((SAJU_FOCUS_VALUES as readonly string[]).includes(value)) return value as SajuFocus;

  if (value === "love" || value === "relationship") return "love_relationship";
  if (value === "career" || value === "work_business") return "work";
  if (value === "money") return "money";
  if (value === "wellbeing") return "wellbeing";
  return "overall";
}

/** 사용자에게 보이는 선택은 처음부터 끝까지 이 5개로 유지한다.
 * 내부 질문 엔진만 넓은 카테고리 안에서 세부 분야를 자동으로 나눈다. */
export function realityDomainForSajuFocus(
  focus: SajuFocus,
  parsedDomain: import("@/lib/reality-answer-contract").RealityAnswerDomain | null,
): import("@/lib/reality-answer-contract").RealityAnswerDomain {
  if (focus === "overall") return parsedDomain ?? "overall";
  if (focus === "money") return "money";
  if (focus === "wellbeing") return "wellbeing";

  if (focus === "love_relationship") {
    return parsedDomain === "relationship" ? "relationship" : "love";
  }

  if (focus === "work") {
    return parsedDomain === "career" ? "career" : "work_business";
  }

  return "overall";
}
