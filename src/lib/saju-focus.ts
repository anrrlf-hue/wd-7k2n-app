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

/**
 * 무료 사주 관심사는 넓은 카테고리다.
 * 뒤의 현실질문은 더 세밀한 7개 분류를 유지하므로,
 * 오분류 위험이 적은 좁은 경우만 기본 선택값으로 넘긴다.
 */
export function initialRealityDomainForSajuFocus(
  focus: SajuFocus,
): "overall" | "money" | "wellbeing" | null {
  if (focus === "overall" || focus === "money" || focus === "wellbeing") return focus;
  return null;
}
