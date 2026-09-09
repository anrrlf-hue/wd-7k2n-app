// 현실 돈 고민 간이진단. 응답 점수를 합산해 3단계 유형으로만 분류하는 단순 규칙 기반 로직.

export interface MoneyCheckQuestion {
  id: string;
  question: string;
  options: { label: string; score: number }[];
}

export const MONEY_CHECK_QUESTIONS: MoneyCheckQuestion[] = [
  {
    id: "budget",
    question: "이번 달 내가 얼마 썼는지 바로 말할 수 있나요?",
    options: [
      { label: "네, 대략 알아요", score: 2 },
      { label: "카드값 보고 알아요", score: 1 },
      { label: "전혀 몰라요", score: 0 },
    ],
  },
  {
    id: "saving",
    question: "매달 일정 금액을 따로 저축하고 있나요?",
    options: [
      { label: "자동이체로 꼬박꼬박", score: 2 },
      { label: "남으면 가끔", score: 1 },
      { label: "저축은 못 하고 있어요", score: 0 },
    ],
  },
  {
    id: "impulse",
    question: "최근 한 달 안에 충동구매를 한 적이 있나요?",
    options: [
      { label: "없어요", score: 2 },
      { label: "한두 번 있어요", score: 1 },
      { label: "자주 있어요", score: 0 },
    ],
  },
  {
    id: "plan",
    question: "1년 뒤 나의 자산 목표가 있나요?",
    options: [
      { label: "구체적으로 있어요", score: 2 },
      { label: "막연하게는 있어요", score: 1 },
      { label: "생각해본 적 없어요", score: 0 },
    ],
  },
];

export type MoneyCheckResultType = "안정 관리형" | "느슨한 관리형" | "무계획 소비형";

export interface MoneyCheckResult {
  type: MoneyCheckResultType;
  description: string;
}

export function scoreMoneyCheck(answers: Record<string, number>): MoneyCheckResult {
  const total = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const max = MONEY_CHECK_QUESTIONS.length * 2;

  if (total >= max * 0.75) {
    return {
      type: "안정 관리형",
      description: "돈의 흐름을 잘 파악하고 있어요. 지금의 습관을 유지하면서 목표를 조금 더 구체화하면 좋겠어요.",
    };
  }
  if (total >= max * 0.4) {
    return {
      type: "느슨한 관리형",
      description: "기본기는 있지만 관리가 느슨해지는 순간들이 있어요. 작은 자동화 습관 하나면 크게 달라질 수 있어요.",
    };
  }
  return {
    type: "무계획 소비형",
    description: "돈이 어디로 새는지 파악하는 것부터 시작하면 좋겠어요. 전문가와 함께 짚어보면 훨씬 빨라질 거예요.",
  };
}
