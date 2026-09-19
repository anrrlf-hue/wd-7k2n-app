import type { SurveyInput } from "@/lib/survey-input";
import { futureEventPlan } from "@/lib/future-event";

export const knownMoney = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
export function validDate(value?: string): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
}

/** Planning estimate, not a promise: only the amount explicitly allocated to this goal. */
export function purposeFunding(input: SurveyInput, today = new Date().toISOString().slice(0, 10)) {
  if (futureEventPlan(input)?.kind !== "purpose") return { state: "NOT_APPLICABLE" as const };
  const { goalRequiredKrw: required, goalPreparedKrw: prepared, goalMonthlyAllocationKrw: monthly, goalDeadline: deadline } = input;
  const hasDetail = [required, prepared, monthly].some(n => n !== undefined && !Number.isNaN(n)) || Boolean(deadline);
  if (!hasDetail && input.futureEventPrepared === "enough") return { state: "PREPARED_SELF_REPORT" as const };
  if (!knownMoney(required) || !knownMoney(prepared) || !knownMoney(monthly) || !validDate(deadline)) return { state: "NEEDS_CONFIRMATION" as const };
  const available = input.monthlyIncomeKrw - input.monthlyFixedCostKrw - input.monthlyLivingCostKrw;
  const amountMatches = input.futureEventAmount === "under_500" ? required < 5000000 : input.futureEventAmount === "500_2000" ? required >= 5000000 && required < 20000000 : required >= 20000000;
  const preparedMatches = input.futureEventPrepared === "none" ? prepared === 0 : input.futureEventPrepared === "under_half" ? prepared < required / 2 : input.futureEventPrepared === "over_half" ? prepared >= required / 2 : prepared >= required;
  if (monthly > Math.max(0, available) || !amountMatches || !preparedMatches) return { state: "NEEDS_CONFIRMATION" as const };
  const days = Math.max(0, (Date.parse(deadline!) - Date.parse(today)) / 86400000);
  const savingCycles = Math.floor(days / (365.25 / 12));
  const gapKrw = Math.max(0, required - prepared - monthly * savingCycles);
  return { state: gapKrw > 0 ? "SHORTFALL" as const : "ON_PLAN" as const, required, prepared, monthly, savingCycles, gapKrw, deadline };
}

/** Freelancer values are self-reported in 만원. Missing/invalid/order-conflicting values are not zero. */
export function freelancerEvidence(input: SurveyInput) {
  if (input.jobType !== "freelancer") return null;
  const raw = [input.freelancerIncomeLow, input.freelancerIncomeAvg, input.freelancerIncomeHigh];
  if (raw.some(v => !v?.trim() || !/^\d+(\.\d+)?$/.test(v.trim()))) return null;
  const [low, average, high] = raw.map(v => Number(v) * 10000);
  if (![low, average, high].every(Number.isFinite) || low > average || average > high) return null;
  const essential = input.monthlyFixedCostKrw + input.monthlyLivingCostKrw;
  return { low, average, high, essential, lowGap: Math.max(0, essential - low), averageRemaining: average - essential, range: high - low };
}
