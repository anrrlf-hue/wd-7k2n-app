import type { PremiumEditorialPlan } from "@/lib/premium-editorial-plan";
import { normalizePalmFactsObservation, type PalmFacts, type OnnxLineDetail } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import { secondaryObservationState } from "@/lib/palm-customer-reading";

export type ObservedHands = { left: PalmFacts; right: PalmFacts; dominant: DominantHand };
export function observedDomainLine(hands: ObservedHands | null, key: "headLine" | "heartLine") {
  if (!hands) return null;
  const order: DominantHand[] = hands.dominant === "left" ? ["left", "right"] : ["right", "left"];
  const read = (line?: OnnxLineDetail) => Boolean(line?.detected && line.curve && line.attributeSupport?.curve !== "not_supported" && line.depthStrength !== "약함");
  const entries = order.flatMap(hand => {
    const facts = normalizePalmFactsObservation(hands[hand]), line = facts.onnxLines?.[key];
    return facts.imageQuality === "good" && read(line) ? [{ hand, line: line! }] : [];
  });
  if (!entries[0]) return null;
  return { hand: entries[0].hand, curved: entries[0].line.curve === "완만한 곡선",
    different: Boolean(entries[1] && entries[0].line.curve !== entries[1].line.curve) };
}
function family(plan: PremiumEditorialPlan): "purpose" | "expression" | "learning" | "completion" | "use" | "switch" {
  switch (plan.id) {
    case "agency-duty": case "agency-duty-supported": return "purpose";
    case "creation-exchange": case "creation-exchange-supported": case "agency-expression": return "expression";
    case "understanding-duty": case "duty-supported": case "duty-translation": return "learning";
    case "duty-boundaries": return "completion";
    case "agency-value": return "use";
    default: return "switch";
  }
}

