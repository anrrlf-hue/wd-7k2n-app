import { TEN_GOD_GROUP, type SajuFacts } from "@/lib/saju-facts";
import type { PalmFacts } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import { validateReadingPlan, type ReadingEvidence, type ReadingPlan } from "@/lib/reading-plan";
import { buildPremiumEditorialPlan, type PremiumEditorialPlan } from "@/lib/premium-editorial-plan";
import { observedDomainLine, integrateLoveStory, integrateWorkStory } from "@/lib/premium-domain-integration";

type Area = "overall" | "love_relationship" | "money" | "work";
export interface IntegratedPassage { plan: ReadingPlan; scene: string | null; observationNote: string | null }
export type IntegratedPalmReading = Partial<Record<Area, IntegratedPassage>>;

/** Readable main-line curves add meaning. Proportions and secondary candidates
 * remain observations. Overall owns a new tension across the separate domains. */
export function buildIntegratedPalmReading(facts: SajuFacts, left: PalmFacts, right: PalmFacts, dominant: DominantHand,
  selectedPlan?: PremiumEditorialPlan): IntegratedPalmReading {
  const editorial = selectedPlan ?? buildPremiumEditorialPlan(facts), hands = { left, right, dominant };
  const head = observedDomainLine(hands, "headLine"), heart = observedDomainLine(hands, "heartLine");
  const close = facts.pillars.find(p => p.pillar === "day"), month = facts.pillars.find(p => p.pillar === "month");
  const result: IntegratedPalmReading = {};
  const natal: ReadingEvidence[] = [
    { id: "saju.arc", kind: "calculated", source: "natal star counts and reliable strength", value: `${editorial.id}:비겁 ${facts.peerStarCount}·식상 ${facts.outputStarCount}·재성 ${facts.wealthStarCount}·관성 ${facts.officerStarCount}·인성 ${facts.resourceStarCount}` },
    { id: "saju.close", kind: "calculated", source: "facts.pillars.day.branchTenGod", value: close?.branchTenGod ?? null },
    { id: "saju.month", kind: "calculated", source: "facts.pillars.month", value: month ? `${month.ganzhi}/${month.stemTenGod}/${month.branchTenGod}` : null },
    { id: "saju.wealth", kind: "calculated", source: "facts.wealthStarCount", value: facts.wealthStarCount },
  ];
  const observed = (key: "headLine" | "heartLine", observation: NonNullable<typeof head>): ReadingEvidence[] => {
    const entries = observation.different ? ["left", "right"] as const : [observation.hand];
    return entries.flatMap(hand => {
      const line = hands[hand].onnxLines![key];
      return [{ id: `${hand}.${key}.curve`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.curve`, value: line.curve! },
        { id: `${hand}.${key}.sourceVariant`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.sourceVariant`, value: line.sourceVariant ?? "unknown" },
        { id: `${hand}.${key}.observation`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}`, value: JSON.stringify({ detected: line.detected,
          imageQuality: hands[hand].imageQuality, modelExecuted: hands[hand].onnxLines!.modelExecuted, depthStrength: line.depthStrength, attributeSupport: line.attributeSupport }) }];
    });
  };
  const add = (area: Area, headline: string, text: string, sources: ReadingEvidence[]) => {
    const plan: ReadingPlan = { headline, evidence: sources, limits: [], passages: [
      { id: `${area}-joint-meaning`, kind: "traditional", text, evidenceIds: sources.map(e => e.id) },
    ] };
    validateReadingPlan(plan);
    result[area] = { plan, scene: null, observationNote: null };
  };
  if (heart) add("love_relationship", "애정이 닿는 표현과 거리", integrateLoveStory(editorial, hands)!, [natal[0], ...observed("heartLine", heart)]);
  if (head) {
    add("work", "생각이 자기 실력으로 이어지는 환경", integrateWorkStory(editorial, hands)!, [natal[0], ...observed("headLine", head)]);
    const value = facts.wealthStarCount > 0;
    const body = head.curved
      ? value
        ? "표현을 실제 쓰임으로 잇는 사주의 흐름과 곡선 두뇌선의 연결해 생각하는 모습을 함께 읽으면, 돈의 가치는 예상하지 못한 사용 장면에서 구체화됩니다. 가령 취미로 만든 것을 누군가 다른 용도로 부탁한다면, 반가운 호응 때문에 처음 즐겼던 부분까지 모두 바꾸고 싶어질 수 있습니다. 새로운 쓰임에 맞춰 한 부분을 달리하되 자신도 다시 만들고 싶은 요소가 남을 때, 대가가 표현을 빼앗는 느낌보다 즐거움을 이어 갈 바탕으로 읽힙니다."
        : "드러난 재물 글자는 적지만 익힌 것을 자기 표현으로 내놓는 통로가 있고, 곡선 두뇌선은 익숙한 경험을 다른 예에 연결하는 모습으로 읽습니다. 함께 보면 같은 기술을 새 장면에 풀어낸 차이가 대가를 받는 이유가 될 수 있습니다. 가령 남에게는 새로웠던 도움을 자신은 늘 하던 일로 여겼다면 수고의 가치를 작게 보기 쉽습니다. 무엇을 오래 알고 있었는지보다 이번 사람의 어려움이 어디서 풀렸는지를 알아보면 익숙한 능력을 다른 값으로 받아들이게 됩니다."
      : value
        ? "표현과 쓰임이 연결되는 명식에 직선에 가까운 두뇌선을 함께 읽으면, 돈의 만족에도 무엇을 남겼는지 선명한 감각이 필요합니다. 가령 맡긴 사람은 결과를 좋아했지만 자신은 세부가 덜 완성됐다고 느낀다면 대가를 받아도 마음이 놓이지 않을 수 있습니다. 상대에게 이미 쓸모 있게 닿은 부분을 알아보고 자신이 더 다듬고 싶은 부분을 따로 남기면, 충분히 제공한 가치와 앞으로 깊게 만들 취향이 같은 평가에 묶이지 않습니다."
        : "기술과 신뢰를 쌓는 명식에 직선에 가까운 두뇌선을 함께 읽으면, 대가를 받아들일 때도 완성한 범위가 분명해야 마음이 놓이는 모습입니다. 가령 도움받은 사람이 충분하다고 해도 자신에게는 더 고칠 곳이 보인다면 익숙한 수고를 끝없이 덧붙이기 쉽습니다. 이미 도움이 된 부분은 값을 받아도 되는 가치이고 다음에 더 깊게 익힐 부분은 자신의 성장으로 남습니다. 둘을 구별할 때 잘해 준 마음이 자신의 생활에도 남을 수 있습니다.";
    add("money", "익숙한 실력이 다른 가치로 보이는 순간", body, [natal[3], ...observed("headLine", head)]);
  }
  if (head && heart) {
    const understanding = close && TEN_GOD_GROUP[close.branchTenGod] === "인성";
    const body = head.curved && heart.curved
      ? understanding
        ? "일지의 이해하려는 마음에 두뇌선·감정선의 곡선을 함께 읽으면, 말을 나누며 뜻을 알아가는 동시에 자기 감정도 알아차리는 흐름이 됩니다. 좋은 일을 들려줬는데 짧은 답을 받았다고 가정해 보세요. 상대의 사정을 이해할 설명은 찾았어도 함께 기뻐해 주길 바란 마음은 따로 남습니다. 이 조합에서 새로 보이는 것은 더 정확히 이해하면 서운함도 풀릴 것이라는 기대의 한계입니다. 뜻을 묻는 말 옆에 그 순간 듣고 싶었던 반응을 놓을 때, 인정받는 만족과 공감받는 가까움이 서로 다른 자리에서 채워집니다."
        : "생활에 닿는 가치를 아끼는 일지에 두 주요선의 곡선을 함께 읽으면, 함께 해 본 즐거움과 그 즐거움을 다시 말로 나누는 마음이 연결됩니다. 함께 고른 것을 상대가 좋아했어도 이후 이야기가 없다면 잘 고른 만족만 남고 가까움은 덜 느껴질 수 있습니다. 고른 결과를 더 설명하기보다 서로 좋았던 순간을 나누는 대화가 필요합니다. 유용한 것을 전한 보람과 나의 기쁨을 알아준 다정함은 한 번의 좋은 반응으로 대신되지 않습니다."
      : !head.curved && !heart.curved
        ? understanding
          ? "이유를 이해하려는 일지에 두 주요선의 직선에 가까운 모양을 함께 읽으면, 마음을 정리하고 작은 행동으로 전하는 흐름입니다. 필요한 것을 챙겨 줬는데 상대가 정성을 모르고 지나쳤다면, 더 잘 준비하면 마음도 닿을 것이라고 느끼기 쉽습니다. 그러나 잘 해결된 일과 왜 기억해 주고 싶었는지를 알아준 경험은 다릅니다. 행동 뒤의 개인적인 이유를 짧게 전할 때, 정확하게 해낸 만족 곁에 마음이 받아들여진 가까움도 놓입니다."
          : "일지의 함께 누리는 가치에 두 주요선의 직선에 가까운 모양을 함께 읽으면, 잘 골라 마련한 것에 애정을 담는 흐름입니다. 나에게는 준비한 세부가 마음의 흔적이지만 상대는 편리한 결과만 볼 수 있습니다. 잘 골랐다는 평가를 더 받기보다 무엇을 떠올리며 준비했는지 한 가지를 말할 때, 취향을 인정받는 만족에서 서로를 기억한 친밀함으로 의미가 넓어집니다. 같은 결과에도 만드는 사람과 받는 사람에게 소중한 순간이 다를 수 있습니다."
        : head.curved
          ? "여러 예를 이어 이해하는 생각과 조용히 챙기는 감정 표현이 함께 읽힙니다. 머릿속에서는 마음을 풍부하게 설명했어도 밖에는 작은 행동 하나만 남을 수 있습니다. 상대가 알아보지 못했을 때 정성을 더 늘리기보다 그 행동에 담은 이유를 짧게 건네면, 혼자 완성한 이해가 실제로 주고받는 마음으로 이어집니다."
          : "생각을 한 흐름으로 정리하는 모습과 말로 감정을 주고받는 표현이 함께 읽힙니다. 대화에서는 빨리 분명한 답을 얻고 싶어도 감정은 같은 속도로 정리되지 않을 수 있습니다. 상대의 뜻을 확인한 뒤에도 지금의 느낌을 더 들을 시간이 남아 있을 때, 답을 알아낸 안심과 서로 마음을 나눈 편안함이 함께 자리 잡습니다.";
    add("overall", "이해한 내용과 마음에 닿은 경험", body, [natal[1], ...observed("headLine", head), ...observed("heartLine", heart)]);
  }
  return result;
}
