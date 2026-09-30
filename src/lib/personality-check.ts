// 무료 사주 개인화를 위한 짧은 자기정보 체크.
// 재무 습관을 묻지 않고, 연애·관계·일·생활 등 모든 분야에서 재사용할 수 있는
// 일반 성향 6축만 받는다. 사주 계산값을 바꾸는 용도가 아니라, 계산된 성향이
// 실제 생활에서 어떻게 드러나는지 설명할 때만 보조정보로 사용한다.

export interface PersonalityCheckItem {
  id: string;
  leftLabel: string;
  rightLabel: string;
}

export const PERSONALITY_CHECK_ITEMS: PersonalityCheckItem[] = [
  { id: "speed", leftLabel: "빠르게 결정", rightLabel: "충분히 생각" },
  { id: "plan", leftLabel: "계획을 세움", rightLabel: "상황에 맞춤" },
  { id: "change", leftLabel: "새로운 변화 선호", rightLabel: "익숙한 안정 선호" },
  { id: "autonomy", leftLabel: "혼자 판단", rightLabel: "주변 의견 고려" },
  { id: "emotionExpression", leftLabel: "감정을 바로 표현", rightLabel: "속으로 정리 후 표현" },
  { id: "socialEnergy", leftLabel: "사람과 있을 때 충전", rightLabel: "혼자 있을 때 충전" },
];

export type PersonalityCheckLevel = "왼쪽" | "중간" | "오른쪽" | "미확인";

export interface PersonalityCheckFacts {
  answers: Record<string, number>;
  levels: Record<string, PersonalityCheckLevel>;
}

function levelOf(v: number): PersonalityCheckLevel {
  if (!Number.isInteger(v) || v < 1 || v > 5) return "미확인";
  if (v <= 2) return "왼쪽";
  if (v >= 4) return "오른쪽";
  return "중간";
}

/** 과거 재무형 6문항 세션을 새 범용형으로 옮길 때 의미가 겹치는 4개만 유지한다. */
export function normalizePersonalityAnswers(
  answers: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!answers) return {};
  const normalized: Record<string, number> = {};
  for (const key of ["speed", "plan", "autonomy"] as const) {
    if (Number.isInteger(answers[key]) && answers[key] >= 1 && answers[key] <= 5) {
      normalized[key] = answers[key];
    }
  }
  const change = answers.change ?? answers.risk;
  if (Number.isInteger(change) && change >= 1 && change <= 5) normalized.change = change;
  if (Number.isInteger(answers.emotionExpression) && answers.emotionExpression >= 1 && answers.emotionExpression <= 5) {
    normalized.emotionExpression = answers.emotionExpression;
  }
  if (Number.isInteger(answers.socialEnergy) && answers.socialEnergy >= 1 && answers.socialEnergy <= 5) {
    normalized.socialEnergy = answers.socialEnergy;
  }
  return normalized;
}

export function scorePersonalityCheck(answers: Record<string, number>): PersonalityCheckFacts {
  const normalized = normalizePersonalityAnswers(answers);
  const levels: Record<string, PersonalityCheckLevel> = {};
  for (const item of PERSONALITY_CHECK_ITEMS) {
    levels[item.id] = levelOf(normalized[item.id]);
  }
  return { answers: normalized, levels };
}

export interface PersonalityInput {
  mbti: import("@/lib/mbti-facts").MbtiType | null;
  check: PersonalityCheckFacts | null;
}