// The natal relation selects the motive/environment. The observed shape changes
// the scene, difficulty and useful response together, never an inserted aside.
const WORK = {
  purpose: {
    curved: "일에서는 요청한 사람이 무엇 때문에 불편했는지 이해할 때 마음이 붙는 모습으로 읽힙니다. 가령 같은 결과를 두 사람이 다르게 받아들인다면, 익숙한 예를 연결하는 생각으로 각자가 필요했던 것을 다른 말로 풀어 줄 여지가 있습니다. 설명이 복잡한 일에서 상대에게 와닿는 예를 찾는 과정은 자기 판단과 이해하려는 마음이 함께 쓰이는 장면입니다. 반대로 이유를 묻지 못한 채 정해진 답만 되풀이해야 하는 환경에서는, 더 잘 전달할 방법이 떠올라도 쓸 곳이 없어 답답할 수 있습니다. 이때 만족을 바꾸는 것은 방법을 마음대로 고르는 권한의 크기보다 실제로 누구의 불편이 줄었는지 알게 되는 경험일 수 있습니다.",
    straight: "일에서는 요청의 이유를 이해하고 서로 다른 설명을 한 흐름으로 정리할 때 마음이 붙는 모습으로 읽힙니다. 가령 같은 결과에 대한 말이 제각각이라면, 무엇이 달라서 다른 반응이 나왔는지 짚어 공통으로 놓친 부분을 드러내는 장면입니다. 납득한 이유를 한 방향으로 묶는 생각은 순서와 설명의 어긋남을 알아보는 데 쓸 여지가 있습니다. 반대로 말이 바뀐 이유를 들을 수 없는 환경에서는, 성실하게 다시 해도 어느 부분을 믿고 이어 갈지 몰라 피로가 남을 수 있습니다. 더 빨리 따라가는 일보다 바뀐 이유 하나를 이해해 다시 설명할 수 있게 되는 경험이 진행의 편안함을 바꿀 수 있습니다.",
  },
  expression: {
    curved: "일의 동기는 떠올린 것을 누군가가 실제로 써 보는 장면에서 구체화되는 모습으로 읽힙니다. 가령 시안에 예상과 다른 반응이 오면, 질문을 다른 예에 연결하며 더 잘 닿을 표현을 떠올릴 여지가 있습니다. 다양한 반응을 같은 작업 안에 풀어 넣는 과정이 장점으로 쓰일 수 있지만, 모든 반응을 즉시 반영하는 환경에서는 처음 담고 싶었던 뜻이 자꾸 달라져 결과에 애착을 느끼기 어려울 수도 있습니다. 상대가 편해진 부분과 내가 남기고 싶은 한 부분을 함께 보는 경험은, 더 많은 수정 대신 무엇을 잘 전했는지를 알아보게 할 수 있습니다.",
    straight: "일에서는 표현한 의도가 실제 쓰임에도 남았다는 것을 알 때 만족이 생기는 모습으로 읽힙니다. 가령 결과에 수정 요청이 오면, 바꾸기 전에 어느 장면에서 뜻이 다르게 전해졌는지 정리하고 싶을 수 있습니다. 처음의 목적과 달라진 사용 장면을 구체적으로 묶는 생각이 작업을 설명하는 강점으로 쓰일 여지가 있습니다. 반대로 이유 없는 취향 평가만 반복되는 환경에서는, 무엇을 고쳐도 충분해지지 않는 듯 느낄 수 있습니다. 자신의 표현을 전부 버리기보다 실제로 달라질 한 장면을 알아보는 경험이 수정에 대한 마음을 바꿀 수 있습니다.",
  },
  learning: {
    curved: "일에서는 배운 내용이 눈앞의 다른 장면에서도 통한다는 것을 발견할 때 만족을 느끼는 모습으로 읽힙니다. 가령 설명을 이해했지만 실제 적용에서 막히면, 앞서 해 본 예와 연결해 뜻이 잡히는 순간이 배움을 자기 경험으로 만들 수 있습니다. 낯선 질문을 익숙한 예로 풀어 주는 환경에서는 이 연결하는 생각을 쓸 여지가 있습니다. 반대로 설명을 그대로 재현했는지만 평가하는 환경에서는, 이해가 붙기 위해 바꾸어 본 흔적까지 틀린 답으로 느껴져 질문을 아끼게 될 수 있습니다. 어떻게 연결했는지를 보여 주고 다른 예에서도 통했는지 듣는 경험이 배움의 만족을 넓힐 수 있습니다.",
    straight: "일에서는 익힌 내용을 스스로 설명하고 적용할 수 있게 되었을 때 마음이 놓이는 모습으로 읽힙니다. 가령 새로운 업무를 배웠다면 순서 하나가 왜 필요한지 알아야 직접 할 때도 편하게 이어 갈 수 있습니다. 이해한 것을 한 흐름으로 정리하는 생각은 누락된 설명을 발견하고 처음 배우는 사람에게 전달하는 데 쓸 여지가 있습니다. 반대로 질문할 시간 없이 계속 새로운 것을 맡는 환경에서는, 알던 것까지 확신하기 어려워 같은 내용을 다시 찾아보게 될 수 있습니다. 모르는 한 부분이 무엇인지 드러내는 경험은 이미 알고 있는 것까지 처음부터 공부하는 부담을 덜 수 있습니다.",
  },
  completion: {
    curved: "일에서는 맡은 것을 끝까지 쓸 수 있는 모습으로 남기고 싶은 마음이 읽힙니다. 가령 마무리 중 더 나은 방법이 떠오르면, 연결해 생각하는 모습 때문에 지금 고친 것이 다음 작업에도 도움이 될 것 같아 손을 더 댈 수 있습니다. 서로 다른 불편을 한 결과에서 풀어 주는 환경에서는 그 정성이 쓰일 여지가 있지만, 작은 개선이 곧 다음 부탁으로 이어지는 환경에서는 한 일을 끝냈다는 만족이 멀어질 수 있습니다. 추가로 떠오른 방법을 다음 시도를 위해 남겨 두는 선택은 이번 결과를 끝내며 얻는 편안함을 지킬 수 있습니다.",
    straight: "일에서는 끝냈다고 볼 수 있는 모습을 분명하게 남기고 싶은 마음이 읽힙니다. 가령 마무리 중 새 부탁이 들어오면, 기존 결과와 같은 일인지 구별되지 않아 이미 끝내 가던 것까지 다시 미완성처럼 느껴질 수 있습니다. 순서를 정리하는 생각은 뒤섞인 요청을 각각의 결과로 드러내는 데 쓸 여지가 있습니다. 끝난 것을 인정해 주는 환경에서는 꾸준히 이어 가는 만족이 생길 수 있지만, 모든 새 요청이 이전 일의 부족함으로 받아들여지는 환경에서는 자신의 정성을 알아보기 어려울 수 있습니다.",
  },
  use: {
    curved: "일에서는 내게 편해진 방법이 다른 사람의 불편도 줄였다는 것을 발견할 때 만족이 생기는 모습으로 읽힙니다. 가령 새 방법을 권했는데 반응이 다르면, 연결해 생각하는 모습으로 상대가 겪는 다른 장면을 떠올려 적용할 형태를 바꾸어 볼 여지가 있습니다. 서로의 사용 경험을 들을 수 있는 환경에서는 내 판단이 실제 도움으로 남지만, 한 방법을 모두에게 같게 쓰게 하는 환경에서는 유용하다고 느낀 이유를 전하기 어려울 수 있습니다. 자신의 방법 전체보다 상대의 하루가 달라진 한 부분을 알아보는 경험이 도움의 의미를 더 구체적으로 남깁니다.",
    straight: "일에서는 내가 고른 이유가 실제로 쓰는 사람에게도 분명해졌을 때 만족이 생기는 모습으로 읽힙니다. 가령 새 방법이 편하다고 설명했는데 상대는 예전 방법을 원한다면, 판단을 정리하는 생각으로 두 사람이 줄이고 싶은 불편을 나누어 볼 수 있습니다. 이유와 사용 경험을 함께 말할 수 있는 환경에서는 선택의 장점을 선명하게 전할 여지가 있지만, 무조건 한쪽이 맞아야 하는 환경에서는 다른 쓰임까지 틀린 선택처럼 느낄 수 있습니다. 각자 편해진 장면을 듣는 경험이 같은 방법을 고집하지 않아도 자기 판단을 남길 자리를 만들 수 있습니다.",
  },
  switch: {
    curved: "일에서는 처음 발견할 때의 즐거움과 끝까지 만들 때의 만족이 다르게 나타날 수 있습니다. 가령 새 아이디어를 연결하는 동안에는 방법이 여럿 떠올라도 마무리할 때에는 한 결과에 마음을 오래 두고 싶을 수 있습니다. 탐색한 것을 작은 결과로 남길 수 있는 환경에서는 발견이 경험으로 이어지지만, 새로움만 계속 요구하는 환경에서는 무엇을 좋아하며 만들었는지 알아보기 어려울 수 있습니다.",
    straight: "일에서는 내용을 알아가는 순간과 결과를 정리하는 순간에 필요한 편안함이 다를 수 있습니다. 가령 새 방법을 익힌 뒤 어디에 적용됐는지 한 흐름으로 보이면 진행한 일의 의미가 더 분명해질 수 있습니다. 배운 과정과 끝난 결과를 함께 볼 수 있는 환경에서는 자신의 경험을 알아보기 좋지만, 매번 결과만 급히 바꾸는 환경에서는 지난 시도에서 무엇을 익혔는지 놓칠 여지가 있습니다.",
  },
} as const;

