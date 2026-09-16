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

export function defaultStartingIncome(code: WealthTypeCode): number {
  return MONTH_SIM_STARTING_INCOME_KRW[code];
}

/** startingIncomeKrw를 생략하면 유형별 기본 시작 금액을 쓴다. 사용자가 자기
 * 실제 월급을 입력했다면 그 값을 그대로 시작 잔액으로 쓴다 — 선택지별
 * 증감액(amountKrw)은 유형별 세트 그대로 재사용, 시작점만 바뀐다. */
export function computeMonthSimResult(
  code: WealthTypeCode,
  selections: MonthSimSelection[],
  startingIncomeKrw: number = MONTH_SIM_STARTING_INCOME_KRW[code],
): MonthSimulationResult {
  const steps = MONTH_SIM_STEPS[code];

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

/** 선택 하나가 반영된 직후의 잔액(장면별 연출용) — computeMonthSimResult와
 * 같은 산술을 지금까지의 선택분만 부분 적용해서 재사용한다. */
export function computeRunningBalance(
  code: WealthTypeCode,
  selections: MonthSimSelection[],
  startingIncomeKrw: number = MONTH_SIM_STARTING_INCOME_KRW[code],
): number {
  const steps = MONTH_SIM_STEPS[code];
  return steps.reduce((balance, step) => {
    const selection = selections.find((s) => s.stepId === step.id);
    const option = selection ? step.options.find((o) => o.id === selection.optionId) : undefined;
    return balance + (option?.amountKrw ?? 0);
  }, startingIncomeKrw);
}
