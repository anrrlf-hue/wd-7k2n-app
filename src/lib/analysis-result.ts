// 재무 자기응답 → 우선순위/설명/계획. 미확인은 0원과 구분한다.
// 목적자금은 명시적으로 확인한 금액·목표 배정·기한만 사용한다.
// 비상자금의 기존 구간 추정은 추정이라고 표시하며 실제 적립 보장으로 쓰지 않는다.
import { type SurveyInput, surplusKrw, DEBT_INTEREST_OPTIONS, DEBT_PAYMENT_OPTIONS, DEBT_MATURITY_OPTIONS, REPAYMENT_TYPE_OPTIONS, EXPENSE_AWARENESS_OPTIONS, FUTURE_EVENT_TIMING_OPTIONS, FUTURE_EVENT_AMOUNT_OPTIONS, FUTURE_EVENT_PREPARED_OPTIONS } from "@/lib/survey-input";
import { detectBottleneck, type BottleneckCode } from "@/lib/bottleneck-engine";
import { BOTTLENECK_COPY } from "@/lib/analysis-result-copy";
import { futureEventPlan, futureEventNeedsClarification, LIVING_BUFFER_OPTIONS } from "@/lib/future-event";
import { purposeFunding, freelancerEvidence, knownMoney, validDate } from "@/lib/financial-evidence";

export interface AnalysisResult {
  bottleneck: BottleneckCode;
  headline: string;
  why: string;
  lifeMeaning: string;
  notUrgent: string;
  notUrgentReason: string;
  surplusKrw: number | null;
  immediateDirection: string;
  gapStatement: string;
  eventContext?: string;
  userConcern?: string;
  incomeContext?: string;
  fundingContext?: string;
  answerContext: string;
}

// 구간 응답을 실제 계산에 쓸 수 있는 근사 숫자로 바꾸는 고정 환산표(코드가
// 정한 값, AI 추측 아님) — 정확한 금액이 아니라 "그 구간을 대표하는 값"이다.
const EMERGENCY_FUND_MONTHS: Record<string, number> = { none: 0, under_1m: 0.5, "1_3m": 2, "3_6m": 4.5, over_6m: 6 };

function fmt(krw: number): string {
  return `${Math.round(krw).toLocaleString("ko-KR")}원`;
}

/** 저축 여력 — 저축액을 입력했으면 그대로, 안 했으면 잉여금(양수일 때만) 대신 쓴다. */
function monthlySavingCapacity(input: SurveyInput): number {
  if (input.monthlySavingsKrw > 0) return input.monthlySavingsKrw;
  const surplus = surplusKrw(input);
  return surplus > 0 ? surplus : 0;
}