export function integrateWorkStory(plan: PremiumEditorialPlan, hands: ObservedHands | null): string | null {
  const observation = observedDomainLine(hands, "headLine");
  if (!observation) return null;
  const label = observation.hand === "left" ? "왼손" : "오른손";
  const feature = observation.curved ? "익숙한 예에 연결해 생각하는 모습" : "이유를 한 흐름으로 정리하는 모습";
  let body: string = WORK[family(plan)][observation.curved ? "curved" : "straight"];
  if (plan.id === "creation-exchange-supported") body = observation.curved
    ? `일에서는 배운 예를 눈앞의 다른 상황에 맞게 풀었을 때 자기 결과가 생겼다는 만족을 느낄 여지가 있습니다. ${label} 두뇌선의 ${feature}과 함께 읽으면, 가령 익숙한 예시대로 만든 시안을 사용자가 낯설어할 때 그 사람의 경험에 맞는 다른 예를 찾아 의미를 바꾸는 장면으로 이어집니다. 그대로 재현하는 힘보다 배운 뜻을 새로운 장면에 옮기는 과정이 장점으로 쓰일 수 있습니다. 반대로 정답 예시와 닮았는지만 보는 환경에서는 도움이 되도록 바꾼 흔적까지 틀린 답으로 느껴져 자기 결과를 보여 주기 조심스러워질 수 있습니다. 배운 것을 얼마나 지켰는지와 누군가에게 실제로 닿도록 어디를 달리했는지를 함께 말하는 경험이 작업에 대한 자신감을 구체적으로 남길 수 있습니다.`
    : `일에서는 배운 것을 직접 설명할 수 있는 결과로 남겼을 때 마음이 놓이는 모습으로 읽힙니다. ${label} 두뇌선의 ${feature}과 함께 읽으면, 가령 예시대로 만들었는데 다른 상황에서는 통하지 않을 때 왜 달라졌는지 순서를 되짚는 장면으로 이어집니다. 배운 이유와 실제 적용의 차이를 드러내는 과정이 강점으로 쓰일 수 있지만, 질문을 부족함으로만 보는 환경에서는 알고 있던 것까지 다시 확인하며 자신감을 잃을 수 있습니다. 잘 외운 답보다 달라진 한 이유를 설명할 수 있게 되는 경험이 스스로 만든 결과에 마음을 놓을 자리를 줍니다.`;
  else body = body.replace("모습으로 읽힙니다.", `모습이 ${label} 두뇌선의 ${feature}과 함께 읽힙니다.`).replace("마음이 읽힙니다.", `마음이 ${label} 두뇌선의 ${feature}과 만납니다.`);
  return observation.different ? `${body} 양손의 두뇌선 모양이 달라 함께 읽으면, 여러 예로 풀어 보는 단계와 하나의 뜻으로 정리해 전달하는 단계를 나눌 여지도 있습니다.` : body;
}

