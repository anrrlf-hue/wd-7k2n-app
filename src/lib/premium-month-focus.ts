import type { TenGodGroup } from "@/lib/saju-facts";
import type { EditorialArcId, PremiumEditorialPlan } from "@/lib/premium-editorial-plan";
import { eulReul } from "@/lib/korean-particle";

type Phase = "preparation" | "expression" | "exchange" | "duty" | "agency";

/** Time changes the lens on the central question. These are not additional
 * predictions or copies of the relationship, money, and work actions. */
const FOCUS: Record<EditorialArcId, Record<Phase, string>> = {
  "agency-duty": { preparation: "책임을 맡기 전에 이해할 조건", expression: "같은 목적을 전할 방법", exchange: "추가 결과의 범위와 대가", duty: "책임에 맞는 결정권", agency: "내가 고를 절차" },
  "agency-duty-supported": { preparation: "시작에 필요한 자료와 지원", expression: "제안을 보여줄 범위", exchange: "추가 실행을 맡을 사람과 조건", duty: "새 역할의 책임 경계", agency: "직접 고를 방법과 지원" },
  "creation-exchange": { preparation: "결과가 쓰일 곳을 알아볼 정보", expression: "작게 보여줄 결과", exchange: "후속 결과의 쓰임과 조건", duty: "시도와 약속의 경계", agency: "내가 고를 방법과 상대의 필요" },
  "creation-exchange-supported": { preparation: "가능성마다 필요한 지원", expression: "보여준 일과 맡을 일의 차이", exchange: "후속 작업의 사람·시간·대가", duty: "이어갈 역할과 넘길 역할", agency: "고를 제안과 끝낼 조건" },
  "duty-supported": { preparation: "새 책임을 위한 정보와 도움", expression: "해온 결과와 필요한 지원", exchange: "늘어난 역할의 조건", duty: "나눠 맡을 몫", agency: "혼자 정할 일과 함께 정할 일" },
  "duty-translation": { preparation: "완료 기준을 이해할 질문", expression: "이해한 내용을 보여줄 작은 결과", exchange: "새 수정의 쓰임·범위·대가", duty: "처음 합의한 기준과 새 요구", agency: "스스로 정할 방법과 확인받을 기준" },
  "duty-boundaries": { preparation: "맡을 일의 경계를 알 정보", expression: "해온 일과 이어갈 조건", exchange: "새 요청의 별도 범위", duty: "이미 맡은 약속의 우선순위", agency: "내가 바꿀 수 있는 절차" },
  "agency-value": { preparation: "지킬 목적과 더 확인할 방법", expression: "선택의 이유를 전할 방식", exchange: "상대가 중요하게 보는 가치와 부담", duty: "목적을 지키는 역할의 조건", agency: "내 기준과 함께 바꿀 조건" },
  "understanding-duty": { preparation: "결정에 필요한 마지막 질문", expression: "이해한 내용을 보여줄 범위", exchange: "배운 일의 쓰임과 조건", duty: "지금 맡을 일과 더 물을 일", agency: "조언 뒤 남길 자기 기준" },
  "agency-expression": { preparation: "제안 전에 알아야 할 조건", expression: "보여줄 결과와 상대의 반응", exchange: "후속 작업의 범위와 대가", duty: "맡을 역할과 고를 부분", agency: "내 제안 뒤 상대의 선택" },
  balanced: { preparation: "이번 선택에 필요한 정보", expression: "결과를 판단할 기준", exchange: "쓰임과 감당할 조건", duty: "지킬 약속과 바꿀 방법", agency: "혼자 고를 몫과 함께 고를 몫" },
};

function phase(groups: TenGodGroup[]): Phase | null {
  if (!groups.length) return null;
  if (groups.includes("식상") && groups.includes("재성")) return "exchange";
  if (groups.includes("인성")) return "preparation";
  if (groups.includes("관성")) return "duty";
  if (groups.includes("식상")) return "expression";
  if (groups.includes("재성")) return "exchange";
  return "agency";
}

export function selectPremiumMonthFocus(plan: PremiumEditorialPlan, current: TenGodGroup[], previous: TenGodGroup[]): string | null {
  const now = phase(current), prior = phase(previous);
  if (!now) return null;
  const focus = FOCUS[plan.id][now];
  if (!prior) return `첫 구간에는 ‘${focus}’에 초점을 둡니다.`;
  const before = FOCUS[plan.id][prior];
  if (before === focus) return `앞달에 이어 ‘${focus}’${eulReul(focus)} 살핍니다.`;
  return `앞달의 ‘${before}’에서 이번에는 ‘${focus}’${eulReul(focus)} 살피는 쪽으로 초점이 옮겨갑니다.`;
}
