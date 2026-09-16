// "한 달 살아보기" 1회차 로직 — 순수 산술만 한다. Math.random 등 난수를 쓰지
// 않는다: 같은 유형·같은 선택이면 항상 같은 결과가 나와야 한다(운영 문서
// 요구사항). 2회차(처방 반영)는 유료1 범위라 이번 라운드엔 없다.

import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import {
  MONTH_SIM_STEPS,
  MONTH_SIM_STARTING_INCOME_KRW,
  MONTH_SIM_CLOSING_TEMPLATE_POSITIVE,
  MONTH_SIM_CLOSING_TEMPLATE_NEGATIVE,
  type MonthChoiceStep,
} from "@/lib/month-simulation-data";

export interface MonthSimSelection {
  stepId: string;
  optionId: string;
}

export interface MonthSimulationResult {
  startingIncomeKrw: number;
  endingBalanceKrw: number;
  closingText: string;
}

export function getMonthSimSteps(code: WealthTypeCode): MonthChoiceStep[] {
  return MONTH_SIM_STEPS[code];
}

export function computeMonthSimResult(code: WealthTypeCode, selections: MonthSimSelection[]): MonthSimulationResult {
  const steps = MONTH_SIM_STEPS[code];
  const startingIncomeKrw = MONTH_SIM_STARTING_INCOME_KRW[code];

  const endingBalanceKrw = steps.reduce((balance, step) => {
    const selection = selections.find((s) => s.stepId === step.id);
    const option = selection ? step.options.find((o) => o.id === selection.optionId) : undefined;
    return balance + (option?.amountKrw ?? 0);
  }, startingIncomeKrw);

  const amountLabel = Math.abs(endingBalanceKrw).toLocaleString("ko-KR");
  const template = endingBalanceKrw >= 0 ? MONTH_SIM_CLOSING_TEMPLATE_POSITIVE : MONTH_SIM_CLOSING_TEMPLATE_NEGATIVE;
  const closingText = template.replace("{amount}", amountLabel);

  return { startingIncomeKrw, endingBalanceKrw, closingText };
}
