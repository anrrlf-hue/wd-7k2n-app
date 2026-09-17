import type { ChoiceTendency } from "@/lib/indirect-experience-data";

export interface ManagementMethod {
  id: "rules" | "simple" | "review" | "scheduled" | "neutral";
  title: string;
  reason: string;
  routine: string;
}

// Execution cadence only: deliberately accepts no birth data, balances or products.
export function suggestManagementMethod(choices: ChoiceTendency[], patterns: string[]): ManagementMethod {
  if (patterns.includes("avoidance")) return {
    id: "scheduled", title: "매일 기록보다, 정해 둔 날에 짧게",
    reason: "돈 확인을 미루는 편이라고 답했어요.",
    routine: "일주일에 한 번, 편한 시간에 10분만 잡아 잔액과 다음 결제일을 함께 확인해 보세요.",
  };
  const counts = { security: 0, flexibility: 0, growth: 0 };
  for (const choice of choices) counts[choice] += 1;
  const dominant = (Object.keys(counts) as ChoiceTendency[]).filter((key) => counts[key] > choices.length / 2);
  if (dominant[0] === "security") return {
    id: "rules", title: "반복할 수 있는 규칙 하나부터",
    reason: "세 장면에서는 예측 가능한 쪽을 더 골랐어요.",
    routine: "급여일 다음 날을 점검일로 정하고, 반복되는 결제와 이체 일정을 한곳에 적어 두세요.",
  };
  if (dominant[0] === "flexibility") return {
    id: "simple", title: "관리 항목은 적게, 조정은 유연하게",
    reason: "세 장면에서는 선택의 여유를 더 골랐어요.",
    routine: "세세한 항목을 늘리기보다 이번 주 생활비 총액 하나부터 확인하고, 주말에 한 번 조정해 보세요.",
  };
  if (dominant[0] === "growth") return {
    id: "review", title: "작게 실행하고, 돌아보는 시간까지",
    reason: "세 장면에서는 새로운 시도를 더 골랐어요.",
    routine: "바꿔 볼 관리 습관 하나와 점검 날짜를 함께 적고, 다음 점검 때 계속할지 결정해 보세요.",
  };
  return {
    id: "neutral", title: "지속하기 편한 방식부터 찾아보기",
    reason: choices.length ? "이번 선택만으로 한 가지 방식에 묶지 않았어요." : "선택 기록이 없어 관리 성향을 정하지 않았어요.",
    routine: "이번 주 한 번, 잔액과 다음 결제일을 확인할 시간을 정해 보세요. 이어가기 편한 주기로 바꿔도 괜찮아요.",
  };
}
