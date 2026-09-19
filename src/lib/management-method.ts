import type { ChoiceTendency } from "@/lib/indirect-experience-data";
import type { SurveyInput } from "@/lib/survey-input";
import { MONEY_MANAGEMENT_UNIT_OPTIONS, SPENDING_PATTERN_OPTIONS } from "@/lib/survey-input";
import { buildAnalysisResult } from "@/lib/analysis-result";
import { validDate } from "@/lib/financial-evidence";
import { futureEventPlan } from "@/lib/future-event";

export interface ManagementMethod {
  id: "rules" | "simple" | "review" | "scheduled" | "neutral";
  title: string;
  reason: string;
  routine: string;
  whatToDo?: string;
  whatToRecord?: string;
  whenToCheck?: string;
  doneWhen?: string;
}

// Execution cadence only: deliberately accepts no birth data, balances or products.
function managementStyle(choices: ChoiceTendency[], patterns: string[]): ManagementMethod {
  if (patterns.includes("avoidance")) return {
    id: "scheduled", title: "매일 기록보다, 정해 둔 날에 짧게",
    reason: "돈 확인을 미루는 편이라고 답했어요.",
    routine: "아래에서 정한 확인 시점에 10분만 잡고, 필요한 기록부터 짧게 채워 보세요.",
  };
  const counts = { security: 0, flexibility: 0, growth: 0 };
  for (const choice of choices) counts[choice] += 1;
  const dominant = (Object.keys(counts) as ChoiceTendency[]).filter((key) => counts[key] > choices.length / 2);
  if (dominant[0] === "security") return {
    id: "rules", title: "반복할 수 있는 규칙 하나부터",
    reason: "세 장면에서는 예측 가능한 쪽을 더 골랐어요.",
    routine: "반복되는 확인 항목을 한곳에 적고, 같은 순서로 짧게 확인해 보세요.",
  };
  if (dominant[0] === "flexibility") return {
    id: "simple", title: "관리 항목은 적게, 조정은 유연하게",
    reason: "세 장면에서는 선택의 여유를 더 골랐어요.",
    routine: "아래 기록을 한 화면에 모으고, 확인한 항목에만 표시해 보세요. 입력 방식은 편하게 바꿔도 괜찮아요.",
  };
  if (dominant[0] === "growth") return {
    id: "review", title: "작게 실행하고, 돌아보는 시간까지",
    reason: "세 장면에서는 새로운 시도를 더 골랐어요.",
    routine: "아래 행동을 작은 단계로 나누어 하나씩 실행하고, 다음에 확인할 때 빠진 항목을 보완해 보세요.",
  };
  return {
    id: "neutral", title: "지속하기 편한 방식부터 찾아보기",
    reason: choices.length ? "이번 선택만으로 한 가지 방식에 묶지 않았어요." : "선택 기록이 없어 관리 성향을 정하지 않았어요.",
    routine: "아래 행동을 메모나 표 중 편한 방식으로 기록해 보세요. 성향에 맞추려고 억지로 방식을 바꿀 필요는 없어요.",
  };
}

