import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";
import { futureEventPlan, primaryFutureEvent } from "@/lib/future-event";

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
  if (hasFutureEvent && !input.futureEventTiming) return false;
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
  if (event?.kind === "income" && isNear(input.futureEventTiming)) return "income_interruption_risk";

  if (event?.kind === "purpose" && isNear(input.futureEventTiming)) {
    return "purpose_fund_confirmation";
  }

  if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    return "emergency_fund_shortage";
  }

  if (input.moneyManagementUnit === "mixed_biz_personal") return "biz_personal_mixed";
  if (input.expenseAwareness === "unknown") return "no_expense_awareness";

  return "no_priority_bottleneck";
}
