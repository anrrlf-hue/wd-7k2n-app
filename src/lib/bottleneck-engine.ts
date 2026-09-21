import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";
import { futureEventAnswersComplete, futureEventPlan, primaryFutureEvent } from "@/lib/future-event";
import { freelancerEvidence, purposeFunding } from "@/lib/financial-evidence";

export type BottleneckCode =
  | "cash_flow_deficit"
  | "income_interruption_risk"
  | "high_interest_debt"
  | "maturity_preparation"
  | "purpose_fund_confirmation"
  | "income_variability_risk"
  | "near_future_funds_shortfall"
  | "emergency_fund_shortage"
  | "biz_personal_mixed"
  | "card_installment_dependence"
  | "no_expense_awareness"
  | "no_savings_system"
  | "long_term_goal_pace_short"
  | "investment_efficiency"
  | "insufficient_data"
  | "no_priority_bottleneck";

function hasBasicInputs(input: SurveyInput): boolean {
  const amounts = [
    input.monthlyIncomeKrw,
    input.monthlyFixedCostKrw,
    input.monthlyLivingCostKrw,
    input.monthlySavingsKrw,
  ];
  if (amounts.some((value) => !Number.isFinite(value) || value < 0)) return false;
  if (!input.jobType || !input.expenseAwareness || !input.emergencyFund || !input.moneyManagementUnit) return false;
  if (input.hasDebt === undefined || !input.futureEvents.length) return false;

  const hasFutureEvent = !input.futureEvents.includes("none");
  if (hasFutureEvent && !primaryFutureEvent(input)) return false;
  if (hasFutureEvent && !futureEventAnswersComplete(input)) return false;

  if (
    input.hasDebt &&
    (!input.debtInterestRate ||
      !input.debtMonthlyPayment ||
      !input.debtMaturity ||
      !input.debtRepaymentType)
  ) {
    return false;
  }

  if (input.jobType === "freelancer" && !freelancerEvidence(input)) return false;

  if (
    (input.jobType === "business_owner" || input.moneyManagementUnit === "mixed_biz_personal") &&
    input.businessSeparatesFinance === undefined
  ) {
    return false;
  }

  return true;
}

function isNear(term?: string): boolean {
  return term === "under_3m" || term === "3_6m" || term === "6_12m";
}

export function detectBottleneck(input: SurveyInput): BottleneckCode {
  if (!hasBasicInputs(input)) return "insufficient_data";

  if (surplusKrw(input) < 0) return "cash_flow_deficit";

  const event = futureEventPlan(input);
  if (input.jobType === "transitioning") return "income_interruption_risk";
  if (
    event?.kind === "income" &&
    isNear(input.futureEventTiming) &&
    (input.futureIncomeChange === "reduced" ||
      input.futureIncomeChange === "stopped" ||
      input.futureIncomeChange === "unknown")
  ) {
    return "income_interruption_risk";
  }

  // 실제 상담에서는 부채가 있다고 끝내지 않고 금리·만기·상환방식을 다시 확인한다.
  // 만기가 임박한 부채는 금리와 별개로 먼저 확인해야 하므로 고금리보다 앞에 둔다.
  if (input.hasDebt && input.debtMaturity === "under_3m") {
    return "maturity_preparation";
  }
  if (input.hasDebt && input.debtInterestRate === "over_15") {
    return "high_interest_debt";
  }

  const variableIncome = freelancerEvidence(input);
  if ((variableIncome?.lowGap ?? 0) > 0) {
    return "income_variability_risk";
  }

  if (event?.kind === "purpose" && isNear(input.futureEventTiming)) {
    const funding = purposeFunding(input);
    if (funding.state === "SHORTFALL") return "near_future_funds_shortfall";
    if (funding.state === "NEEDS_CONFIRMATION") return "purpose_fund_confirmation";
  }

  if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    return "emergency_fund_shortage";
  }

  if (
    input.moneyManagementUnit === "mixed_biz_personal" ||
    (input.jobType === "business_owner" && input.businessSeparatesFinance === false)
  ) {
    return "biz_personal_mixed";
  }
  if (input.spendingPatterns.includes("card_dependence")) return "card_installment_dependence";
  if (input.expenseAwareness === "unknown") return "no_expense_awareness";
  if (
    input.spendingPatterns.includes("spend_as_earned") &&
    !input.spendingPatterns.includes("auto_savings")
  ) {
    return "no_savings_system";
  }

  return "no_priority_bottleneck";
}