// Finance sets WHAT/WHEN. Simulation customizes HOW, never financial priority.
export function suggestManagementMethod(choices: ChoiceTendency[], patterns: string[], input?: SurveyInput): ManagementMethod {
  const style = managementStyle(choices, patterns);
  if (!input) return style; // Compatibility for saved pre-survey results.
  const result = buildAnalysisResult(input);
  const plans: Record<typeof result.bottleneck, [string, string]> = {
    cash_flow_deficit: ["월 소득·고정지출(상환 포함)·생활비·저축·실제 잔액", "입출금 내역을 대조하고 소득 안에서 배분할 계획을 정했을 때"],
    income_interruption_risk: ["소득 변화 시작일·변경 후 예상 소득·생활비 준비액·월 필수 지출", "소득 변화 날짜와 생활비를 감당할 기간을 확인했을 때"],
    income_variability_risk: ["낮은 달/평균/높은 달 소득·필수 지출·낮은 달 부족분·바로 쓸 현금", "낮은 달 부족분을 감당할 현금과 다음 입금·결제 계획을 확인했을 때"],
    high_interest_debt: ["대출별 금리·만기·잔액·원금/이자 구분·월 상환액", "계약·상환내역으로 실제 금리와 부담을 확인했을 때"],
    maturity_preparation: ["정확한 만기일·만기 잔액·준비한 상환자금·원금/이자 구분", "계약에서 만기 잔액을 확인하고 준비금과 일정을 맞췄을 때"],
    purpose_fund_confirmation: ["실제 필요액·준비액·이 목표의 월 배정액·목표일·실제 입금일", "네 값을 확인하고 실제 입금 일정까지 반영해 목표액과 비교했을 때"],
    near_future_funds_shortfall: ["실제 필요액·준비액·월 배정액·목표일·추가 자금 여부", "확인된 부족분에 대해 목표 규모 또는 월 배정액 조정안을 정했을 때"],
    emergency_fund_shortage: ["바로 쓸 비상자금·월 필수 지출·비상자금에 실제 배정할 금액", "투자·다른 목표와 중복 없이 비상자금 잔액과 적립액을 확인했을 때"],
    biz_personal_mixed: ["사업 입출금·세금 등 사업에 남겨둘 돈·개인 생활비", "지출이 두 번 잡히지 않게 사업과 개인 내역을 구분했을 때"],
    card_installment_dependence: ["다음 결제일·일시불/할부 합계·생활비 부족을 카드로 충당한 내역", "다음 결제액과 입금액을 맞춰 반복 부족분을 확인했을 때"],
    no_expense_awareness: ["최근 한 달 결제내역·고정비·생활비", "내역을 분류하고 실제 총액과 입력한 지출을 대조했을 때"],
    no_savings_system: ["실제 입금액·필수 지출·무리 없이 남길 금액", "다음 소득이 들어올 때 남길 금액을 정했을 때"],
    long_term_goal_pace_short: ["목표 금액·날짜·준비액", "목표의 조건을 확인했을 때"],
    investment_efficiency: ["목표별 사용 시점·현재 자산 구성", "목표와 자산 정보를 확인했을 때"],
    insufficient_data: ["미입력 항목·확인할 거래내역", "모르는 값과 0원을 구분해 확인한 뒤 다시 진단했을 때"],
    no_priority_bottleneck: ["현재 흐름·다음 목표(있다면)", "현재 방식을 유지하면서 다음 목표의 금액이나 시점을 정했을 때"],
  };
  let [record, done] = plans[result.bottleneck];
  let when = input.jobType === "employee_fixed" ? "다음 급여가 들어오면 이번 달 실제 지출과 함께 한 번 확인하세요." : "다음 소득이 입금되면 실제 지출과 함께 한 번 확인하세요.";
  if (result.bottleneck === "maturity_preparation") when = validDate(input.debtMaturityDate) ? `${input.debtMaturityDate} 만기 전에 잔액과 준비자금을 확인하세요.` : "이번 주 안에 정확한 만기일·만기 잔액·준비자금을 확인하세요.";
  if (futureEventPlan(input)?.kind === "purpose" && ["purpose_fund_confirmation", "near_future_funds_shortfall", "no_priority_bottleneck"].includes(result.bottleneck)) {
    record = plans.purpose_fund_confirmation[0];
    done = plans.purpose_fund_confirmation[1];
    when = validDate(input.goalDeadline) ? `다음 소득이 들어오면 목표일 ${input.goalDeadline}까지 필요한 월 배정액을 확인하세요.` : "다음 소득이 들어오면 이 목표에 실제로 배정할 금액과 목표일을 확인하세요.";
  }
  if (result.bottleneck === "income_interruption_risk") when = "소득이 바뀌기 전에 바로 쓸 생활비와 변경 후 예상 소득을 먼저 확인하세요.";
  if (input.jobType === "freelancer" && result.bottleneck === "insufficient_data") record += ". 낮은 달 ≤ 평균 ≤ 높은 달 소득(만원)";
  const unit = MONEY_MANAGEMENT_UNIT_OPTIONS.find(o => o.value === input.moneyManagementUnit)?.label ?? "입력한 관리 단위";
  record += ` (${unit} 기준, 소득과 지출 범위 통일)`;
  const selected = SPENDING_PATTERN_OPTIONS.filter(o => patterns.includes(o.value) && o.value !== "none").map(o => o.label);
  if (selected.length) record += `. 선택한 습관: ${selected.join("·")} — 실제 내역에서 반복 여부 확인`;
  if (input.biggestConcern.trim()) record += ". 직접 적은 고민은 확인된 숫자와 나눠 기록";
  return { ...style, whatToDo: result.immediateDirection, whatToRecord: record, whenToCheck: when, doneWhen: done };
}
