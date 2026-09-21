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
  if (
    snapshot.focusedQuestion === "goal" &&
    typeof current.goalPreparedKrw === "number" &&
    typeof beforeGoal === "number"
  ) {
    const goalDelta = current.goalPreparedKrw - beforeGoal;
    if (goalDelta > 0) changed.push(`목표 준비금은 처음보다 ${manwon(goalDelta)} 늘었습니다.`);
    else if (goalDelta < 0) changed.push(`목표 준비금은 처음보다 ${manwon(Math.abs(goalDelta))} 줄었습니다.`);
  }

  const paidDebtBalance = snapshot.paidExtraAnswers?.debtBalanceManwon;
  const beforeDebt =
    before.debtRemainingKrw ??
    (typeof paidDebtBalance === "number" ? paidDebtBalance * 10000 : undefined);
  if (
    before.hasDebt &&
    typeof current.debtRemainingKrw === "number" &&
    typeof beforeDebt === "number"
  ) {
    const debtDelta = current.debtRemainingKrw - beforeDebt;
    if (debtDelta < 0) changed.push(`확인한 부채 잔액은 처음보다 ${manwon(Math.abs(debtDelta))} 줄었습니다.`);
    else if (debtDelta > 0) changed.push(`확인한 부채 잔액은 처음보다 ${manwon(debtDelta)} 늘었습니다.`);
  }

  const favorableMovement =
    surplusDelta > 0 ||
    emergencyDelta > 0 ||
    (snapshot.focusedQuestion === "goal" &&
      typeof current.goalPreparedKrw === "number" &&
      typeof beforeGoal === "number" &&
      current.goalPreparedKrw > beforeGoal) ||
    (before.hasDebt &&
      typeof current.debtRemainingKrw === "number" &&
      typeof beforeDebt === "number" &&
      current.debtRemainingKrw < beforeDebt);

  let headline = "아직 방향을 바꿀 단계는 아닙니다.";
  let summary = "이번 30일은 결과보다 실제 실행 여부를 확인하는 단계입니다.";
  let keep = "처음 정한 방향은 유지하되, 실행을 막은 이유를 줄이는 데 집중합니다.";
  let nextAction = snapshot.paidResult.check30.action;

  if (current.executionStatus === "done" && favorableMovement) {
    headline = "정한 방향이 실제 변화로 이어지고 있습니다.";
    summary = "실행과 숫자의 변화가 함께 확인됩니다. 지금은 새로운 일을 늘리기보다 효과가 있었던 흐름을 한 번 더 이어가는 편이 좋습니다.";
    keep = "이번에 실제로 효과가 있었던 행동은 다음 30일에도 유지합니다.";
    nextAction = snapshot.paidResult.firstAction;
  } else if (current.executionStatus === "done") {
    headline = "실행은 완료했습니다. 숫자는 조금 더 지켜볼 수 있습니다.";
    summary = "한 달 안에 모든 숫자가 바로 달라지지는 않습니다. 먼저 실행을 유지하면서 다음 점검에서 같은 기준을 다시 비교합니다.";
    keep = "이미 실행한 행동을 중단하지 말고 한 번 더 이어갑니다.";
    nextAction = snapshot.paidResult.check30.action;
  } else if (current.executionStatus === "partial") {
    headline = "변화는 시작됐지만, 아직 한 번 더 이어가야 합니다.";
    summary = "일부 실행은 확인됐습니다. 새로운 계획을 추가하기보다 이번 행동을 실제 생활에 자리 잡게 만드는 것이 먼저입니다.";
    keep = "이미 시작한 부분은 유지하고, 끝내지 못한 이유 하나만 줄입니다.";
    nextAction = snapshot.paidResult.check30.action;
  } else {
    const blocker = current.difficulty?.trim();
    headline = "이번에는 실행을 막은 이유부터 줄이는 게 먼저입니다.";
    summary = blocker
      ? `실행하지 못한 이유로 ‘${blocker}’을 적었습니다. 같은 계획을 더 크게 잡기보다 이 방해요인을 줄이는 방식으로 다시 시작합니다.`
      : "내용을 확인했더라도 실행하지 않으면 현실의 변화로 이어지지 않습니다. 계획을 더 늘리기보다 처음 정한 한 가지를 더 작게 시작합니다.";
    keep = "처음의 우선순위는 그대로 두고, 실행 난이도만 낮춥니다.";
    nextAction = snapshot.paidResult.firstAction;
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
