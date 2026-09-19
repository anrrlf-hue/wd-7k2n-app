// 간접체험 다음 재무 설문 — 3스텝. 기본 4금액과 해당 일정/만기의 선택 상세.
// 빈 상세는 미확인으로 남긴다. 사주 요소는 개입하지 않는다.

export interface SurveyOption {
  value: string;
  label: string;
}

/** 설문 스텝1 진입 시 보여줄 개인정보 안내 한 줄. 상수로 분리해 운영자가
 * 문구를 바꿀 수 있게 한다. */
export const PRIVACY_NOTICE = "입력하신 정보는 진단 목적에만 사용되며 외부에 공유되지 않습니다.";

export const JOB_TYPE_OPTIONS: SurveyOption[] = [
  { value: "employee_fixed", label: "직장인(고정급)" },
  { value: "employee_variable", label: "직장인(변동급·성과급)" },
  { value: "freelancer", label: "프리랜서" },
  { value: "business_owner", label: "자영업·사업자" },
  { value: "transitioning", label: "육아휴직·퇴직예정·이직예정" },
];

export const FUTURE_EVENT_OPTIONS: SurveyOption[] = [
  { value: "marriage", label: "결혼" },
  { value: "moving", label: "이사" },
  { value: "home_purchase", label: "주택구입" },
  { value: "car", label: "자동차" },
  { value: "startup", label: "창업" },
  { value: "childbirth", label: "출산" },
  { value: "medical", label: "치료·수술" },
  { value: "leave", label: "휴직" },
  { value: "retirement", label: "퇴직" },
  { value: "job_change", label: "이직" },
  { value: "none", label: "없음" },
];

export const EXPENSE_AWARENESS_OPTIONS: SurveyOption[] = [
  { value: "precise", label: "정확히 안다" },
  { value: "rough", label: "대략 안다" },
  { value: "unknown", label: "모른다" },
];

export const EMERGENCY_FUND_OPTIONS: SurveyOption[] = [
  { value: "none", label: "없다" },
  { value: "under_1m", label: "1개월 미만" },
  { value: "1_3m", label: "1~3개월" },
  { value: "3_6m", label: "3~6개월" },
  { value: "over_6m", label: "6개월 이상" },
];

export const DEBT_INTEREST_OPTIONS: SurveyOption[] = [
  { value: "under_10", label: "10% 미만" },
  { value: "10_15", label: "10~15%" },
  { value: "over_15", label: "15% 이상" },
];

export const DEBT_PAYMENT_OPTIONS: SurveyOption[] = [
  { value: "under_30", label: "월 30만원 미만" },
  { value: "30_100", label: "월 30~100만원" },
  { value: "over_100", label: "월 100만원 이상" },
];

export const DEBT_MATURITY_OPTIONS: SurveyOption[] = [
  { value: "under_3m", label: "3개월 이내" },
  { value: "3_12m", label: "3개월~1년" },
  { value: "over_1y", label: "1년 이상" },
];

export const REPAYMENT_TYPE_OPTIONS: SurveyOption[] = [
  { value: "principal_interest", label: "원리금상환" },
  { value: "interest_only", label: "이자만 납부" },
];

export const FUTURE_EVENT_TIMING_OPTIONS: SurveyOption[] = [
  { value: "under_3m", label: "3개월 이내" },
  { value: "3_6m", label: "3~6개월" },
  { value: "6_12m", label: "6개월~1년" },
  { value: "over_1y", label: "1년 이상" },
];

export const FUTURE_EVENT_AMOUNT_OPTIONS: SurveyOption[] = [
  { value: "under_500", label: "500만원 미만" },
  { value: "500_2000", label: "500~2,000만원" },
  { value: "over_2000", label: "2,000만원 이상" },
];

export const FUTURE_EVENT_PREPARED_OPTIONS: SurveyOption[] = [
  { value: "none", label: "전혀 없다" },
  { value: "under_half", label: "절반 미만" },
  { value: "over_half", label: "절반 이상" },
  { value: "enough", label: "충분하다" },
];

export const MONEY_MANAGEMENT_UNIT_OPTIONS: SurveyOption[] = [
  { value: "individual", label: "개인" },
  { value: "couple", label: "부부공동" },
  { value: "family_support", label: "가족지원포함" },
  { value: "mixed_biz_personal", label: "사업자금-생활비 혼합" },
];

export const SPENDING_PATTERN_OPTIONS: SurveyOption[] = [
  { value: "card_dependence", label: "생활비 부족을 카드로 반복 충당" },
  { value: "installment", label: "할부" },
  { value: "impulse", label: "충동소비" },
  { value: "compensatory", label: "보상소비" },
  { value: "social_spending", label: "관계지출" },
  { value: "avoidance", label: "확인회피" },
  { value: "spend_as_earned", label: "생기면바로씀" },
  { value: "auto_savings", label: "자동저축" },
  { value: "investment_impulse", label: "투자충동" },
  { value: "none", label: "해당없음" },
];

export interface SurveyInput {
  // Optional exact details; blank means unconfirmed, never zero.
  goalRequiredKrw?: number;
  goalPreparedKrw?: number;
  goalMonthlyAllocationKrw?: number;
  goalDeadline?: string;
  debtMaturityDate?: string;
  debtRemainingKrw?: number;
  debtPreparedKrw?: number;
  biggestConcern: string;
  jobType: string;
  futureEvents: string[];
  primaryFutureEvent?: string;
  monthlyIncomeKrw: number;
  monthlyFixedCostKrw: number;
  monthlyLivingCostKrw: number;
  monthlySavingsKrw: number;
  expenseAwareness: string;
  emergencyFund: string;
  hasDebt?: boolean;
  debtInterestRate?: string;
  debtMonthlyPayment?: string;
  debtMaturity?: string;
  debtRepaymentType?: string;
  futureEventTiming?: string;
  futureEventAmount?: string;
  futureEventPrepared?: string;
  futureIncomeChange?: string;
  futureLivingBuffer?: string;
  businessSeparatesFinance?: boolean;
  freelancerIncomeLow?: string;
  freelancerIncomeAvg?: string;
  freelancerIncomeHigh?: string;
  moneyManagementUnit: string;
  spendingPatterns: string[];
}

export function surplusKrw(input: Pick<SurveyInput, "monthlyIncomeKrw" | "monthlyFixedCostKrw" | "monthlyLivingCostKrw" | "monthlySavingsKrw">): number {
  return input.monthlyIncomeKrw - input.monthlyFixedCostKrw - input.monthlyLivingCostKrw - input.monthlySavingsKrw;
}