function buildGapStatement(bottleneck: BottleneckCode, input: SurveyInput): string {
  const surplus = surplusKrw(input);

  switch (bottleneck) {
    case "purpose_fund_confirmation": return "필요액·준비액·월 배정액·목표일이 확인되기 전에는 부족액이나 준비 기간을 계산하지 않습니다.";
    case "maturity_preparation": {
      const date = validDate(input.debtMaturityDate) ? input.debtMaturityDate : "정확한 날짜 미확인";
      if (!knownMoney(input.debtRemainingKrw) || !knownMoney(input.debtPreparedKrw)) return `만기일: ${date}. 만기에 갚을 잔액과 준비한 상환자금은 추가 확인이 필요합니다.`;
      return `만기일: ${date}. 만기 잔액 ${fmt(input.debtRemainingKrw)}, 준비자금 ${fmt(input.debtPreparedKrw)}, 현재 준비자금과의 차이 ${fmt(Math.max(0, input.debtRemainingKrw - input.debtPreparedKrw))}입니다. 이후 상환·입금은 반영하지 않았습니다.`;
    }
    case "income_variability_risk": {
      const income = freelancerEvidence(input)!;
      return `낮은 달 소득 ${fmt(income.low)} − 고정지출·생활비 ${fmt(income.essential)}: 부족분 ${fmt(income.lowGap)}입니다. 저축액과 추가 대출상환을 중복 차감하지 않았어요.`;
    }
    case "insufficient_data": return "확인되지 않은 금액은 계산에서 제외했습니다.";
    case "no_priority_bottleneck": return "목표 금액과 시점을 정하면 현재 저축 속도와 비교할 수 있어요.";
    case "cash_flow_deficit": {
      const yearlyDeficit = Math.abs(surplus) * 12;
      return `현재 월 예산의 부족분을 12개월로 환산하면 ${fmt(yearlyDeficit)}입니다. 실제 부채 증가액은 아닙니다.`;
    }
    case "emergency_fund_shortage": {
      const targetKrw = 3 * (input.monthlyFixedCostKrw + input.monthlyLivingCostKrw);
      const currentKrw = (EMERGENCY_FUND_MONTHS[input.emergencyFund] ?? 0) * (input.monthlyFixedCostKrw + input.monthlyLivingCostKrw);
      const rate = monthlySavingCapacity(input);
      const remaining = targetKrw - currentKrw;
      if (remaining <= 0) return "비상자금 3개월 치는 이미 채워져 있는 수준입니다.";
      if (rate <= 0) return "지금 저축 여력으로는 비상자금을 채울 속도 자체를 계산하기 어렵습니다.";
      const months = Math.ceil(remaining / rate);
      return `지금 저축 속도라면, 고정지출과 생활비 3개월 치를 채우는 데 약 ${months}개월입니다. 구간 응답을 환산한 추정치예요.`;
    }
    case "income_interruption_risk": {
      const event = futureEventPlan(input);
      if (event?.kind === "income") {
        const buffer = LIVING_BUFFER_OPTIONS.find((option) => option.value === input.futureLivingBuffer)?.label;
        return input.futureLivingBuffer === "none"
          ? `${event.label}에 대비해 별도로 준비된 생활비가 없다고 답했어요. 예상 소득과 고정지출·생활비를 함께 확인해 보세요.`
          : `${event.label}에 대비한 생활비는 ${buffer}분을 준비했다고 답했어요. 실제 버틸 수 있는 기간은 이후 소득과 지출에 따라 달라집니다.`;
      }
      const months = EMERGENCY_FUND_MONTHS[input.emergencyFund] ?? 0;
      return `지금 비상자금 수준이면, 소득이 끊겨도 버틸 수 있는 기간은 약 ${months}개월로 추정됩니다. 구간 응답 기준이며 실제 지출에 따라 달라져요.`;
    }
    case "high_interest_debt": {
      const payment = { under_30: "30만원 미만", "30_100": "30만~100만원", over_100: "100만원 이상" }[input.debtMonthlyPayment ?? ""];
      return `월 상환액은 ${payment ?? "미확인"} 구간입니다. ${input.debtRepaymentType === "principal_interest" ? "원금과 이자가 함께 들어 있어" : "이자만 납부한다고 답했지만 정확한 잔액·금리가 없어"} 실제 연간 이자액은 계산하지 않았어요.`;
    }
    case "near_future_funds_shortfall": {
      return describeFunding(input) ?? "목적자금의 세부 금액을 확인해 주세요.";
    }
    default: {
      // 전용 계산식이 없는 병목(사업자금혼합/카드의존/지출파악못함/저축시스템없음/
      // 장기목표속도/투자효율) — 지어내지 않고 잉여금 연환산이라는 같은 축의
      // 공통 격차로 대체한다.
      const yearly = surplus * 12;
      return yearly >= 0
        ? `현재 미배분 금액을 12개월로 환산하면 ${fmt(yearly)}입니다. 실제 저축을 보장하는 금액은 아니에요.`
        : `지금 흐름이 그대로면, 1년 뒤 ${fmt(Math.abs(yearly))}만큼 마이너스가 쌓입니다.`;
    }
  }
}

export function buildAnalysisResult(input: SurveyInput): AnalysisResult {
  const bottleneck = detectBottleneck(input);
  const copy = BOTTLENECK_COPY[bottleneck];
  const event = futureEventPlan(input);
  const unclearEvent = bottleneck === "insufficient_data" && event && futureEventNeedsClarification(input);
  const income = freelancerEvidence(input);
  return {
    bottleneck,
    headline: bottleneck === "no_priority_bottleneck"
      ? "지금 가장 먼저 고쳐야 할 문제는 없습니다."
      : bottleneck === "insufficient_data"
        ? "지금은 빠진 숫자부터 확인하면 됩니다."
        : bottleneck === "purpose_fund_confirmation"
          ? "목적자금은 정확한 금액과 시점만 더 확인하면 됩니다."
          : `지금 가장 먼저 볼 부분은 ${copy.title}입니다.`,
    why: unclearEvent ? `${event.label} 이후의 소득 변화나 준비된 생활비가 아직 확인되지 않았어요.` : copy.why,
    lifeMeaning: unclearEvent ? `현재 소득·지출과 별개로, ${event.label} 이후의 생활을 먼저 확인해야 해요.` : copy.lifeMeaning,
    notUrgent: copy.notUrgent,
    notUrgentReason: copy.notUrgentReason,
    surplusKrw: bottleneck === "insufficient_data" ? null : surplusKrw(input),
    immediateDirection: unclearEvent ? `${event.label} 이후의 예상 소득과 바로 쓸 생활비를 확인한 뒤 다시 답해 주세요.` : IMMEDIATE_DIRECTION[bottleneck],
    gapStatement: buildGapStatement(bottleneck, input),
    eventContext: event ? `미래 일정은 ${event.label}, ${FUTURE_EVENT_TIMING_OPTIONS.find(o => o.value === input.futureEventTiming)?.label ?? "시기 미확인"} 기준으로 확인했어요.${event.kind === "purpose" ? ` 필요액 구간: ${FUTURE_EVENT_AMOUNT_OPTIONS.find(o => o.value === input.futureEventAmount)?.label ?? "미확인"}, 준비: ${FUTURE_EVENT_PREPARED_OPTIONS.find(o => o.value === input.futureEventPrepared)?.label ?? "미확인"}.` : ""}${input.futureEvents.length > 1 ? " 선택한 다른 일정의 준비 상태는 이번 진단에 포함하지 않았어요." : ""}` : undefined,
    userConcern: input.biggestConcern.trim() || undefined,
    answerContext: `지출 파악: ${EXPENSE_AWARENESS_OPTIONS.find(o => o.value === input.expenseAwareness)?.label ?? "미확인"}.${input.hasDebt === true ? ` 부채 자기응답: ${DEBT_INTEREST_OPTIONS.find(o => o.value === input.debtInterestRate)?.label ?? "미확인"}, 월 상환 ${DEBT_PAYMENT_OPTIONS.find(o => o.value === input.debtMonthlyPayment)?.label ?? "미확인"}, 만기 ${DEBT_MATURITY_OPTIONS.find(o => o.value === input.debtMaturity)?.label ?? "미확인"}, ${REPAYMENT_TYPE_OPTIONS.find(o => o.value === input.debtRepaymentType)?.label ?? "미확인"}. 상환액 전체를 이자로 계산하지 않았어요.` : input.hasDebt === false ? " 부채 없음으로 답했어요." : " 부채 여부는 아직 답하지 않았어요."}`,
    incomeContext: income ? `직접 입력한 낮은 달 ${fmt(income.low)}·평균 ${fmt(income.average)}·높은 달 ${fmt(income.high)}로 소득 폭은 ${fmt(income.range)}입니다. 평균에서 고정지출·생활비를 빼면 ${fmt(income.averageRemaining)}, 낮은 달에는 ${income.lowGap > 0 ? `${fmt(income.lowGap)} 부족` : "이 지출을 감당할 수 있는 범위"}입니다. 높은 달은 반복 소득으로 가정하지 않았어요.` : input.jobType === "freelancer" ? "낮은 달·평균·높은 달 소득을 0 이상의 만원 단위로, 낮은 달 ≤ 평균 ≤ 높은 달 순서로 확인해 주세요." : undefined,
    fundingContext: event?.kind === "purpose" ? describeFunding(input) : undefined,
  };
}

