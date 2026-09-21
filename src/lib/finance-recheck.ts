import type { FinanceBaselineSnapshot } from "@/lib/finance-management";
import { surplusKrw } from "@/lib/survey-input";

export type ExecutionStatus = "done" | "partial" | "not_done";

export interface FinanceRecheckInput {
  executionStatus: ExecutionStatus;
  monthlyIncomeKrw: number;
  monthlyFixedCostKrw: number;
  monthlyLivingCostKrw: number;
  monthlySavingsKrw: number;
  emergencyFund: string;
  goalPreparedKrw?: number;
  debtRemainingKrw?: number;
  difficulty?: string;
}

export interface FinanceRecheckResult {
  headline: string;
  summary: string;
  changed: string[];
  keep: string;
  nextAction: string;
  nextCheckpoints: string[];
}

const EMERGENCY_RANK: Record<string, number> = {
  none: 0,
  under_1m: 1,
  "1_3m": 2,
  "3_6m": 3,
  over_6m: 4,
};

function manwon(krw: number): string {
  const value = Math.round((krw / 10000) * 10) / 10;
  return `${value.toLocaleString("ko-KR")}만원`;
}

function signedManwon(krw: number): string {
  if (krw === 0) return "변화 없음";
  return `${krw > 0 ? "+" : "-"}${manwon(Math.abs(krw))}`;
}

function executionText(status: ExecutionStatus): string {
  if (status === "done") return "정했던 행동을 실제로 실행했습니다.";
  if (status === "partial") return "정했던 행동을 일부 실행했습니다.";
  return "정했던 행동은 아직 실행하지 못했습니다.";
}

