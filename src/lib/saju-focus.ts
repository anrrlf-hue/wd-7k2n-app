export const SAJU_FOCUS_VALUES = [
  "overall",
  "love",
  "money",
  "career",
  "work_business",
  "relationship",
  "wellbeing",
] as const;

export type SajuFocus = (typeof SAJU_FOCUS_VALUES)[number];

export const SAJU_FOCUS_LABELS: Record<SajuFocus, string> = {
  overall: "전체 사주",
  love: "연애·결혼",
  money: "돈·재물",
  career: "취업·이직",
  work_business: "직장·사업",
  relationship: "인간관계",
  wellbeing: "생활·건강",
};

export const SAJU_FOCUS_SHORT_DESCRIPTIONS: Record<SajuFocus, string> = {
  overall: "성향·관계·일·재물·현재 흐름을 전체적으로",
  love: "연애에서의 나와 관계 패턴을 먼저",
  money: "재물 성향과 돈을 다루는 방식을 먼저",
  career: "취업·이직과 일하는 방식을 먼저",
  work_business: "직장·사업과 역할 선택을 먼저",
  relationship: "사람 사이에서 반복되는 관계 패턴을 먼저",
  wellbeing: "생활 리듬과 스트레스 패턴을 먼저",
};

export function parseSajuFocus(value: string | null | undefined): SajuFocus {
  return value && (SAJU_FOCUS_VALUES as readonly string[]).includes(value)
    ? (value as SajuFocus)
    : "overall";
}
