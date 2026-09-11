// 사주에서 본 방향과 실제 현실정보(reality-input.ts)가 어디서 맞고 어디서
// 막히는지를 짚는 1차 연결진단. 새 점수식을 만들지 않는다 — 이미 계산된
// 사주 신호(재성 개수/활동력 비교/신강신약)를 현실정보의 구간 답변과
// 규칙 기반으로 대조할 뿐이다. 사주는 방향을, 현실정보는 지금 위치를
// 보여주고, 이 진단은 그 둘 사이의 일치·간극만 짚는다 — "그래서 무엇부터
// 바꿔야 하는지"의 구체적 답은 결제 후 첫 실행 리포트가 맡는다(여기서는
// 그 질문만 만든다).

import type { SajuFacts } from "@/lib/saju-facts";
import type { RealityInput } from "@/lib/reality-input";

export interface ConnectionDiagnosis {
  /** 사주에서 본 방향을 현실 언어로 한 번 더 요약 */
  directionText: string;
  /** 사주 방향과 현실 위치가 실제로 맞아떨어지는 지점(있을 때만) */
  matchText: string | null;
  /** 사주 방향과 현실 위치가 갈리는, 지금 막힌 지점(있을 때만) */
  blockedText: string | null;
  /** 결제 전 마지막 한 줄 — 궁금증을 남기고 첫 실행 리포트로 넘긴다 */
  bridgeText: string;
}

function activeCompare(facts: SajuFacts): "output" | "peer" | "tie" {
  const { outputStarCount, peerStarCount } = facts;
  return outputStarCount === peerStarCount ? "tie" : outputStarCount > peerStarCount ? "output" : "peer";
}

export function buildConnectionDiagnosis(facts: SajuFacts, reality: RealityInput): ConnectionDiagnosis {
  const compare = activeCompare(facts);
  const selfEmployed = reality.jobType === "freelancer" || reality.jobType === "business_owner";
  const wealthPresent = facts.wealthStarCount > 0;

  // 사주 방향 — 이미 free-report-mock.ts의 earningStyle/jobOrientation과
  // 같은 사실(activeCompare, wealthStarCount)을 다른 문맥(현실과 연결)으로 재사용.
  const directionText =
    compare === "output"
      ? "이 사주는 무언가를 만들어내고 표현하는 활동이 곧 돈으로 이어지는 방향입니다."
      : compare === "peer"
        ? "이 사주는 직접 부딪히고 경쟁하며 스스로 벌어들이는 방향입니다."
        : "이 사주는 한쪽으로 쏠리지 않고, 상황에 맞춰 버는 방식이 바뀌는 방향입니다.";

  let matchText: string | null = null;
  let blockedText: string | null = null;

  // 일치 지점
  if (compare !== "tie" && selfEmployed) {
    matchText = "지금 하고 계신 일의 형태가 이 방향과 같은 쪽을 보고 있습니다. 사주와 현실의 자리가 서로 맞습니다.";
  } else if (wealthPresent && (reality.incomeRange === "400_700" || reality.incomeRange === "over_700")) {
    matchText = "재물을 다루는 힘이 실제 소득으로 잘 이어지고 있는 상태입니다.";
  }

  // 막힌 지점 — 우선순위: 빚 > 저축 안 됨 > 방향 어긋남 > 막연한 불안
  if (reality.debt === "1000_5000" || reality.debt === "over_5000") {
    blockedText = "다만 지금 정리해야 할 빚의 규모가 있습니다. 방향이 맞아도 이 부분부터 정리하지 않으면 힘이 계속 새어나갑니다.";
  } else if (wealthPresent && (reality.savings === "none" || reality.savings === "under_10")) {
    blockedText = "다만 재물을 다루는 힘이 있는데도 실제로는 지키는 쪽으로 잘 이어지지 못하고 있습니다. 막힌 지점은 버는 능력이 아니라 지키는 구조입니다.";
  } else if (compare === "output" && reality.jobType === "employee" && reality.mainConcern === "career") {
    blockedText = "표현하고 만들어내는 힘이 강한 사주인데, 지금 자리에서는 그 힘을 충분히 쓰기 어려울 수 있습니다.";
  } else if (reality.mainConcern === "vague_anxiety") {
    blockedText = "막연한 불안은 뚜렷한 문제가 있어서가 아니라, 지금 무엇부터 손대야 할지 순서가 정해지지 않아서일 수 있습니다.";
  } else if (reality.mainConcern === "low_income" && compare === "peer") {
    blockedText = "직접 벌어들이는 힘은 있는데, 지금 그 힘을 쓸 자리 자체가 좁을 수 있습니다.";
  }

  const bridgeText =
    "사주는 방향을 보여주고, 방금 답한 현실정보는 지금 위치를 보여줍니다. 그래서 실제로 무엇부터 바꿔야 하는지는 소득과 지출, 저축과 대출 구조에 따라 사람마다 다릅니다.";

  return { directionText, matchText, blockedText, bridgeText };
}
