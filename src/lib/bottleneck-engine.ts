// 병목 판단 — 순수 계산 함수, AI 아님. 사주·손금 요소는 전혀 개입하지
// 않는다(설문 응답만 쓴다). 11단계를 우선순위 순서로 검사해 처음 걸리는
// 것을 채택한다. 절대적 점수공식이 아니라 순서 기반 체인이다. 필요한
// 정보가 없는 단계는 무조건 스킵한다(억지로 진단하지 않는다) — 10번
// (장기목표 대비 준비속도)은 설문에 해당 필드 자체가 없어 항상 스킵되는
// "정보 부족시 스킵" 원칙의 실제 사례다.

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
  | "investment_efficiency";

const TRANSITIONING_EVENTS = new Set(["leave", "retirement", "job_change"]);
const AMOUNT_RANK: Record<string, number> = { under_500: 1, "500_2000": 2, over_2000: 3 };
const PREPARED_RANK: Record<string, number> = { none: 0, under_half: 1, over_half: 2, enough: 3 };

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
  const needed = AMOUNT_RANK[input.futureEventAmount] ?? 0;
  const prepared = PREPARED_RANK[input.futureEventPrepared] ?? 0;
  // needed(1~3)와 prepared(0~3)를 같은 척도로 비교 — prepared가 "충분하다"(3)면
  // 항상 부족하지 않다고 본다. 그 외엔 prepared가 needed보다 낮으면 부족.
  if (input.futureEventPrepared === "enough") return false;
  return prepared < needed;
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
  return "investment_efficiency"; // catch-all, 항상 매치
}