export function integrateLoveStory(plan: PremiumEditorialPlan, hands: ObservedHands | null): string | null {
  const observation = observedDomainLine(hands, "heartLine");
  if (!observation) return null;
  const f = family(plan), label = observation.hand === "left" ? "왼손" : "오른손";
  const responsibility = ["purpose", "learning", "completion"].includes(f);
  const body = plan.id === "creation-exchange-supported"
    ? observation.curved
      ? `좋은 것을 배워 나누고 싶은 마음이 ${label} 감정선의 말로 반응을 주고받는 표현과 만납니다. 가령 자신에게 도움이 됐던 방법을 가까운 사람에게 이야기했는데 상대가 바로 써 보지 않으면, 좋은 것을 전한 기쁨 옆에 내 경험이 가볍게 받아들여진 듯한 아쉬움이 남을 수 있습니다. 상대는 방법의 가치보다 지금 자기 이야기를 더 하고 싶었을 수 있습니다. 그 방법에서 내가 편해진 순간을 짧게 말하고 상대가 원하는 도움을 들으면, 같아져야 한다는 기대 대신 서로 다른 경험을 이해한 가까움이 남을 여지가 있습니다.`
      : `좋은 것을 익혀 조용히 챙겨 주고 싶은 마음이 ${label} 감정선의 행동에 담는 표현과 만납니다. 가령 도움이 될 것 같아 미리 마련한 것을 상대가 쓰지 않으면, 준비한 정성까지 쓸모없어진 듯 아쉬울 수 있습니다. 지금 필요한 것이 달랐다는 답을 듣는 경험은 잘해 주고 싶던 마음을 버리기보다 그 사람에게 맞게 전할 모습을 바꿀 여지를 줍니다. 미리 다 준비하는 대신 필요할 때 도움을 건넬 자리를 남기는 선택도 애정의 한 모습이 될 수 있습니다.`
    : responsibility
    ? observation.curved
      ? `약속을 소중히 지키는 마음이 ${label} 감정선의 말로 주고받는 표현과 만나면, 함께할 시간을 기대한 마음도 대화 안에 놓이고 싶어질 수 있습니다. 가령 바쁜 날 시간을 비웠는데 상대가 늦으면, 이유를 이해하고도 기다리는 동안의 서운함은 따로 남을 수 있습니다. 상대가 사정을 더 자세히 설명할수록 나도 충분히 이해해야 할 것 같아 그 마음을 삼킬 수 있지만, 정작 원했던 것은 함께할 시간을 나만큼 기다렸다는 반응이었을 수도 있습니다. ‘만남을 기대해서 기다리는 동안 아쉬웠다’는 말을 나누는 선택은 약속을 다시 정하는 데서 끝나지 않고 그 시간이 서로에게 어떤 마음이었는지 알게 할 여지를 줍니다.`
      : `약속을 소중히 지키는 마음이 ${label} 감정선의 조용히 챙기는 표현과 만나면, 기억해 둔 작은 일을 해 주는 데 애정이 담길 수 있습니다. 가령 상대가 필요하다고 말한 것을 챙겨 줬는데 별다른 반응이 없으면, 이미 마음을 전했는데도 알아주지 않는 듯 서운할 수 있습니다. 상대에게는 도움이 된 일로만 보였고 나에게는 그 사람을 기억해 둔 시간이었을 수 있습니다. 무엇을 해 줬는지 더 말하기보다 왜 기억하고 싶었는지 짧게 나누는 선택은 행동의 결과 옆에 개인적인 애정을 놓습니다. 더 많은 일을 해 주지 않아도 마음이 닿을 통로가 생길 수 있습니다.`
    : observation.curved
      ? `하고 싶은 것을 나누는 마음이 ${label} 감정선의 말로 반응을 주고받는 표현과 만납니다. 가령 함께 해 볼 일을 즐겁게 이야기했는데 상대는 조용히 쉬고 싶어 한다면, 제안이 거절된 것과 나와 시간을 보내기 싫다는 느낌이 겹칠 수 있습니다. 상대가 어떤 시간을 편하게 기다리는지 듣고 내 기대도 말하면, 같은 활동을 고르지 않아도 같이 있고 싶은 마음은 남을 수 있습니다. 재미있는 계획에 대한 동의보다 두 사람이 그 시간을 어떻게 느끼고 싶은지 알게 되는 것이 가까움을 바꿀 여지가 있습니다.`
      : `함께 해 보고 싶은 마음이 ${label} 감정선의 조용히 행동에 담는 표현과 만납니다. 가령 좋아할 것 같은 활동을 미리 준비했는데 상대는 다른 것을 원하면, 준비한 마음까지 거절된 듯 아쉬울 수 있습니다. 상대는 내 준비에 담긴 기대보다 지금 쉬고 싶은 마음을 먼저 말했을 수 있습니다. 준비를 다 해 둔 뒤 반응을 기다리기보다 함께 고르는 중에 기대를 나누는 선택은, 잘해 주고 싶은 마음이 두 사람이 편하게 누리는 시간으로 이어질 여지를 남깁니다.`;
  return observation.different ? `${body} 반대 손의 다른 표현까지 함께 읽으면, 말을 기다리는 순간과 작은 행동만으로 편했던 순간을 한 방식으로 고정하지 않아도 됩니다.` : body;
}

