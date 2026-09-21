import { z } from "zod";
import { SURVEY_USAGE } from "@/lib/survey-usage";

const text = z.string().trim().min(1);
export const CounselingPatternSchema = z.object({
  id: text,
  sourceRef: text,
  anonymized: z.literal(true),
  context: text,
  observedFact: z.array(text).min(1),
  followup: z.array(text),
  diagnosisPattern: text,
  action: text, // Recorded proposal, not an automatically approved product rule.
  questionIds: z.array(text.refine(id => Object.hasOwn(SURVEY_USAGE, id), "Unknown survey question")),
  outcome: z.discriminatedUnion("status", [
    z.object({ status: z.literal("unknown") }).strict(),
    z.object({ status: z.literal("confirmed"), measuredAt: z.iso.date(), measurement: text, sourceRef: text }).strict(),
  ]),
}).strict();
export type CounselingPattern = z.infer<typeof CounselingPatternSchema>;
// 실제 상담 답변 묶음에서 반복된 "질문·판단 순서"만 익명화해 남긴다.
// 특정 상품 추천이나 상담사의 개인 시장관은 재사용하지 않으며,
// outcome=unknown은 이 행동의 효과가 측정·검증됐다는 뜻이 아님을 명시한다.
export const COUNSELING_PATTERNS: readonly CounselingPattern[] = CounselingPatternSchema.array().parse([
  {
    id: "reconcile_missing_cashflow_before_judgment",
    sourceRef: "Gmail final-answer batches 0828/0904 · 1a052588c5c5d15e / 1a078929c9a5a13b",
    anonymized: true,
    context: "계산상 잉여금이 보여도 교통·변동지출·일회성 지출 등 누락 항목이 있으면 실제 잉여금으로 단정하지 않은 상담들",
    observedFact: [
      "입력된 소득·지출 합계와 실제 통장·카드 흐름이 다를 수 있었다.",
      "저축·투자 납입액이 매월 반복되는 금액인지 재확인이 필요했다.",
    ],
    followup: [
      "최근 거래내역과 입력 지출을 대조한다.",
      "누락 지출과 정기 저축·투자 여부를 확인한다.",
    ],
    diagnosisPattern: "계산상 잔액만으로 안정·적자를 단정하지 않고 누락과 반복성부터 확인한다.",
    action: "최근 거래내역으로 월 현금흐름의 빈칸을 먼저 맞춘다.",
    questionIds: ["monthlyIncomeKrw", "monthlyFixedCostKrw", "monthlyLivingCostKrw", "monthlySavingsKrw", "expenseAwareness"],
    outcome: { status: "unknown" },
  },
  {
    id: "income_transition_buffer_before_growth",
    sourceRef: "재무상담 최종답변 묶음 · 2026-09-03 / 2026-09-04",
    anonymized: true,
    context: "퇴직·이직·시험준비 등으로 소득 감소나 중단 가능성이 있는 상담들",
    observedFact: [
      "현재 평균 소득보다 앞으로 소득이 줄거나 끊기는 시점이 우선순위를 바꿨다.",
      "장기 자산 확대보다 그 기간의 생활비와 바로 쓸 현금 확인이 먼저였다.",
    ],
    followup: [
      "소득이 달라지는 시점을 확인한다.",
      "소득 공백 기간과 생활비 안전판을 확인한다.",
    ],
    diagnosisPattern: "가까운 소득 공백이 있으면 장기 계획보다 생활 유지 가능성을 먼저 본다.",
    action: "소득 변화 시점과 그 기간에 필요한 생활비·현금을 나란히 확인한다.",
    questionIds: ["jobType", "futureEvents", "futureEventTiming", "futureIncomeChange", "futureLivingBuffer", "emergencyFund"],
    outcome: { status: "unknown" },
  },
  {
    id: "near_term_goal_separate_from_long_term_money",
    sourceRef: "재무상담 최종답변 묶음 · 2026-08-28 / 2026-09-01 / 2026-09-04",
    anonymized: true,
    context: "결혼·신혼주거·주택·이사처럼 가까운 시기에 실제 사용할 돈이 있는 상담들",
    observedFact: [
      "가까운 목적자금과 장기간 두어도 되는 자금을 같은 돈으로 보지 않았다.",
      "필요 금액·사용 시점·현재 준비금을 먼저 정해야 장기 계획의 범위를 정할 수 있었다.",
    ],
    followup: [
      "목표일과 실제 필요액을 확인한다.",
      "현재 준비금과 매월 목표에 배정하는 금액을 구분한다.",
    ],
    diagnosisPattern: "가까운 목적자금은 전체 저축액이나 장기자금과 분리해 준비 속도를 판단한다.",
    action: "목표별 필요액·준비액·월 배정액·목표일을 같은 표에서 확인한다.",
    questionIds: ["futureEvents", "futureEventTiming", "futureEventAmount", "futureEventPrepared", "goalRequiredKrw", "goalPreparedKrw", "goalMonthlyAllocationKrw", "goalDeadline"],
    outcome: { status: "unknown" },
  },
  {
    id: "debt_terms_before_repayment_order",
    sourceRef: "재무상담 최종답변 묶음 · 2026-09-02 / 2026-09-04",
    anonymized: true,
    context: "부채가 있거나 월 상환부담이 큰 상담들",
    observedFact: [
      "부채 잔액 하나만으로 상환 우선순위를 정하지 않았다.",
      "금리·월 상환액·만기·상환방식과 비상자금을 함께 확인했다.",
    ],
    followup: [
      "대출별 금리·잔액·월 상환액·만기를 확인한다.",
      "원리금인지 이자만 납부 중인지와 바로 쓸 현금을 확인한다.",
    ],
    diagnosisPattern: "만기 임박과 높은 금리의 부담을 장기 투자·추가 저축보다 먼저 확인하되 비상자금까지 모두 소진한다고 가정하지 않는다.",
    action: "대출 조건을 한곳에 모아 급한 만기와 높은 금리 부담부터 구분한다.",
    questionIds: ["hasDebt", "debtInterestRate", "debtMonthlyPayment", "debtMaturity", "debtRepaymentType", "debtRemainingKrw", "debtPreparedKrw", "emergencyFund"],
    outcome: { status: "unknown" },
  },
  {
    id: "sustainable_action_before_maximum_cut",
    sourceRef: "Gmail final-answer batches 0828/0904 · 1a052588c5c5d15e / 1a078929c9a5a13b",
    anonymized: true,
    context: "저축을 늘리려 하지만 생활비를 과도하게 줄이면 지속하기 어려운 상담들",
    observedFact: [
      "무조건 최대 절약보다 지속 가능한 월 한도와 자동 분리가 반복적으로 제안됐다.",
      "실제 여력 확인 전 추가 저축·투자를 확정하지 않았다.",
    ],
    followup: [
      "최근 실제 생활비와 반복 지출을 확인한다.",
      "이번 달 유지 가능한 한 가지 행동으로 줄인다.",
    ],
    diagnosisPattern: "실행 가능성을 희생한 과도한 절약보다 확인된 여력 안의 한 가지 행동을 우선한다.",
    action: "현재 생활에서 지속 가능한 한 가지 조정만 정하고 다음 점검에서 실제 실행을 확인한다.",
    questionIds: ["monthlyLivingCostKrw", "monthlySavingsKrw", "spendingPatterns", "expenseAwareness"],
    outcome: { status: "unknown" },
  },
]);
export function counselingReferences(questionId: keyof typeof SURVEY_USAGE): readonly CounselingPattern[] {
  return COUNSELING_PATTERNS.filter(pattern => pattern.questionIds.includes(questionId));
}