export function buildFinanceRecheckResult(
  snapshot: FinanceBaselineSnapshot,
  current: FinanceRecheckInput,
): FinanceRecheckResult {
  const before = snapshot.financeInput;
  const beforeSurplus = surplusKrw(before);
  const currentSurplus = surplusKrw(current);
  const surplusDelta = currentSurplus - beforeSurplus;
  const savingsDelta = current.monthlySavingsKrw - before.monthlySavingsKrw;
  const emergencyDelta =
    (EMERGENCY_RANK[current.emergencyFund] ?? 0) -
    (EMERGENCY_RANK[before.emergencyFund] ?? 0);

  const changed: string[] = [executionText(current.executionStatus)];

  if (surplusDelta !== 0) {
    changed.push(
      `저축·투자까지 배분한 뒤 남는 월 금액은 처음보다 ${signedManwon(surplusDelta)} 달라졌습니다.`,
    );
  } else {
    changed.push("저축·투자까지 배분한 뒤 남는 월 금액은 처음과 비슷합니다.");
  }

  if (savingsDelta !== 0) {
    changed.push(`월 저축·투자액은 처음보다 ${signedManwon(savingsDelta)} 달라졌습니다.`);
  }

  if (emergencyDelta > 0) {
    changed.push("바로 사용할 수 있는 여유자금 구간이 처음보다 좋아졌습니다.");
  } else if (emergencyDelta < 0) {
    changed.push("바로 사용할 수 있는 여유자금 구간은 처음보다 줄었습니다.");
  }

  const paidGoalPrepared = snapshot.paidExtraAnswers?.goalPreparedManwon;
  const beforeGoal =
    before.goalPreparedKrw ??
    (typeof paidGoalPrepared === "number" ? paidGoalPrepared * 10000 : undefined);
  const goalDelta =
    snapshot.focusedQuestion === "goal" &&
    typeof current.goalPreparedKrw === "number" &&
    typeof beforeGoal === "number"
      ? current.goalPreparedKrw - beforeGoal
      : null;
  if (goalDelta !== null) {
    if (goalDelta > 0) changed.push(`목표 준비금은 처음보다 ${manwon(goalDelta)} 늘었습니다.`);
    else if (goalDelta < 0) changed.push(`목표 준비금은 처음보다 ${manwon(Math.abs(goalDelta))} 줄었습니다.`);
  }

  const paidDebtBalance = snapshot.paidExtraAnswers?.debtBalanceManwon;
  const beforeDebt =
    before.debtRemainingKrw ??
    (typeof paidDebtBalance === "number" ? paidDebtBalance * 10000 : undefined);
  const debtDelta =
    before.hasDebt &&
    typeof current.debtRemainingKrw === "number" &&
    typeof beforeDebt === "number"
      ? current.debtRemainingKrw - beforeDebt
      : null;
  if (debtDelta !== null) {
    if (debtDelta < 0) changed.push(`확인한 부채 잔액은 처음보다 ${manwon(Math.abs(debtDelta))} 줄었습니다.`);
    else if (debtDelta > 0) changed.push(`확인한 부채 잔액은 처음보다 ${manwon(debtDelta)} 늘었습니다.`);
  }

  // 저축을 줄이면 '남는 돈'은 자동으로 늘 수 있으므로 이를 개선으로 보지 않는다.
  // 생활 자체에서 남는 돈(저축 배분 전)과 안전판·목표·부채가 좋아졌는지 따로 본다.
  const beforeCoreCash =
    before.monthlyIncomeKrw - before.monthlyFixedCostKrw - before.monthlyLivingCostKrw;
  const currentCoreCash =
    current.monthlyIncomeKrw - current.monthlyFixedCostKrw - current.monthlyLivingCostKrw;
  const coreCashDelta = currentCoreCash - beforeCoreCash;
  const becameDeficit = beforeSurplus >= 0 && currentSurplus < 0;
  const worseningMovement =
    becameDeficit ||
    currentCoreCash < 0 ||
    coreCashDelta < 0 ||
    emergencyDelta < 0 ||
    (goalDelta !== null && goalDelta < 0) ||
    (debtDelta !== null && debtDelta > 0);

  const favorableMovement =
    !worseningMovement &&
    (coreCashDelta > 0 ||
      emergencyDelta > 0 ||
      (goalDelta !== null && goalDelta > 0) ||
      (debtDelta !== null && debtDelta < 0) ||
      (savingsDelta > 0 && currentSurplus >= 0));

  const savingsTradeoffOnly =
    surplusDelta > 0 &&
    savingsDelta < 0 &&
    coreCashDelta === 0 &&
    emergencyDelta <= 0 &&
    !(goalDelta !== null && goalDelta > 0) &&
    !(debtDelta !== null && debtDelta < 0);

  let headline = "아직 방향을 바꿀 단계는 아닙니다.";
  let summary = "이번 30일은 결과보다 실제 실행 여부와 현실 숫자가 같은 방향으로 움직였는지 확인하는 단계입니다.";
  let keep = "처음 정한 우선순위는 유지하되, 실제 숫자가 악화되면 같은 행동을 자동 반복하지 않습니다.";
  let nextAction = snapshot.paidResult.check30.action;

  if (worseningMovement) {
    headline = "실행 여부와 별개로, 지금은 숫자가 나빠진 원인부터 다시 봐야 합니다.";
    summary = becameDeficit || currentCoreCash < 0
      ? "현재 소득으로 고정지출과 생활비, 기존 배분을 감당하기 어려운 신호가 생겼습니다. 기존 계획을 그대로 유지하지 않고 현재 숫자에 맞춰 우선순위를 다시 잡습니다."
      : "처음보다 안전판·목표 준비금·부채 중 하나가 나빠졌습니다. 같은 행동을 반복하기보다 무엇이 달라졌는지 먼저 확인합니다.";
    keep = "효과가 확인된 생활습관만 유지하고, 악화된 숫자와 충돌하는 기존 계획은 그대로 반복하지 않습니다.";

    if (currentCoreCash < 0 || becameDeficit) {
      nextAction = "현재 월소득에서 고정지출과 생활비를 먼저 빼고, 남는 범위 안에서 저축·상환 배분을 다시 정해보세요.";
    } else if (debtDelta !== null && debtDelta > 0) {
      nextAction = "부채가 늘어난 이유와 새로 늘어난 금액의 용도를 먼저 확인한 뒤 다음 상환·저축 계획을 정해보세요.";
    } else if (emergencyDelta < 0) {
      nextAction = "줄어든 비상자금이 어디에 쓰였는지 확인하고, 다음 30일에는 바로 쓸 현금 여유를 다시 만드는 것을 먼저 두세요.";
    } else if (goalDelta !== null && goalDelta < 0) {
      nextAction = "목표 준비금이 줄어든 이유를 확인하고, 현재 가능한 월 목표 배정액을 다시 정해보세요.";
    }
  } else if (savingsTradeoffOnly) {
    headline = "남는 돈은 늘었지만, 아직 개선이라고 보기는 어렵습니다.";
    summary = "이번 변화는 생활비가 줄거나 소득이 늘어서가 아니라 저축·투자 배분을 줄인 영향입니다. 단순히 월말 잔액이 늘었다는 이유만으로 좋아졌다고 판단하지 않습니다.";
    keep = "생활을 무리하게 줄이지 않는 원칙은 유지하되, 저축 감소가 의도한 조정인지 확인합니다.";
    nextAction = "줄인 저축·투자 금액을 왜 줄였는지 확인하고, 생활비·비상자금·목표자금 중 어디에 다시 배정할지 정해보세요.";
  } else if (current.executionStatus === "done" && favorableMovement) {
    headline = "정한 방향이 실제 변화로 이어지고 있습니다.";
    summary = "실행과 핵심 숫자의 개선이 함께 확인됩니다. 새로운 일을 늘리기보다 효과가 있었던 흐름을 한 번 더 이어가는 편이 좋습니다.";
    keep = "이번에 실제로 효과가 있었던 행동은 다음 30일에도 유지합니다.";
    nextAction = snapshot.paidResult.firstAction;
  } else if (current.executionStatus === "done") {
    headline = "실행은 완료했습니다. 아직 효과를 단정할 숫자 변화는 없습니다.";
    summary = "한 달 안에 모든 숫자가 바로 달라지지는 않습니다. 다만 악화 신호도 확인되지 않았으므로 같은 기준으로 한 번 더 관찰할 수 있습니다.";
    keep = "이미 실행한 행동은 유지하되, 다음 점검에서도 변화가 없다면 방법 자체를 다시 검토합니다.";
    nextAction = snapshot.paidResult.check30.action;
  } else if (current.executionStatus === "partial") {
    headline = "일부 실행은 했지만, 아직 결과를 평가할 단계는 아닙니다.";
    summary = "새로운 계획을 추가하기보다 끝내지 못한 이유 하나를 줄이고, 이번 행동을 실제 생활에서 한 번 완성하는 것이 먼저입니다.";
    keep = "이미 시작한 부분은 유지하고, 남은 단계를 더 작게 나눕니다.";
    nextAction = snapshot.paidResult.check30.action;
  } else {
    const blocker = current.difficulty?.trim() ?? "";
    headline = "이번에는 실행을 막은 이유부터 줄이는 게 먼저입니다.";
    summary = blocker
      ? `실행하지 못한 이유로 ‘${blocker}’을 적었습니다. 같은 계획을 그대로 반복하지 않고 이 방해요인에 맞게 다음 행동을 바꿉니다.`
      : "계획을 더 늘리기보다 처음 정한 한 가지를 더 작게 시작합니다.";
    keep = "처음의 우선순위 자체는 보존하되, 실행 방법은 현실에 맞게 줄입니다.";

    if (/소득|수입|월급|실직|퇴직|휴직|이직/.test(blocker)) {
      nextAction = "현재 실제 월소득과 필수 생활비를 다시 적고, 지금 소득에서 가능한 범위로 기존 행동을 다시 계산해보세요.";
    } else if (/어렵|어려|복잡|모르|헷갈/.test(blocker)) {
      nextAction = "기존 계획 전체를 하려 하지 말고, 판단에 필요한 숫자나 자료 한 가지만 먼저 확인해보세요.";
    } else if (/시간|바빠|바쁨/.test(blocker)) {
      nextAction = "이번 주 10분만 정해 기존 행동의 첫 단계 하나만 끝내보세요.";
    } else {
      nextAction = `기존 행동을 더 작게 나눠 첫 단계 하나만 실행해보세요: ${snapshot.paidResult.firstAction}`;
    }
  }

  return {
    headline,
    summary,
    changed: changed.slice(0, 5),
    keep,
    nextAction,
    nextCheckpoints: [
      "이번 행동을 실제로 이어갔는지",
      "월 현금흐름이 처음보다 나아졌는지",
      snapshot.focusedQuestion === "goal"
        ? "목표 준비금이 실제로 늘었는지"
        : before.hasDebt
          ? "여유자금 또는 부채 부담이 달라졌는지"
          : "여유자금이 달라졌는지",
    ],
  };
}