export function integrateMoneyStory(plan: PremiumEditorialPlan, hands: ObservedHands | null): string | null {
  if (!hands) return null;
  const observations = (["left", "right"] as const).flatMap(hand => {
    const facts = normalizePalmFactsObservation(hands[hand]), signal = facts.secondaryLines?.fate;
    return facts.imageQuality === "good" && secondaryObservationState("fate", signal) === "observed" && signal?.candidateObservation
      ? [{ hand, position: signal.candidateObservation.position }] : [];
  });
  const life = observations.find(f => f.position === "thumb_side"), response = observations.find(f => f.position === "pinky_side");
  if (life && response) {
    const f = family(plan);
    if (plan.id === "creation-exchange-supported") return `배워서 직접 만든 것이 누군가에게 쓰일 때 보람을 대가로 받아들일 여지가 있습니다. 가령 익힌 방법을 조금 바꾸어 만든 것을 다음에도 부탁받았다면, 아직 더 배워야 한다는 마음 때문에 이미 도움이 된 부분까지 가볍게 여길 수 있습니다. ${life.hand === "left" ? "왼손" : "오른손"}의 생활 쪽 운명선 후보와 ${response.hand === "left" ? "왼손" : "오른손"}의 반응 쪽 후보를 함께 놓으면, 인정받아 더 보여 주고 싶은 마음 안에서도 배움과 일상이 남을 시간이 필요할 수 있습니다. 획득에서는 새로운 것을 전부 더 익혀서 제공하는 선택과 이미 도움이 된 한 부분을 다시 제공하는 선택이 다른 의미를 남깁니다. 지금 할 수 있는 부분에 대가를 받고 아직 배우고 싶은 시간을 따로 남길 때, 칭찬받은 결과가 끝없이 준비해야 하는 부담보다 다시 만들어 보고 싶은 경험으로 이어질 여지가 있습니다.`;
    const what = f === "expression" ? "즐겁게 만든 것을 누군가 써 보고 다음에도 원한" : "부탁받아 정성껏 해 준 것을 누군가 알아보고 다음에도 원한";
    return `돈을 얻는 기쁨에는 인정받은 마음과 앞으로도 편하게 이어 갈 하루가 함께 놓입니다. 가령 ${what} 장면이라면, 내 수고를 알아봐 준 사람에게 더 잘해 주고 싶은 마음이 생길 수 있습니다. ${life.hand === "left" ? "왼손" : "오른손"}의 생활 쪽 운명선 후보와 ${response.hand === "left" ? "왼손" : "오른손"}의 반응 쪽 후보를 함께 읽으면, 그 기쁨 속에서도 익숙한 하루를 남기고 싶은 바람이 같이 보입니다. 큰 대가를 받는 대신 자주 시간을 비우는 선택과 작게 제공하며 생활의 리듬을 남기는 선택은 같은 만족으로 이어지지 않을 수 있습니다. 획득에서는 금액만으로 고르기보다, 알아봐 준 사람과 계속하는 기쁨 뒤에도 내 하루가 편안하게 남는 모습을 함께 떠올릴 수 있습니다. 한 번의 칭찬을 무한히 해 줘야 할 마음으로 넓히지 않을 때 보람과 대가를 오래 받아들일 여지가 있습니다.`;
  }
  if (life) return `획득에서는 일에서 돌아올 대가와 그 일을 하는 하루의 편안함을 함께 읽습니다. ${life.hand === "left" ? "왼손" : "오른손"}의 생활 쪽 운명선 후보가 함께 있어, 가령 마음에 드는 제안도 매번 익숙한 시간을 크게 바꿔야 한다면 처음의 기대와 지속할 때의 만족이 달라질 수 있습니다. 같은 대가라도 짧게 모아 제공하는 선택과 자주 시간을 비우는 선택은 하루에 다른 흔적을 남깁니다. 잘해 낼 수 있다는 마음만큼 어떤 하루로 이어 가고 싶은지가 돈을 얻는 경험의 의미를 바꿀 여지가 있습니다.`;
  if (response) return `획득에서는 수고를 알아봐 준 반응과 실제로 제공한 가치가 함께 읽힙니다. ${response.hand === "left" ? "왼손" : "오른손"}의 반응 쪽 운명선 후보를 함께 놓으면, 가령 좋은 반응을 얻은 일을 다시 부탁받았을 때 그 기쁨 때문에 더 해 주고 싶은 장면이 떠오릅니다. 칭찬을 더 듣기 위해 제공하는 내용이 계속 늘면, 대가를 받아도 자신의 정성이 가볍게 남은 듯 느낄 수 있습니다. 상대가 실제로 편해진 한 부분을 듣고 그 부분을 제공하는 모습으로 남기는 선택은, 더 많이 해 주는 만족과 쓰임을 알아준 만족을 다르게 느끼게 할 여지가 있습니다.`;
  if (observations.length) return "획득에서는 스스로 해낸 보람과 앞으로도 같은 일에 시간을 쓰고 싶은 마음을 함께 읽습니다. 가운데 쪽 운명선 후보가 함께 있어, 가령 능숙하게 해 준 일이 좋은 대가로 돌아와도 그 일이 자신에게 재미있었는지는 따로 남을 수 있습니다. 같은 일을 더 많이 제공하는 선택과 익힌 것 중 다른 사람에게 도움이 된 한 부분만 남기는 선택은 다음에도 하고 싶은 마음을 다르게 만듭니다. 잘한다는 평가와 다시 하고 싶은 경험이 만나는 곳에서 보람을 실제 대가로 받아들이는 의미를 찾을 여지가 있습니다.";
  return null;
}
