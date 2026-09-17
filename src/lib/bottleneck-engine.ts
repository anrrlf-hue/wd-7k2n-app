// 설문만으로 우선순위를 계산한다. 필수 정보가 없으면 보류하고,
// 측정한 병목이 없으면 새 투자 문제를 추정하지 않는다.
import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";

export type BottleneckCode =
  | "cash_flow_deficit"
  | "income_interruption_risk"
  | "high_interest_debt"
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

const TRANSITIONING_EVENTS = new Set(["leave", "retirement", "job_change"]);

function step1CashFlowDeficit(input: SurveyInput): boolean {
  return surplusKrw(input) < 0;
}

function step2IncomeInterruptionRisk(input: SurveyInput): boolean {
  if (input.jobType === "transitioning") return true;
  return input.futureEvents.some((e) => TRANSITIONING_EVENTS.has(e));
}

function step3HighInterestDebt(input: SurveyInput): boolean {
  if (!input.hasDebt) return false;
  return input.debtInterestRate === "over_15" || input.debtMaturity === "under_3m";
}

function step4NearFutureFundsShortfall(input: SurveyInput): boolean {
  if (input.futureEvents.length === 0 || input.futureEvents.includes("none")) return false;
  if (!input.futureEventAmount || !input.futureEventPrepared) return false; // 정보 부족 -> 스킵
  return input.futureEventTiming !== "over_1y" && input.futureEventPrepared !== "enough";
}

function step5EmergencyFundShortage(input: SurveyInput): boolean {
  return input.emergencyFund === "none" || input.emergencyFund === "under_1m";
}

function step6BizPersonalMixed(input: SurveyInput): boolean {
  return input.jobType === "business_owner" && input.businessSeparatesFinance === false;
}

function step7CardInstallmentDependence(input: SurveyInput): boolean {
  return input.spendingPatterns.includes("card_dependence") || input.spendingPatterns.includes("installment");
}

function step8NoExpenseAwareness(input: SurveyInput): boolean {
  return input.expenseAwareness === "unknown";
}

function step9NoSavingsSystem(input: SurveyInput): boolean {
  return input.spendingPatterns.includes("spend_as_earned") && !input.spendingPatterns.includes("auto_savings");
}

// step10: 장기목표 대비 준비속도 — 설문에 해당 필드가 없어 항상 스킵.

export function detectBottleneck(input: SurveyInput): BottleneckCode {
  const amounts = [input.monthlyIncomeKrw, input.monthlyFixedCostKrw, input.monthlyLivingCostKrw, input.monthlySavingsKrw];
  if (amounts.some((n) => !Number.isFinite(n) || n < 0) || !input.jobType ||
    !input.expenseAwareness || !input.emergencyFund || !input.moneyManagementUnit ||
    !input.spendingPatterns.length || !input.futureEvents.length ||
    (input.hasDebt && (!input.debtInterestRate || !input.debtMaturity || !input.debtMonthlyPayment || !input.debtRepaymentType)) ||
    (!input.futureEvents.includes("none") && (!input.futureEventTiming || !input.futureEventAmount || !input.futureEventPrepared)) ||
    (input.jobType === "business_owner" && input.businessSeparatesFinance === undefined)) return "insufficient_data";
  if (step1CashFlowDeficit(input)) return "cash_flow_deficit";
  if (step2IncomeInterruptionRisk(input)) return "income_interruption_risk";
  if (step3HighInterestDebt(input)) return "high_interest_debt";
  if (step4NearFutureFundsShortfall(input)) return "near_future_funds_shortfall";
  if (step5EmergencyFundShortage(input)) return "emergency_fund_shortage";
  if (step6BizPersonalMixed(input)) return "biz_personal_mixed";
  if (step7CardInstallmentDependence(input)) return "card_installment_dependence";
  if (step8NoExpenseAwareness(input)) return "no_expense_awareness";
  if (step9NoSavingsSystem(input)) return "no_savings_system";
  // step10 (long_term_goal_pace_short): 정보 부족 -> 항상 스킵
  return "no_priority_bottleneck"; // 투자 정보 없이 투자 효율을 추정하지 않는다.
}