function describeFunding(input: SurveyInput): string | undefined {
  const funding = purposeFunding(input);
  if (funding.state === "ON_PLAN" || funding.state === "SHORTFALL") return `${funding.deadline}까지 필요액 ${fmt(funding.required)}, 준비액 ${fmt(funding.prepared)}, 이 목표의 월 배정액 ${fmt(funding.monthly)} × 약 ${funding.savingCycles}회로 계산한 부족분은 ${fmt(funding.gapKrw)}입니다. 한 달을 평균 30.44일로 본 계획 추정이며 실제 입금일·추가 지출에 따라 달라집니다.`;
  if (funding.state === "NEEDS_CONFIRMATION") return "목표 구간 답변만으로 부족 여부를 단정하지 않았어요. 정확한 필요액·준비액·월 배정액·기한을 확인해 주세요.";
  if (funding.state === "PREPARED_SELF_REPORT") return "목적자금은 충분히 준비했다고 답했어요. 실제 사용 가능한 잔액과 지급일을 한 번 확인해 보세요.";
}

const IMMEDIATE_DIRECTION: Record<BottleneckCode, string> = {
  purpose_fund_confirmation: "목표의 실제 필요액·준비액·월 배정액·목표일을 확인해 주세요.",
  maturity_preparation: "정확한 만기일·만기 잔액·준비한 상환자금을 확인해 주세요.",
  income_variability_risk: "낮은 달의 고정지출·생활비 부족분과 그 달에 쓸 현금을 나란히 적어보세요.",
  cash_flow_deficit: "이번 달 고정지출·생활비·저축 배분을 한 줄로 적고, 소득 안에서 다시 나눠보세요.",
  income_interruption_risk: "소득이 줄어드는 달과 바로 꺼낼 수 있는 현금을 먼저 적어보세요.",
  high_interest_debt: "대출별 금리·만기·월 상환액을 한곳에 모아 확인해 보세요.",
  near_future_funds_shortfall: "가장 가까운 일정 하나의 필요 금액과 준비된 돈을 나란히 적어보세요.",
  emergency_fund_shortage: "투자자산과 구분해서, 바로 쓸 수 있는 비상자금 잔액을 확인해 보세요.",
  biz_personal_mixed: "이번 달 사업 지출과 개인 생활비를 먼저 구분해 보세요.",
  card_installment_dependence: "다음 결제일의 일시불·할부 합계부터 확인해 보세요.",
  no_expense_awareness: "최근 한 달 결제내역을 고정비와 생활비로 나눠보세요.",
  no_savings_system: "다음 소득일에 무리 없이 남길 수 있는 금액 하나를 정해보세요.",
  long_term_goal_pace_short: "목표 금액과 날짜를 적고 준비된 돈을 확인해 보세요.",
  investment_efficiency: "목표별로 쓸 시점과 현재 자산 구성을 정리해 보세요.",
  insufficient_data: "최근 한 달 거래내역으로 빈 항목을 확인한 뒤 다시 진단해 주세요.",
  no_priority_bottleneck: "현재 방식을 유지하면서, 다음 목표의 금액과 날짜를 적어보세요.",
};
