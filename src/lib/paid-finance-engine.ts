import type { AnalysisResult } from "@/lib/analysis-result";
import { financeQuestion, type FinanceQuestionId } from "@/lib/finance-question";
import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";
import { purposeFunding, validDate } from "@/lib/financial-evidence";

export interface PaidExtraOption {
  value: string;
  label: string;
}

export interface PaidExtraQuestion {
  id: string;
  label: string;
  helper?: string;
  type: "number" | "date" | "select";
  unit?: string;
  options?: PaidExtraOption[];
}

export type PaidExtraAnswers = Record<string, string | number>;

export interface PaidDirection {
  title: string;
  detail: string;
}

export interface PaidFinanceResult {
  question: string;
  conclusion: string;
  reasons: string[];
  directions: PaidDirection[];
  firstAction: string;
  details: string[];
  /** 선택한 다른 고민도 함께 검토했다는 짧은 결과. 주 결론과 혼동하지 않는다. */
  concernSummary?: PaidDirection[];
  check30: {
    action: string;
    checkpoints: string[];
  };
}

function manwonFromKrw(krw: number): string {
  const value = Math.round((krw / 10000) * 10) / 10;
  return `${value.toLocaleString("ko-KR")}만원`;
}

function answerNumber(answers: PaidExtraAnswers, key: string): number | undefined {
  const value = answers[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function moneyAnswerKrw(answers: PaidExtraAnswers, key: string): number | undefined {
  const value = answerNumber(answers, key);
  return value === undefined ? undefined : value * 10000;
}

function isFutureDate(dateValue?: string): boolean {
  if (!validDate(dateValue)) return false;
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return dateValue! > todayIso;
}

function monthsUntil(dateValue?: string): number | null {
  if (!isFutureDate(dateValue)) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  const days = (date.getTime() - Date.now()) / 86400000;
  return Math.max(1, Math.ceil(days / 30.44));
}

function hasNearEvent(input: SurveyInput): boolean {
  return (
    input.futureEvents.length > 0 &&
    !input.futureEvents.includes("none") &&
    input.futureEventTiming !== "over_1y"
  );
}

function pushUrgentDebtQuestions(
  questions: PaidExtraQuestion[],
  input: SurveyInput,
): void {
  if (!Number.isFinite(input.debtRemainingKrw)) {
    questions.push({
      id: "debtBalanceManwon",
      label: "가장 가까운 만기에 남아 있을 대출 잔액은 대략 얼마인가요?",
      type: "number",
      unit: "만원",
    });
  }
  if (!Number.isFinite(input.debtPreparedKrw)) {
    questions.push({
      id: "debtPreparedManwon",
      label: "그 만기를 위해 따로 준비한 상환자금은 얼마인가요?",
      type: "number",
      unit: "만원",
    });
  }
  if (!isFutureDate(input.debtMaturityDate)) {
    questions.push({
      id: "debtMaturityDate",
      label: "가장 가까운 대출의 정확한 만기일은 언제인가요?",
      helper: "오늘 이후의 날짜를 입력해주세요.",
      type: "date",
    });
  }
}

export function buildPaidExtraQuestions(
  question: FinanceQuestionId,
  input: SurveyInput,
): PaidExtraQuestion[] {
  const questions: PaidExtraQuestion[] = [];

  if (question === "status" && input.hasDebt) {
    if (input.debtMaturity === "under_3m") {
      pushUrgentDebtQuestions(questions, input);
    } else {
      if (!Number.isFinite(input.debtRemainingKrw)) {
        questions.push({
          id: "debtBalanceManwon",
          label: "현재 남아 있는 대출·부채는 대략 얼마인가요?",
          type: "number",
          unit: "만원",
        });
      }
      questions.push({
        id: "debtRate",
        label: "가장 높은 대출 금리는 어느 정도인가요?",
        type: "number",
        unit: "%",
      });
    }
  }

  if (question === "goal") {
    if (!Number.isFinite(input.goalRequiredKrw)) {
      questions.push({
        id: "goalAmountManwon",
        label: "그 목표에 필요한 금액은 어느 정도인가요?",
        type: "number",
        unit: "만원",
      });
    }
    if (!Number.isFinite(input.goalPreparedKrw)) {
      questions.push({
        id: "goalPreparedManwon",
        label: "지금까지 그 목표를 위해 준비한 금액은 얼마인가요?",
        type: "number",
        unit: "만원",
      });
    }
    if (!Number.isFinite(input.goalMonthlyAllocationKrw)) {
      questions.push({
        id: "goalMonthlyAllocationManwon",
        label: "현재 이 목표에 따로 배정하고 있는 월 금액은 얼마인가요?",
        helper: "전체 저축·투자액이 아니라 이 목표에 실제로 넣는 금액만 적어주세요.",
        type: "number",
        unit: "만원",
      });
    }
    if (!isFutureDate(input.goalDeadline)) {
      questions.push({
        id: "goalDeadline",
        label: "언제까지 준비하고 싶나요?",
        helper: "오늘 이후의 날짜를 입력해주세요.",
        type: "date",
      });
    }
  }

  if (question === "priority") {
    if (input.hasDebt) {
      if (input.debtMaturity === "under_3m") {
        pushUrgentDebtQuestions(questions, input);
      } else {
        questions.push({
          id: "debtRate",
          label: "가장 높은 대출 금리는 어느 정도인가요?",
          type: "number",
          unit: "%",
        });
      }
    }
    if (hasNearEvent(input) && !Number.isFinite(input.goalRequiredKrw)) {
      questions.push({
        id: "goalAmountManwon",
        label: "가장 가까운 목표에 필요한 금액은 대략 얼마인가요?",
        type: "number",
        unit: "만원",
      });
    }
    if (hasNearEvent(input) && !Number.isFinite(input.goalPreparedKrw)) {
      questions.push({
        id: "goalPreparedManwon",
        label: "그 목표를 위해 현재 준비한 금액은 얼마인가요?",
        type: "number",
        unit: "만원",
      });
    }
  }

  if (question === "leakage") {
    questions.push({
      id: "actualLeftoverManwon",
      label: "실제로 한 달이 끝났을 때 남아 있는 돈은 보통 얼마인가요?",
      type: "number",
      unit: "만원",
    });
    if (input.expenseAwareness !== "precise") {
      questions.push({
        id: "recentLivingManwon",
        label: "최근 한 달 실제 생활비·변동지출은 대략 얼마였나요?",
        helper: "카드·이체·현금 사용을 합쳐 대략 적어주세요.",
        type: "number",
        unit: "만원",
      });
    }
    questions.push({
      id: "cardCover",
      label: "생활비가 부족할 때 카드·할부로 다음 달로 넘기는 일이 있나요?",
      type: "select",
      options: [
        { value: "yes", label: "종종 있다" },
        { value: "no", label: "거의 없다" },
      ],
    });
  }

  if (question === "order") {
    if (input.hasDebt) {
      if (input.debtMaturity === "under_3m") {
        pushUrgentDebtQuestions(questions, input);
      } else {
        if (!Number.isFinite(input.debtRemainingKrw)) {
          questions.push({
            id: "debtBalanceManwon",
            label: "현재 남아 있는 대출·부채는 대략 얼마인가요?",
            type: "number",
            unit: "만원",
          });
        }
        questions.push({
          id: "debtRate",
          label: "가장 높은 대출 금리는 어느 정도인가요?",
          type: "number",
          unit: "%",
        });
      }
    }
    questions.push({
      id: "useHorizon",
      label: "저축·투자하려는 돈을 언제쯤 쓸 가능성이 가장 큰가요?",
      type: "select",
      options: [
        { value: "under_1y", label: "1년 안" },
        { value: "1_3y", label: "1~3년" },
        { value: "over_3y", label: "3년 이후" },
        { value: "unknown", label: "아직 정하지 못함" },
      ],
    });
  }

  return questions.slice(0, 4);
}

export function paidQuestionsComplete(
  questions: PaidExtraQuestion[],
  answers: PaidExtraAnswers,
): boolean {
  return questions.every((question) => {
    const value = answers[question.id];
    if (question.type === "number") return typeof value === "number" && Number.isFinite(value) && value >= 0;
    if (question.type === "date") return typeof value === "string" && isFutureDate(value);
    return typeof value === "string" && value.trim().length > 0;
  });
}

function baseReasons(input: SurveyInput, result: AnalysisResult): string[] {
  const surplus = surplusKrw(input);
  const reasons = [
    surplus >= 0
      ? `현재 입력한 흐름에서는 저축·투자 후 월 ${manwonFromKrw(surplus)} 정도가 남습니다.`
      : `현재 입력한 흐름에서는 저축·투자까지 포함하면 월 ${manwonFromKrw(Math.abs(surplus))} 정도가 부족합니다.`,
    result.why,
  ];

  if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    reasons.push("바로 사용할 수 있는 여유자금이 얇아 다른 선택보다 먼저 안정성을 확인할 필요가 있습니다.");
  }

  return reasons.slice(0, 3);
}

function statusResult(
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidFinanceResult {
  const surplus = surplusKrw(input);
  const exactDebtRate = answerNumber(answers, "debtRate");
  const highRate = (exactDebtRate ?? 0) >= 15 || input.debtInterestRate === "over_15";
  const urgentMaturity = input.hasDebt === true && input.debtMaturity === "under_3m";
  const debtBalance = moneyAnswerKrw(answers, "debtBalanceManwon") ?? input.debtRemainingKrw;
  const debtPrepared = moneyAnswerKrw(answers, "debtPreparedManwon") ?? input.debtPreparedKrw;
  const debtMaturityDate =
    (typeof answers.debtMaturityDate === "string" ? answers.debtMaturityDate : undefined) ??
    input.debtMaturityDate;
  const maturityGap =
    debtBalance !== undefined && debtPrepared !== undefined
      ? Math.max(0, debtBalance - debtPrepared)
      : null;

  let conclusion = "현재 확인한 범위에서는 급하게 순서를 바꿔야 할 문제는 없습니다. 지금의 흐름을 유지하면서 다음 목표를 붙여도 됩니다.";
  let firstAction = "현재 저축·지출 흐름을 한 달 더 유지하고, 다음 목표의 금액과 날짜를 정해보세요.";
  let decisionReason = "현재 입력한 소득·지출·비상자금·부채 조건에서 우선순위를 바꿀 신호가 확인되지 않았습니다.";

  if (surplus < 0) {
    conclusion = "지금은 잘하고 있는지를 평가하기보다, 매달 부족해지는 흐름부터 바로잡는 것이 먼저입니다.";
    firstAction = "이번 달 고정지출·생활비·저축 배분을 한 줄로 적고, 월소득 안에서 다시 나눠보세요.";
    decisionReason = "저축·투자까지 포함한 현재 월 배분이 소득을 넘어섭니다.";
  } else if (urgentMaturity) {
    if (
      debtBalance !== undefined &&
      debtPrepared !== undefined &&
      debtMaturityDate &&
      isFutureDate(debtMaturityDate)
    ) {
      if ((maturityGap ?? 0) > 0) {
        conclusion = `가장 가까운 대출 만기까지 현재 준비금만으로는 약 ${manwonFromKrw(maturityGap!)}이 부족합니다. 지금은 다른 계획보다 이 차이를 어떻게 메울지 먼저 정해야 합니다.`;
        firstAction = `${debtMaturityDate} 만기 전에 부족분 약 ${manwonFromKrw(maturityGap!)}을 어떤 현금흐름으로 준비할지 먼저 정해보세요.`;
        decisionReason = `만기 잔액 약 ${manwonFromKrw(debtBalance)} 중 현재 따로 준비한 상환자금은 약 ${manwonFromKrw(debtPrepared)}입니다.`;
      } else {
        conclusion = "가장 가까운 대출 만기 잔액만큼의 상환자금은 현재 입력 기준으로 준비되어 있습니다. 이제 이 돈이 다른 목표와 겹치지 않는지만 확인하면 됩니다.";
        firstAction = `${debtMaturityDate} 만기에 쓸 상환자금이 다른 생활비·목적자금과 중복되지 않았는지 한 번 확인해보세요.`;
        decisionReason = `만기 잔액 약 ${manwonFromKrw(debtBalance)}와 같거나 더 많은 상환자금을 따로 준비했다고 입력했습니다.`;
      }
    } else {
      conclusion = "지금은 새로운 계획보다 가까운 대출 만기에 실제로 필요한 상환자금부터 확인해야 합니다.";
      firstAction = "가장 가까운 대출의 정확한 만기일·만기 잔액·이미 준비한 상환자금을 한곳에 적어보세요.";
      decisionReason = "가장 가까운 대출 만기가 3개월 이내라고 답했습니다. 금리와 별개로 만기 준비 여부를 먼저 확인해야 합니다.";
    }
  } else if (highRate) {
    conclusion = "전체 월 흐름이 유지되더라도, 현재는 새로운 재무계획보다 높은 금리의 부채 부담을 먼저 점검해야 합니다.";
    firstAction = "대출별 잔액·정확한 금리·월 상환액·만기를 한곳에 모아 가장 부담이 큰 부채부터 확인해보세요.";
    decisionReason = exactDebtRate !== undefined
      ? `추가 확인한 가장 높은 대출 금리는 ${exactDebtRate.toLocaleString("ko-KR")}%입니다.`
      : "가장 높은 대출 금리가 15% 이상 구간이라고 답했습니다.";
  } else if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    conclusion = "기본 흐름은 무너지지 않았지만, 바로 사용할 수 있는 여유가 얇아 아직 안정적이라고 보기는 어렵습니다.";
    firstAction = "투자자산과 구분해서 지금 바로 쓸 수 있는 비상자금 잔액부터 확인해보세요.";
    decisionReason = "바로 사용할 수 있는 여유자금이 1개월 미만이라고 답했습니다.";
  } else if (result.bottleneck !== "no_priority_bottleneck") {
    conclusion = result.headline;
    firstAction = result.immediateDirection;
    decisionReason = result.why;
  }

  const reasons = [
    surplus >= 0
      ? `현재 입력한 흐름에서는 저축·투자 후 월 ${manwonFromKrw(surplus)} 정도가 남습니다.`
      : `현재 입력한 흐름에서는 저축·투자까지 포함하면 월 ${manwonFromKrw(Math.abs(surplus))} 정도가 부족합니다.`,
    decisionReason,
  ];

  if (debtBalance !== undefined && debtBalance > 0) {
    reasons.push(
      debtPrepared !== undefined && urgentMaturity
        ? `확인한 부채 잔액은 약 ${manwonFromKrw(debtBalance)}, 준비한 상환자금은 약 ${manwonFromKrw(debtPrepared)}입니다.`
        : `현재 확인한 부채 잔액은 약 ${manwonFromKrw(debtBalance)}입니다.`,
    );
  }

  return {
    question: financeQuestion("status").paywallTitle,
    conclusion,
    reasons: reasons.slice(0, 3),
    directions: [
      { title: "지금 유지할 것", detail: surplus >= 0 ? "현재 생활비와 저축의 큰 틀은 불필요하게 모두 바꾸지 않습니다." : "필수 생활비 기준은 유지합니다." },
      { title: "먼저 보완할 것", detail: firstAction },
      { title: "그다음", detail: "첫 번째 문제가 정리된 뒤 다음 목표나 장기 계획을 붙입니다." },
    ],
    firstAction,
    details: [result.gapStatement, result.answerContext],
    check30: {
      action: firstAction,
      checkpoints: ["이번 행동을 실제로 했는지", "월 현금흐름이 달라졌는지", input.hasDebt ? "부채 잔액·만기 준비가 달라졌는지" : "바로 쓸 수 있는 여유자금이 달라졌는지"],
    },
  };
}

function goalResult(
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidFinanceResult {
  const required = moneyAnswerKrw(answers, "goalAmountManwon") ?? input.goalRequiredKrw ?? 0;
  const prepared = moneyAnswerKrw(answers, "goalPreparedManwon") ?? input.goalPreparedKrw ?? 0;
  const deadline = (answers.goalDeadline as string | undefined) ?? input.goalDeadline;
  const cycles = monthsUntil(deadline);
  const shortfall = Math.max(0, required - prepared);
  const neededMonthly = cycles && shortfall > 0 ? shortfall / cycles : 0;
  const totalMonthlySavings = Math.max(0, input.monthlySavingsKrw);
  const paidMonthlyAllocation = moneyAnswerKrw(answers, "goalMonthlyAllocationManwon");
  const plannedMonthly =
    paidMonthlyAllocation ??
    (typeof input.goalMonthlyAllocationKrw === "number" &&
    Number.isFinite(input.goalMonthlyAllocationKrw) &&
    input.goalMonthlyAllocationKrw >= 0
      ? input.goalMonthlyAllocationKrw
      : undefined);

  let conclusion: string;
  let firstAction: string;

  if (!cycles && shortfall > 0) {
    conclusion = "목표금액과 준비금은 확인했지만 목표일이 유효하지 않아 현재 속도로 가능한지 아직 판단할 수 없습니다.";
    firstAction = "목표일을 오늘 이후 날짜로 다시 정한 뒤, 그 날짜까지의 월 준비액을 계산해보세요.";
  } else if (shortfall === 0) {
    conclusion = "현재 준비금으로 입력한 목표금액은 이미 채워져 있습니다. 이제는 이 돈을 다른 목적과 섞지 않고 유지하는 것이 중요합니다.";
    firstAction = "이미 준비된 목표자금을 별도 잔액으로 구분해 다른 지출과 섞이지 않는지 확인해보세요.";
  } else if (plannedMonthly === undefined) {
    conclusion = "목표일까지 필요한 속도는 계산할 수 있지만, 현재 전체 저축 중 이 목표에 실제로 얼마를 배정하는지는 아직 확인되지 않았습니다.";
    firstAction = `전체 저축과 별개로 이 목표에 월 얼마를 배정할지 정해보세요. 목표 시점을 유지하려면 약 ${manwonFromKrw(neededMonthly)}가 필요합니다.`;
  } else if (plannedMonthly + 1 < neededMonthly) {
    conclusion = "현재 목표 전용 배정액을 그대로 유지하면 입력한 목표 시점을 맞추기 어렵습니다. 전체 저축액이 아니라 이 목표에 실제 배정한 금액을 기준으로 봤습니다.";
    firstAction = `현재 목표 전용 월 ${manwonFromKrw(plannedMonthly)}를 유지할지, 필요한 월 약 ${manwonFromKrw(neededMonthly)}에 가깝게 조정할지, 또는 목표 금액·시점 중 하나를 다시 정해보세요.`;
  } else {
    conclusion = "현재 목표 전용 배정액을 유지하면 입력한 목표 시점에 맞춰 준비할 수 있는 범위입니다. 다른 목표나 생활비를 흔들지 않는지가 다음 확인점입니다.";
    firstAction = `현재 목표 전용 월 ${manwonFromKrw(plannedMonthly)} 배정을 한 달 더 유지하고 실제 입금 여부를 확인해보세요.`;
  }

  const directions: PaidDirection[] = [
    {
      title: "목표 시점을 유지한다면",
      detail: shortfall === 0
        ? "추가 적립보다 현재 준비금을 목적에 맞게 유지합니다."
        : cycles
          ? `남은 ${manwonFromKrw(shortfall)}를 위해 월 약 ${manwonFromKrw(neededMonthly)}가 필요합니다.`
          : "유효한 목표일을 먼저 확인해야 필요한 월 준비액을 계산할 수 있습니다.",
    },
  ];

  if (plannedMonthly !== undefined) {
    const monthsAtPlan = plannedMonthly > 0 && shortfall > 0 ? Math.ceil(shortfall / plannedMonthly) : null;
    directions.push({
      title: "현재 목표 전용 배정",
      detail: shortfall === 0
        ? `현재 월 ${manwonFromKrw(plannedMonthly)} 배정은 추가 목표가 생기기 전까지 재확인할 수 있습니다.`
        : monthsAtPlan
          ? `현재 월 ${manwonFromKrw(plannedMonthly)}만 이 목표에 계속 넣는다면 단순 계산으로 약 ${monthsAtPlan}개월이 필요합니다.`
          : "현재 이 목표에 따로 배정한 금액이 0원이어서, 목표 시점을 맞추려면 배정액이나 목표 조건을 바꿔야 합니다.",
    });
  } else {
    directions.push({
      title: "현재 계획에서 빠진 것",
      detail: "전체 저축·투자액과 별개로 이 목표에 실제 배정할 월 금액을 정해야 합니다.",
    });
  }

  directions.push({
    title: "전체 저축을 재배분한다면",
    detail: `현재 월 저축·투자액 ${manwonFromKrw(totalMonthlySavings)}는 가능한 최대 범위를 보는 참고값일 뿐, 전부 이 목표에 쓰는 현재 계획으로 가정하지 않습니다.`,
  });

  const effectiveFunding = purposeFunding({
    ...input,
    goalRequiredKrw: required,
    goalPreparedKrw: prepared,
    goalMonthlyAllocationKrw: plannedMonthly,
    goalDeadline: deadline,
  });

  // 무료·유료가 같은 현실 사실을 서로 다르게 판정하지 않도록
  // 유료 목표 결론도 공통 purposeFunding 판정을 최종 권위로 사용한다.
  if (effectiveFunding.state === "SHORTFALL") {
    conclusion = `현재 목표 전용 배정액과 준비금 기준으로는 목표일까지 약 ${manwonFromKrw(effectiveFunding.gapKrw)}이 부족합니다.`;
    firstAction = `목표 전용 월 배정액 ${manwonFromKrw(effectiveFunding.monthly)}을 유지할 수 있는지 확인하고, 부족분을 줄이려면 목표 금액·시점·월 배정액 중 하나를 조정해보세요.`;
    directions.splice(0, directions.length,
      { title: "현재 계획을 유지한다면", detail: `현재 월 배정액을 기준으로는 목표일까지 약 ${manwonFromKrw(effectiveFunding.gapKrw)}이 부족합니다.` },
      { title: "바꿀 수 있는 것", detail: "목표 금액, 목표 시점, 목표 전용 월 배정액 중 현실적으로 바꿀 수 있는 한 가지를 먼저 정해보세요." },
    );
  } else if (effectiveFunding.state === "ON_PLAN") {
    conclusion = "현재 확인된 목표 전용 계획은 목표일까지 필요한 금액을 준비할 수 있는 범위입니다.";
    firstAction = `목표 전용 월 배정액 ${manwonFromKrw(effectiveFunding.monthly)}이 실제로 분리되어 입금되는지 다음 입금일에 확인해보세요.`;
    directions.splice(0, directions.length,
      { title: "유지할 것", detail: "목표 전용 월 배정액을 다른 생활비·목표와 섞지 않고 실제 입금 여부를 확인합니다." },
      { title: "다시 볼 조건", detail: "소득·생활비·목표 금액이나 날짜가 바뀌면 같은 계산을 다시 해야 합니다." },
    );
  } else if (effectiveFunding.state === "NEEDS_CONFIRMATION") {
    conclusion = "현재 입력만으로는 목표 계획이 가능한지 확정하기 어렵습니다. 확인되지 않은 값을 가능하다고 처리하지 않았습니다.";
    firstAction = "목표 필요금액, 현재 준비금, 목표 전용 월 배정액, 목표 날짜를 실제 값으로 확인해보세요.";
    directions.splice(0, directions.length,
      { title: "먼저 확인할 것", detail: "필요금액·준비금·목표 전용 월 배정액·목표 날짜 네 가지를 같은 시점 기준으로 맞춰보세요." },
      { title: "지금은 단정하지 않는 것", detail: "확인 전에는 가능/불가능 어느 쪽으로도 확정하지 않습니다." },
    );
  }

  const blocksGoalPlan = [
    "cash_flow_deficit",
    "maturity_preparation",
    "income_interruption_risk",
    "high_interest_debt",
  ].includes(result.bottleneck);
  if (blocksGoalPlan) {
    conclusion = `목표 계획보다 먼저 현재 재무 위험을 확인해야 합니다. ${result.headline}`;
    firstAction = result.immediateDirection;
    directions.splice(0, directions.length,
      { title: "먼저 볼 것", detail: result.gapStatement },
      { title: "그다음 목표 계획", detail: "현재 위험을 정리한 뒤 남는 현금흐름을 기준으로 목표 전용 배정액을 다시 계산합니다." },
    );
  }

  let fundingReasons: string[];
  let fundingDetail: string;

  if (blocksGoalPlan) {
    fundingReasons = [
      result.why,
      result.gapStatement,
      "현재 위험을 먼저 정리한 뒤 목표 전용 배정액을 다시 계산합니다.",
    ];
    fundingDetail = result.gapStatement;
  } else if (effectiveFunding.state === "SHORTFALL") {
    fundingReasons = [
      `필요금액 ${manwonFromKrw(effectiveFunding.required)}, 현재 준비금 ${manwonFromKrw(effectiveFunding.prepared)}, 목표 전용 월 배정액 ${manwonFromKrw(effectiveFunding.monthly)}을 같은 기준으로 계산했습니다.`,
      `${effectiveFunding.deadline}까지 현재 계산 기준으로 ${effectiveFunding.savingCycles}회의 적립 기회를 반영해도 약 ${manwonFromKrw(effectiveFunding.gapKrw)}이 부족합니다.`,
      `전체 월 저축·투자액 ${manwonFromKrw(totalMonthlySavings)}을 이 목표 전용 자금으로 중복 계산하지 않았습니다.`,
    ];
    fundingDetail = `${effectiveFunding.deadline}까지 필요금액 ${manwonFromKrw(effectiveFunding.required)}, 준비금 ${manwonFromKrw(effectiveFunding.prepared)}, 월 배정액 ${manwonFromKrw(effectiveFunding.monthly)} 기준으로 약 ${manwonFromKrw(effectiveFunding.gapKrw)}이 부족합니다.`;
  } else if (effectiveFunding.state === "ON_PLAN") {
    fundingReasons = [
      `필요금액 ${manwonFromKrw(effectiveFunding.required)}, 현재 준비금 ${manwonFromKrw(effectiveFunding.prepared)}, 목표 전용 월 배정액 ${manwonFromKrw(effectiveFunding.monthly)}을 같은 기준으로 계산했습니다.`,
      `${effectiveFunding.deadline}까지 현재 계산 기준으로 ${effectiveFunding.savingCycles}회의 적립 기회를 반영했습니다.`,
      `전체 월 저축·투자액 ${manwonFromKrw(totalMonthlySavings)}을 이 목표 전용 자금으로 중복 계산하지 않았습니다.`,
    ];
    fundingDetail = `${effectiveFunding.deadline}까지 필요금액 ${manwonFromKrw(effectiveFunding.required)}, 준비금 ${manwonFromKrw(effectiveFunding.prepared)}, 월 배정액 ${manwonFromKrw(effectiveFunding.monthly)} 기준으로 현재 계획 범위 안입니다.`;
  } else if (effectiveFunding.state === "PREPARED_SELF_REPORT") {
    fundingReasons = [
      "목표자금은 충분히 준비했다고 답했지만 실제 사용 가능한 금액과 지급일은 아직 숫자로 확인하지 않았습니다.",
      "확인되지 않은 세부 금액을 임의로 계산하지 않았습니다.",
    ];
    fundingDetail = "실제 사용 가능한 목표자금과 지급일을 확인하면 다음 판단이 가능합니다.";
  } else {
    fundingReasons = [
      "목표 필요금액·준비금·목표 전용 월 배정액·목표 날짜 중 일부가 빠졌거나 현재 현금흐름과 맞지 않아 추가 확인이 필요합니다.",
      `전체 월 저축·투자액 ${manwonFromKrw(totalMonthlySavings)}을 목표 전용 자금으로 임의 전환하지 않았습니다.`,
    ];
    fundingDetail = "목표 필요금액·준비금·목표 전용 월 배정액·목표 날짜를 같은 시점 기준으로 확인해야 계획 가능 여부를 판단할 수 있습니다.";
  }

  return {
    question: financeQuestion("goal").paywallTitle,
    conclusion,
    reasons: fundingReasons,
    directions: directions.slice(0, 3),
    firstAction,
    details: [
      fundingDetail,
      "가까운 목적자금과 장기 저축·투자는 같은 돈으로 중복 계산하지 않습니다.",
    ],
    check30: {
      action: firstAction,
      checkpoints: ["목표 전용 금액이 실제로 분리됐는지", "목표 준비금이 얼마나 늘었는지", "생활비나 다른 목표가 흔들리지 않았는지"],
    },
  };
}

function priorityResult(
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidFinanceResult {
  const surplus = surplusKrw(input);
  const exactDebtRate = answerNumber(answers, "debtRate");
  const highRate = (exactDebtRate ?? 0) >= 15 || input.debtInterestRate === "over_15";
  const urgentMaturity = input.hasDebt === true && input.debtMaturity === "under_3m";
  const goalAmount = moneyAnswerKrw(answers, "goalAmountManwon") ?? input.goalRequiredKrw;
  const goalPrepared = moneyAnswerKrw(answers, "goalPreparedManwon") ?? input.goalPreparedKrw;
  const goalGap =
    goalAmount !== undefined && goalPrepared !== undefined
      ? Math.max(0, goalAmount - goalPrepared)
      : null;
  const funding = purposeFunding({
    ...input,
    goalRequiredKrw: goalAmount,
    goalPreparedKrw: goalPrepared,
  });

  let conclusion = result.headline;
  let firstAction = result.immediateDirection;

  if (surplus < 0) {
    conclusion = "지금의 1순위는 투자나 추가 저축이 아니라 매달 부족해지는 흐름을 멈추는 것입니다.";
    firstAction = "이번 달 실제 지출과 저축 배분을 소득 안에서 다시 맞춰보세요.";
  } else if (input.jobType === "transitioning") {
    conclusion = "지금의 1순위는 소득이 바뀌는 시기를 버틸 수 있도록 생활자금과 현금 여유를 먼저 확인하는 것입니다.";
    firstAction = "소득이 달라지는 시점과 그 기간에 필요한 생활비, 바로 쓸 수 있는 현금을 나란히 적어보세요.";
  } else if (urgentMaturity) {
    conclusion = "지금의 1순위는 금리와 별개로 가까운 대출 만기에 필요한 상환자금을 확인하는 것입니다.";
    firstAction = "가장 가까운 대출의 정확한 만기일·만기 잔액·준비한 상환자금을 먼저 확인해보세요.";
  } else if (highRate) {
    conclusion = "현재 확인된 조건에서는 다른 계획을 늘리기 전에 높은 금리의 부채 부담을 먼저 점검하는 것이 1순위입니다.";
    firstAction = "대출별 잔액·정확한 금리·월 상환액·만기를 한곳에 모아 실제 부담을 확인해보세요.";
  } else if (funding.state === "SHORTFALL" && hasNearEvent(input)) {
    conclusion = "가장 가까운 미래 목표의 현재 배정 속도로는 부족분이 남아, 그 목적자금의 조건을 먼저 조정하는 것이 1순위입니다.";
    firstAction = "가장 가까운 목표의 필요액·준비액·월 배정액·목표일을 놓고 무엇을 조정할지 하나 정해보세요.";
  } else if (funding.state === "NEEDS_CONFIRMATION" && hasNearEvent(input)) {
    conclusion = "가까운 미래 목표가 있지만 필요한 숫자가 덜 확인되어, 다른 계획보다 목적자금의 실제 필요액과 준비상태부터 확인해야 합니다.";
    firstAction = "가장 가까운 목표의 실제 필요금액·현재 준비금·월 배정액·목표일을 먼저 확인해보세요.";
  } else if (goalGap !== null && goalGap > 0 && hasNearEvent(input)) {
    conclusion = "가장 가까운 미래 목표에 아직 준비되지 않은 금액이 있어, 지금은 그 목적자금을 먼저 확정하는 것이 1순위입니다.";
    firstAction = "가장 가까운 목표의 필요금액과 현재 준비금을 따로 적고 이번 달 배분액을 확인해보세요.";
  } else if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    conclusion = "지금은 새로운 계획보다 바로 사용할 수 있는 여유자금을 먼저 만드는 것이 1순위입니다.";
    firstAction = "투자자산과 구분해서 바로 사용할 수 있는 비상자금 잔액부터 확인해보세요.";
  }

  return {
    question: financeQuestion("priority").paywallTitle,
    conclusion,
    reasons: baseReasons(input, result),
    directions: [
      { title: "지금 1순위", detail: firstAction },
      { title: "그다음", detail: "첫 번째 문제가 정리된 뒤 다음 고민으로 넘어갑니다." },
      { title: "지금은 보류", detail: result.notUrgentReason },
    ],
    firstAction,
    details: [result.gapStatement, goalGap !== null ? `가까운 목표의 미준비 금액은 약 ${manwonFromKrw(goalGap)}입니다.` : ""].filter(Boolean),
    check30: {
      action: firstAction,
      checkpoints: ["이번 1순위를 실제로 실행했는지", "처음보다 상태가 나아졌는지", "다음 문제로 넘어갈 준비가 됐는지"],
    },
  };
}

function leakageResult(
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidFinanceResult {
  const expectedLeftover = surplusKrw(input);
  const actualLeftover = moneyAnswerKrw(answers, "actualLeftoverManwon") ?? 0;
  const recentLiving = moneyAnswerKrw(answers, "recentLivingManwon");
  const cardCover = answers.cardCover === "yes";
  const unexplainedGap = expectedLeftover - actualLeftover;

  let conclusion = "현재 입력만 보면 구조적으로 돈이 전혀 남지 않는 상태는 아닙니다. 실제 지출과 입력한 지출 사이의 차이를 먼저 찾는 것이 핵심입니다.";
  if (expectedLeftover < 0) {
    conclusion = "돈이 안 모이는 주된 이유는 작은 소비 몇 건보다 현재 배분 자체가 월소득을 넘어서는 구조에 가깝습니다.";
  } else if (recentLiving !== undefined && recentLiving > input.monthlyLivingCostKrw) {
    conclusion = "예상보다 실제 생활비가 더 크게 나가고 있어, 계획한 생활비와 실제 생활비의 차이가 저축을 깎고 있습니다.";
  } else if (cardCover) {
    conclusion = "이번 달 부족분을 다음 달 카드·할부로 넘기는 흐름이 반복되면서 실제로 남는 돈을 줄이고 있습니다.";
  } else if (unexplainedGap > 0) {
    conclusion = "계산상 남아야 하는 금액과 실제로 남는 금액 사이에 차이가 있습니다. 먼저 이 차이가 어디서 생기는지 확인해야 합니다.";
  }

  const reasons = [
    `입력한 구조상 한 달 뒤 남아야 하는 금액은 약 ${manwonFromKrw(expectedLeftover)}입니다.`,
    `실제로 남는다고 답한 금액은 약 ${manwonFromKrw(actualLeftover)}입니다.`,
  ];
  if (unexplainedGap > 0) reasons.push(`두 금액의 차이는 약 ${manwonFromKrw(unexplainedGap)}입니다.`);

  return {
    question: financeQuestion("leakage").paywallTitle,
    conclusion,
    reasons,
    directions: [
      { title: "먼저 확인", detail: "최근 한 달 거래내역을 고정비·생활비·그 밖의 지출 세 묶음으로만 나눠봅니다." },
      { title: "한 가지 수정", detail: "차이가 가장 크게 난 한 항목만 이번 달 관리 대상으로 정합니다." },
      { title: "저축은 그다음", detail: "실제 흐름을 확인하기 전에는 무리하게 저축액을 더 늘리지 않습니다." },
    ],
    firstAction: "최근 한 달 거래내역에서 ‘계산상 남아야 하는 돈’과 ‘실제로 남은 돈’의 차이부터 찾아보세요.",
    details: [result.gapStatement, cardCover ? "카드·할부로 다음 달에 넘긴 금액이 있다면 이번 달 지출과 분리해 확인해야 합니다." : ""].filter(Boolean),
    check30: {
      action: "이번 30일은 지출 전체를 매일 기록하지 말고, 계산상 남아야 하는 돈과 실제 잔액의 차이만 한 번 맞춰보세요.",
      checkpoints: ["설명되지 않던 차이가 줄었는지", "실제 생활비가 얼마였는지", "다음 달로 넘긴 카드·할부가 줄었는지"],
    },
  };
}

function orderResult(
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidFinanceResult {
  const surplus = surplusKrw(input);
  const exactDebtRate = answerNumber(answers, "debtRate");
  const highRate = (exactDebtRate ?? 0) >= 15 || input.debtInterestRate === "over_15";
  const urgentMaturity = input.hasDebt === true && input.debtMaturity === "under_3m";
  const debtBalance = moneyAnswerKrw(answers, "debtBalanceManwon") ?? input.debtRemainingKrw ?? 0;
  const horizon = answers.useHorizon as string | undefined;

  let conclusion = "지금은 저축·대출·투자 중 하나를 무조건 고르기보다, 가까운 목표와 현금 여유를 먼저 확인한 뒤 순서를 정하는 것이 맞습니다.";
  let firstAction = result.immediateDirection;

  if (surplus < 0) {
    conclusion = "현재는 저축 확대나 투자보다 먼저 월 현금흐름을 안정시키는 것이 우선입니다.";
    firstAction = "이번 달 실제 지출과 저축 배분을 소득 안에서 다시 맞춰보세요.";
  } else if (urgentMaturity) {
    conclusion = "현재는 저축·투자 순서를 정하기 전에 가까운 대출 만기의 상환 준비부터 확인하는 것이 우선입니다.";
    firstAction = "가장 가까운 대출의 정확한 만기일·만기 잔액·준비한 상환자금을 먼저 확인해보세요.";
  } else if (input.hasDebt && highRate) {
    conclusion = "현재 확인한 부채 조건에서는 저축·투자 확대보다 높은 금리의 부채 부담을 먼저 점검하는 순서가 맞습니다.";
    firstAction = "대출별 금리·잔액·월 상환액·만기를 확인하고 가장 부담이 큰 부채부터 점검해보세요.";
  } else if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    conclusion = "지금은 투자 확대보다 바로 쓸 수 있는 여유자금을 먼저 확보하는 순서가 맞습니다.";
    firstAction = "투자자산과 구분해서 바로 사용할 수 있는 현금성 여유자금부터 확인해보세요.";
  } else if (horizon === "under_1y" || horizon === "1_3y") {
    conclusion = "가까운 시기에 사용할 가능성이 있는 돈은 투자 확대보다 사용 목적과 준비금액을 먼저 분리하는 것이 우선입니다.";
    firstAction = "1~3년 안에 쓸 돈과 장기간 두어도 되는 돈을 먼저 나눠보세요.";
  } else if (horizon === "over_3y") {
    conclusion = "현금흐름과 여유자금이 안정적이라면, 가까운 목적자금을 따로 확보한 뒤 장기자금의 운용방식을 검토할 수 있습니다.";
    firstAction = "가까운 목표자금과 3년 이상 두어도 되는 장기자금을 먼저 분리해보세요.";
  }

  const reasons = baseReasons(input, result);
  if (input.hasDebt) {
    reasons.push(
      exactDebtRate !== undefined
        ? `확인한 부채 잔액은 약 ${manwonFromKrw(debtBalance)}, 추가 확인한 가장 높은 금리는 ${exactDebtRate.toLocaleString("ko-KR")}%입니다.`
        : `확인한 부채 잔액은 약 ${manwonFromKrw(debtBalance)}, 금리 구간은 ${input.debtInterestRate === "over_15" ? "15% 이상" : input.debtInterestRate === "10_15" ? "10~15%" : "10% 미만"}입니다.`,
    );
  }

  return {
    question: financeQuestion("order").paywallTitle,
    conclusion,
    reasons: reasons.slice(0, 3),
    directions: [
      { title: "먼저", detail: firstAction },
      { title: "그다음", detail: "첫 단계가 안정되면 다음 목적의 저축 또는 장기자금을 검토합니다." },
      { title: "투자는", detail: "가까운 시기에 쓸 돈과 생활에 필요한 돈을 분리한 뒤 검토합니다." },
    ],
    firstAction,
    details: [result.gapStatement],
    check30: {
      action: firstAction,
      checkpoints: ["정한 순서대로 실제로 한 번 실행했는지", "현금 여유·부채·목적자금 중 가장 중요한 값이 달라졌는지", "다음 순서로 넘어가도 되는지"],
    },
  };
}

function summarizeConcern(
  id: FinanceQuestionId,
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidDirection {
  const title = financeQuestion(id).label;
  const surplus = surplusKrw(input);
  const exactDebtRate = answerNumber(answers, "debtRate");
  const highRate = (exactDebtRate ?? 0) >= 15 || input.debtInterestRate === "over_15";
  const urgentMaturity = input.hasDebt === true && input.debtMaturity === "under_3m";

  if (id === "status") {
    return {
      title,
      detail:
        result.bottleneck === "no_priority_bottleneck"
          ? "현재 확인한 범위에서는 급하게 구조를 바꿔야 할 신호가 없습니다."
          : `현재는 ‘${result.headline.replace(/^지금 가장 먼저 볼 부분은 |입니다\.$/g, "")}’을 먼저 정리한 뒤 전체 상태를 다시 보는 편이 맞습니다.`,
    };
  }

  if (id === "goal") {
    const effective = purposeFunding({
      ...input,
      goalRequiredKrw: moneyAnswerKrw(answers, "goalAmountManwon") ?? input.goalRequiredKrw,
      goalPreparedKrw: moneyAnswerKrw(answers, "goalPreparedManwon") ?? input.goalPreparedKrw,
      goalDeadline: (answers.goalDeadline as string | undefined) ?? input.goalDeadline,
    });
    if (effective.state === "SHORTFALL") {
      return { title, detail: "가까운 목표는 현재 월 배정 속도 기준으로 부족분이 남습니다. 목표 금액·시점·월 배정액 중 조정 가능한 값을 확인해야 합니다." };
    }
    if (effective.state === "ON_PLAN" || effective.state === "PREPARED_SELF_REPORT") {
      return { title, detail: "현재 확인한 목표 준비는 계획 범위 안에 있습니다. 다른 목표와 같은 돈을 중복 계산하지 않는지가 다음 확인점입니다." };
    }
    return { title, detail: "목표의 필요액·준비액·월 배정액·목표일이 모두 확인되지 않아 가능 여부는 아직 단정하지 않습니다." };
  }

  if (id === "priority") {
    return { title, detail: `${result.headline} 먼저 할 일은 ‘${result.immediateDirection}’입니다.` };
  }

  if (id === "leakage") {
    if (surplus < 0) return { title, detail: "작은 소비보다 현재 월 배분 자체가 소득을 넘는지부터 확인해야 합니다." };
    if (input.spendingPatterns.includes("card_dependence")) return { title, detail: "생활비 부족을 다음 달 카드로 넘기는 흐름이 있어, 이 부분이 실제 잔액을 줄이는지 먼저 확인해야 합니다." };
    if (input.expenseAwareness === "unknown") return { title, detail: "현재는 실제 지출이 확인되지 않아 어디서 새는지 단정하지 않습니다. 최근 거래내역 대조가 먼저입니다." };
    const actual = moneyAnswerKrw(answers, "actualLeftoverManwon");
    return {
      title,
      detail: actual === undefined
        ? "계산상 잔액과 실제 월말 잔액을 비교해야 원인을 구분할 수 있습니다. 현재 정보만으로 특정 소비를 원인으로 단정하지 않습니다."
        : `입력한 구조상 잔액과 실제 잔액의 차이를 기준으로 먼저 확인합니다.`,
    };
  }

  if (surplus < 0) return { title, detail: "현재는 저축·대출·투자 선택보다 월 적자를 멈추는 것이 앞섭니다." };
  if (urgentMaturity) return { title, detail: "가까운 대출 만기 준비를 확인한 뒤 저축·투자 순서를 정해야 합니다." };
  if (highRate) return { title, detail: "높은 금리의 부채 부담을 확인한 뒤 추가 저축·투자 순서를 정하는 편이 맞습니다." };
  if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    return { title, detail: "투자 확대보다 바로 쓸 수 있는 여유자금을 먼저 확보하는 순서가 앞섭니다." };
  }
  return { title, detail: "가까운 사용시점과 목적자금을 분리한 뒤 장기자금의 순서를 정할 수 있습니다." };
}

export function buildPaidFinanceResult(
  question: FinanceQuestionId,
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
  concerns: FinanceQuestionId[] = [question],
): PaidFinanceResult {
  const base =
    question === "status"
      ? statusResult(input, result, answers)
      : question === "goal"
        ? goalResult(input, result, answers)
        : question === "priority"
          ? priorityResult(input, result, answers)
          : question === "leakage"
            ? leakageResult(input, result, answers)
            : orderResult(input, result, answers);

  const concernSummary = concerns
    .filter((id, index, all) => id !== question && all.indexOf(id) === index)
    .map((id) => summarizeConcern(id, input, result, answers));

  return concernSummary.length > 0 ? { ...base, concernSummary } : base;
}
