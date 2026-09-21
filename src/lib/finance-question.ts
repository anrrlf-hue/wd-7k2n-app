export type FinanceQuestionId = "status" | "goal" | "priority" | "leakage" | "order";

export interface FinanceQuestion {
  id: FinanceQuestionId;
  label: string;
  paywallTitle: string;
}

export const FINANCE_QUESTIONS: FinanceQuestion[] = [
  {
    id: "status",
    label: "내가 지금 돈 관리를 잘하고 있는지",
    paywallTitle: "나는 지금 잘 가고 있을까?",
  },
  {
    id: "goal",
    label: "내가 원하는 미래를 이룰 수 있을지",
    paywallTitle: "내가 원하는 미래, 지금의 선택으로 가능할까?",
  },
  {
    id: "priority",
    label: "지금 무엇부터 해야 하는지",
    paywallTitle: "지금 내게 가장 먼저 필요한 것은 뭘까?",
  },
  {
    id: "leakage",
    label: "왜 생각만큼 돈이 모이지 않는지",
    paywallTitle: "왜 열심히 하는데도 생각만큼 남지 않을까?",
  },
  {
    id: "order",
    label: "저축·대출·투자 중 무엇을 먼저 해야 하는지",
    paywallTitle: "저축·대출·투자, 지금은 무엇부터 해야 할까?",
  },
];

export function financeQuestion(id: FinanceQuestionId): FinanceQuestion {
  return FINANCE_QUESTIONS.find((item) => item.id === id) ?? FINANCE_QUESTIONS[0];
}
