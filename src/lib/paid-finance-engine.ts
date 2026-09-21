import type { AnalysisResult } from "@/lib/analysis-result";
import { financeQuestion, type FinanceQuestionId } from "@/lib/finance-question";
import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";

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

function monthsUntil(dateValue?: string): number | null {
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const days = (date.getTime() - Date.now()) / 86400000;
  if (days <= 0) return 1;
  return Math.max(1, Math.ceil(days / 30.44));
}

function hasNearEvent(input: SurveyInput): boolean {
  return input.futureEvents.length > 0 && !input.futureEvents.includes("none");
}

export function buildPaidExtraQuestions(
  question: FinanceQuestionId,
  input: SurveyInput,
): PaidExtraQuestion[] {
  const questions: PaidExtraQuestion[] = [];

  if (question === "status" && input.hasDebt) {
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
    if (!input.goalDeadline) {
      questions.push({
        id: "goalDeadline",
        label: "언제까지 준비하고 싶나요?",
        type: "date",
      });
    }
  }

  if (question === "priority") {
    if (input.hasDebt) {
      questions.push({
        id: "debtRate",
        label: "가장 높은 대출 금리는 어느 정도인가요?",
        type: "number",
        unit: "%",
      });
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

  return questions.slice(0, 3);
}

export function paidQuestionsComplete(
  questions: PaidExtraQuestion[],
  answers: PaidExtraAnswers,
): boolean {
  return questions.every((question) => {
    const value = answers[question.id];
    if (question.type === "number") return typeof value === "number" && Number.isFinite(value) && value >= 0;
    return typeof value === "string" && value.trim().length > 0;
  });
}

function baseReasons(input: SurveyInput, result: AnalysisResult): string[] {
  const surplus = surplusKrw(input);
  const reasons = [
    surplus >= 0
      ? `현재 입력한 흐름에서는 저축·투자 후 월 ${manwonFromKrw(surplus)}가 남습니다.`
      : `현재 입력한 흐름에서는 저축·투자까지 포함하면 월 ${manwonFromKrw(Math.abs(surplus))}가 부족합니다.`,
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
  const debtRate = answerNumber(answers, "debtRate");
  const debtBalance = moneyAnswerKrw(answers, "debtBalanceManwon") ?? input.debtRemainingKrw;
  const reasons = baseReasons(input, result);

  let conclusion = "현재 방향은 크게 흔들리지 않습니다. 새로운 계획을 늘리기보다 지금의 좋은 흐름을 유지하는 편이 좋습니다.";
  if (surplus < 0) {
    conclusion = "지금은 잘하고 있는지를 평가하기보다, 매달 부족해지는 흐름부터 바로잡는 것이 먼저입니다.";
  } else if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    conclusion = "기본 흐름은 무너지지 않았지만, 바로 사용할 수 있는 여유가 얇아 아직 안정적이라고 보기는 어렵습니다.";
  } else if ((debtRate ?? 0) >= 15) {
    conclusion = "전체 흐름은 유지되고 있지만, 현재는 새로운 재무계획보다 부채 부담을 먼저 점검할 필요가 있습니다.";
  }

  if (debtBalance && debtBalance > 0) {
    reasons.push(`현재 확인한 부채 잔액은 약 ${manwonFromKrw(debtBalance)}입니다.`);
  }

  return {
    question: financeQuestion("status").paywallTitle,
    conclusion,
    reasons: reasons.slice(0, 3),
    directions: [
      { title: "유지할 것", detail: "이미 잘 되고 있는 저축·지출 흐름은 불필요하게 바꾸지 않습니다." },
      { title: "먼저 보완할 것", detail: result.immediateDirection },
      { title: "그다음", detail: "한 달 뒤 실제 변화가 확인되면 다음 목표를 붙입니다." },
    ],
    firstAction: result.immediateDirection,
    details: [result.gapStatement, result.answerContext],
    check30: {
      action: result.immediateDirection,
      checkpoints: ["이번 행동을 실제로 했는지", "월 잉여금이 달라졌는지", "여유자금·부채 부담이 달라졌는지"],
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
  const months = monthsUntil(deadline) ?? 1;
  const shortfall = Math.max(0, required - prepared);
  const neededMonthly = shortfall / months;
  const currentMonthly = Math.max(0, input.monthlySavingsKrw);

  let conclusion = "현재 준비만으로 목표가 이미 채워져 있습니다. 이제는 이 자금을 다른 용도와 섞지 않고 유지하는 것이 중요합니다.";
  if (shortfall > 0 && neededMonthly > currentMonthly) {
    conclusion = `현재 저축 흐름을 그대로 유지하면 목표 시점을 맞추기 어렵습니다. 목표 시점이나 월 준비액 중 하나는 조정이 필요합니다.`;
  } else if (shortfall > 0 && neededMonthly > currentMonthly * 0.7) {
    conclusion = "목표에 가까이 갈 수는 있지만, 현재 저축의 상당 부분을 이 목표에 써야 할 수 있어 다른 목표와의 충돌을 확인해야 합니다.";
  } else if (shortfall > 0) {
    conclusion = "현재 저축 흐름 안에서 목표를 준비할 여지가 있습니다. 다만 이 목표에 실제로 얼마를 따로 배분할지 정해야 합니다.";
  }

  const monthsAtCurrent = currentMonthly > 0 ? Math.ceil(shortfall / currentMonthly) : null;
  const directions: PaidDirection[] = [
    {
      title: "목표 시점을 유지한다면",
      detail: shortfall === 0
        ? "추가 준비보다 현재 준비금을 목적에 맞게 유지합니다."
        : `앞으로 월 약 ${manwonFromKrw(neededMonthly)}를 이 목표에 배분해야 합니다.`,
    },
  ];

  if (shortfall > 0 && monthsAtCurrent) {
    directions.push({
      title: "현재 저축 흐름을 유지한다면",
      detail: `현재 월 저축·투자액 전체를 최대치로 본 경우 약 ${monthsAtCurrent}개월이 필요합니다. 다른 목표에 쓰는 금액이 있다면 더 길어질 수 있습니다.`,
    });
  }

  directions.push({
    title: "부담을 줄인다면",
    detail: "목표 금액·시점·월 배분액 중 현실적으로 바꿀 수 있는 한 가지를 조정합니다.",
  });

  return {
    question: financeQuestion("goal").paywallTitle,
    conclusion,
    reasons: [
      `필요금액 ${manwonFromKrw(required)}, 현재 준비금 ${manwonFromKrw(prepared)}, 남은 금액은 ${manwonFromKrw(shortfall)}입니다.`,
      shortfall > 0 ? `목표일까지 필요한 월 준비액은 약 ${manwonFromKrw(neededMonthly)}입니다.` : "현재 준비금이 입력한 목표금액에 도달해 있습니다.",
      `현재 월 저축·투자액은 ${manwonFromKrw(currentMonthly)}입니다. 이 전체가 목표자금이라는 뜻은 아닙니다.`,
    ],
    directions: directions.slice(0, 3),
    firstAction: "이번 달부터 이 목표에 실제로 따로 배분할 금액을 하나 정해 분리해보세요.",
    details: [result.gapStatement, "목표자금과 다른 저축·투자 목적이 섞여 있다면 실제 가능성은 달라질 수 있습니다."],
    check30: {
      action: "이번 달 목표 전용 배분액을 정하고 실제로 한 번 분리해보세요.",
      checkpoints: ["실제로 분리한 금액", "목표 준비금이 얼마나 늘었는지", "생활비나 다른 목표가 흔들리지 않았는지"],
    },
  };
}

function priorityResult(
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidFinanceResult {
  const surplus = surplusKrw(input);
  const debtRate = answerNumber(answers, "debtRate") ?? 0;
  const goalAmount = moneyAnswerKrw(answers, "goalAmountManwon");
  const goalPrepared = moneyAnswerKrw(answers, "goalPreparedManwon") ?? 0;
  const goalGap = goalAmount === undefined ? null : Math.max(0, goalAmount - goalPrepared);

  let conclusion = result.headline;
  let firstAction = result.immediateDirection;

  if (surplus < 0) {
    conclusion = "지금의 1순위는 투자나 추가 저축이 아니라 매달 부족해지는 흐름을 멈추는 것입니다.";
  } else if (input.jobType === "transitioning") {
    conclusion = "지금의 1순위는 소득이 바뀌는 시기를 버틸 수 있도록 생활자금과 현금 여유를 먼저 확인하는 것입니다.";
  } else if (debtRate >= 15) {
    conclusion = "현재 확인된 조건에서는 다른 계획을 늘리기 전에 부채 부담을 먼저 점검하는 것이 1순위입니다.";
    firstAction = "대출별 잔액·금리·월 상환액·만기를 한곳에 모아 실제 부담을 확인해보세요.";
  } else if (goalGap !== null && goalGap > 0 && hasNearEvent(input)) {
    conclusion = "가장 가까운 미래 목표에 아직 준비되지 않은 금액이 있어, 지금은 그 목적자금을 먼저 확정하는 것이 1순위입니다.";
    firstAction = "가장 가까운 목표의 필요금액과 현재 준비금을 따로 적고 이번 달 배분액을 정해보세요.";
  } else if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    conclusion = "지금은 새로운 계획보다 바로 사용할 수 있는 여유자금을 먼저 만드는 것이 1순위입니다.";
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
  const debtRate = answerNumber(answers, "debtRate") ?? 0;
  const debtBalance = moneyAnswerKrw(answers, "debtBalanceManwon") ?? input.debtRemainingKrw ?? 0;
  const horizon = answers.useHorizon as string | undefined;

  let conclusion = "지금은 저축·대출·투자 중 하나를 무조건 고르기보다, 가까운 목표와 현금 여유를 먼저 확인한 뒤 순서를 정하는 것이 맞습니다.";
  let firstAction = result.immediateDirection;

  if (surplus < 0) {
    conclusion = "현재는 저축 확대나 투자보다 먼저 월 현금흐름을 안정시키는 것이 우선입니다.";
  } else if (input.emergencyFund === "none" || input.emergencyFund === "under_1m") {
    conclusion = "지금은 투자 확대보다 바로 쓸 수 있는 여유자금을 먼저 확보하는 순서가 맞습니다.";
    firstAction = "투자자산과 구분해서 바로 사용할 수 있는 현금성 여유자금부터 확인해보세요.";
  } else if (input.hasDebt && debtRate >= 15) {
    conclusion = "현재 확인한 부채 조건에서는 저축·투자 확대보다 부채 부담을 먼저 점검하는 순서가 맞습니다.";
    firstAction = "대출별 금리·잔액·월 상환액·만기를 확인하고 상환 계획을 먼저 세워보세요.";
  } else if (horizon === "under_1y" || horizon === "1_3y") {
    conclusion = "가까운 시기에 사용할 가능성이 있는 돈은 투자 확대보다 사용 목적과 준비금액을 먼저 분리하는 것이 우선입니다.";
    firstAction = "1~3년 안에 쓸 돈과 장기간 두어도 되는 돈을 먼저 나눠보세요.";
  } else if (horizon === "over_3y") {
    conclusion = "현금흐름과 여유자금이 안정적이라면, 가까운 목적자금을 따로 확보한 뒤 장기자금의 운용방식을 검토할 수 있습니다.";
    firstAction = "가까운 목표자금과 3년 이상 두어도 되는 장기자금을 먼저 분리해보세요.";
  }

  const reasons = baseReasons(input, result);
  if (input.hasDebt) reasons.push(`확인한 부채 잔액은 약 ${manwonFromKrw(debtBalance)}, 가장 높은 금리는 ${debtRate.toLocaleString("ko-KR")}%입니다.`);

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

export function buildPaidFinanceResult(
  question: FinanceQuestionId,
  input: SurveyInput,
  result: AnalysisResult,
  answers: PaidExtraAnswers,
): PaidFinanceResult {
  if (question === "status") return statusResult(input, result, answers);
  if (question === "goal") return goalResult(input, result, answers);
  if (question === "priority") return priorityResult(input, result, answers);
  if (question === "leakage") return leakageResult(input, result, answers);
  return orderResult(input, result, answers);
}
