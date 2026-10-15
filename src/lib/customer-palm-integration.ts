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
      return [
        { id: `${hand}.${key}.curve`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.curve`, value: line.curve! },
        { id: `${hand}.${key}.sourceVariant`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.sourceVariant`, value: line.sourceVariant ?? "unknown" },
        { id: `${hand}.${key}.rawDetected`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.rawDetected`, value: line.rawDetected ?? null },
        { id: `${hand}.${key}.enhancedDetected`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.enhancedDetected`, value: line.enhancedDetected ?? null },
        { id: `${hand}.${key}.endpointEvidence`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.endpointEvidence`, value: line.endpointEvidence ?? null },
        { id: `${hand}.${key}.pathCompleteness`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.pathCompleteness`, value: line.pathCompleteness ?? null },
        { id: `${hand}.${key}.attributeSupport`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}.attributeSupport`, value: line.attributeSupport ? JSON.stringify(line.attributeSupport) : null },
        { id: `${hand}.${key}.observation`, kind: "observed" as const, source: `${hand}PalmFacts.onnxLines.${key}`, value: JSON.stringify({ detected: line.detected,
          imageQuality: hands[hand].imageQuality, modelExecuted: hands[hand].onnxLines!.modelExecuted, depthStrength: line.depthStrength, attributeSupport: line.attributeSupport }) },
      ];
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
    const expression = facts.outputStarCount > 0;
    const learning = facts.resourceStarCount > 0;
    const trust = facts.officerStarCount > 0;
    const body = head.curved
      ? value && expression
        ? "표현을 실제 쓰임으로 잇는 사주의 흐름과 곡선 두뇌선의 연결해 생각하는 모습을 함께 읽으면, 돈의 가치는 예상하지 못한 사용 장면에서 구체화됩니다. 가령 취미로 만든 것을 누군가 다른 용도로 부탁한다면, 반가운 호응 때문에 처음 즐겼던 부분까지 모두 바꾸고 싶어질 수 있습니다. 새로운 쓰임에 맞춰 한 부분을 달리하되 자신도 다시 만들고 싶은 요소가 남을 때, 대가가 표현을 빼앗는 느낌보다 즐거움을 이어 갈 바탕으로 읽힙니다."
        : expression && learning
          ? "드러난 재물 글자는 적지만 배운 것을 자기 표현으로 내놓는 통로가 있고, 곡선 두뇌선은 익숙한 것을 새 조건에 맞춰 다시 살피는 모습으로 읽습니다. 함께 보면 대가는 잘하는 일을 반복한 시간만이 아니라 상대의 쓰임에 맞춰 무엇을 제공했는지 분명히 한 데서 구체화됩니다. 가령 같은 방법을 요청받아도 기본 결과와 추가로 달라진 조건을 나누어 설명하면, 도움을 주는 마음이 무제한으로 맞춰 주는 부담으로 흐르지 않습니다. 이미 익힌 능력이 어디까지 생활의 문제를 해결했는지 말할 수 있을 때 꾸준한 실력과 현실적인 보상이 함께 남습니다."
          : value && trust
            ? "재물은 맡은 책임을 실제로 도움이 되는 결과로 바꾸는 흐름으로 읽습니다. 곡선 두뇌선은 같은 책임도 상대의 사정에 맞춰 설명을 달리하는 참고가 됩니다. 가령 정해진 일을 끝냈는데 상대가 여전히 불편해한다면, 약속을 지킨 사실과 실제로 필요한 결과가 어디에서 달랐는지 나누어 볼 수 있습니다."
            : value
              ? "재물은 생활에 실제로 남는 쓰임을 확인하는 흐름으로 읽습니다. 곡선 두뇌선은 하나의 조건만 고집하기보다 사용 장면에 따라 필요한 부분을 다시 보는 참고가 됩니다. 가령 좋은 조건의 제안도 자주 쓰는 장면이 다르면, 기대한 가치와 생활에 남은 가치를 나누어 볼 수 있습니다."
              : learning
                ? "드러난 재물 글자는 적지만 배운 내용을 생활에 쓸 수 있는 형태로 바꾸는 흐름을 읽습니다. 곡선 두뇌선은 익숙한 예를 새 장면에 연결하는 참고가 됩니다. 가령 충분히 익혔다고 느낀 방법도 실제 상황에서는 다른 질문을 만날 수 있어, 더 배울 부분과 이미 쓸 수 있는 부분을 나누어 볼 수 있습니다."
                : "드러난 재물 글자만으로 돈의 흐름을 정하지 않습니다. 곡선 두뇌선은 익숙한 예를 다른 장면에 연결하는 참고로만 읽으며, 실제로 어떤 결과가 가치로 남는지는 경험과 조건을 함께 확인해야 합니다."
      : value && expression
        ? "표현과 쓰임이 연결되는 명식에 직선에 가까운 두뇌선을 함께 읽으면, 돈의 만족에도 무엇을 남겼는지 선명한 감각이 필요합니다. 가령 맡긴 사람은 결과를 좋아했지만 자신은 세부가 덜 완성됐다고 느낀다면 대가를 받아도 마음이 놓이지 않을 수 있습니다. 상대에게 이미 쓸모 있게 닿은 부분을 알아보고 자신이 더 다듬고 싶은 부분을 따로 남기면, 충분히 제공한 가치와 앞으로 깊게 만들 취향이 같은 평가에 묶이지 않습니다."
        : expression && learning
          ? "배운 것을 표현과 쓰임으로 연결하는 명식에 직선에 가까운 두뇌선을 함께 읽으면, 대가를 받아들일 때도 무엇을 제공했는지 분명해야 마음이 놓이는 모습입니다. 가령 결과는 유용했지만 자신은 설명이 덜 끝났다고 느낀다면, 이미 제공한 가치와 다음에 더 익힐 부분을 나눌 수 있습니다."
          : value && trust
            ? "재물은 약속한 책임을 결과로 닫는 과정과 연결해 읽습니다. 직선에 가까운 두뇌선은 대가를 받을 범위와 아직 남은 일을 한 흐름으로 정리하는 참고가 됩니다. 가령 상대가 충분하다고 해도 더 해야 할 곳이 보인다면, 끝낸 몫과 다음 책임을 구별할 수 있습니다."
            : value
              ? "재물은 실제로 남은 쓰임과 약속한 범위를 분명히 할 때 안정되는 흐름으로 읽습니다. 직선에 가까운 두뇌선은 조건을 한 줄로 정리하는 참고가 됩니다. 가령 기대한 가치와 자주 쓰인 가치가 다르면, 어느 결과에 대가를 매길지 나누어 볼 수 있습니다."
              : learning
                ? "드러난 재물 글자는 적지만 배운 내용을 제공할 범위로 정리하는 흐름을 읽습니다. 직선에 가까운 두뇌선은 무엇을 이미 할 수 있고 무엇을 더 익힐지 나누는 참고입니다. 실제 대가는 사진이나 이 풀이가 아니라 제공한 결과와 조건으로 확인해야 합니다."
                : "드러난 재물 글자만으로 돈의 흐름을 정하지 않습니다. 직선에 가까운 두뇌선은 생각을 한 흐름으로 정리하는 참고일 뿐이며, 실제 대가는 제공한 결과와 조건으로 확인해야 합니다.";
    add("money", "익숙한 실력이 다른 가치로 보이는 순간", body, [natal[3], ...observed("headLine", head)]);
  }
  if (head && heart) {
    const closeGroup = close?.branchTenGod ? TEN_GOD_GROUP[close.branchTenGod] : "비겁";
    const closeFrame: Record<string, { curved: string; straight: string }> = {
      인성: {
        curved: "일지의 이해하려는 마음에 두뇌선·감정선의 곡선을 함께 읽으면, 말을 나누며 뜻을 알아가는 동시에 자기 감정도 알아차리는 흐름이 됩니다. 좋은 일을 들려줬는데 짧은 답을 받았다고 가정해 보세요. 상대의 사정을 이해할 설명은 찾았어도 함께 기뻐해 주길 바란 마음은 따로 남습니다. 뜻을 묻는 말 옆에 그 순간 듣고 싶었던 반응을 놓을 때, 인정받는 만족과 공감받는 가까움이 서로 다른 자리에서 채워집니다.",
        straight: "이유를 이해하려는 일지에 두 주요선의 직선에 가까운 모양을 함께 읽으면, 마음을 정리하고 작은 행동으로 전하는 흐름입니다. 필요한 것을 챙겨 줬는데 상대가 정성을 모르고 지나쳤다면, 더 잘 준비하면 마음도 닿을 것이라고 느끼기 쉽습니다. 행동 뒤의 개인적인 이유를 짧게 전할 때 정확하게 해낸 만족 곁에 마음이 받아들여진 가까움도 놓입니다.",
      },
      재성: {
        curved: "생활에 닿는 가치를 아끼는 일지에 두 주요선의 곡선을 함께 읽으면, 함께 해 본 즐거움과 그 즐거움을 다시 말로 나누는 마음이 연결됩니다. 함께 고른 것을 상대가 좋아했어도 이후 이야기가 없다면 잘 고른 만족만 남고 가까움은 덜 느껴질 수 있습니다. 서로 좋았던 순간을 나누는 대화가 유용한 것을 전한 보람과 나의 기쁨을 알아준 다정함을 구별하게 합니다.",
        straight: "생활에 닿는 가치를 고르는 일지에 두 주요선의 직선에 가까운 모양을 함께 읽으면, 잘 골라 마련한 것에 애정을 담는 흐름입니다. 나에게는 준비한 세부가 마음의 흔적이어도 상대는 편리한 결과만 볼 수 있습니다. 무엇을 떠올리며 준비했는지 한 가지를 말할 때 취향을 인정받는 만족에서 서로를 기억한 친밀함으로 의미가 넓어집니다.",
      },
      관성: {
        curved: "약속을 지키는 일지에 두 주요선의 곡선을 함께 읽으면, 꾸준한 행동만큼 그때그때 마음을 말하고 듣는 과정이 신뢰를 만듭니다. 잘 챙긴 일을 상대가 알아주지 못했다고 가정해 보세요. 더 완벽히 해내기보다 무엇을 기대했는지 말할 때 책임과 친밀함이 다른 층위로 놓입니다.",
        straight: "약속을 지키는 일지에 두 주요선의 직선에 가까운 모양을 함께 읽으면, 기억해 둔 작은 행동으로 애정을 전하는 흐름입니다. 잘해 준 사실만 남기보다 왜 그 약속을 소중히 여겼는지 짧게 말할 때 행동의 신뢰와 마음의 교류가 함께 보입니다.",
      },
      식상: {
        curved: "말과 표현을 통해 가까워지는 일지에 두 주요선의 곡선을 함께 읽으면, 즐거웠던 장면을 다시 말하며 서로의 반응을 알아가는 흐름이 됩니다. 내가 만든 분위기와 상대가 편하게 머문 이유가 다를 수 있어, 더 말하기보다 상대의 이야기를 들을 때 표현과 친밀함이 구별됩니다.",
        straight: "말과 표현을 통해 가까워지는 일지에 두 주요선의 직선에 가까운 모양을 함께 읽으면, 마음을 한 흐름으로 정리해 전하려는 모습이 놓입니다. 설명을 잘했다고 끝내기보다 상대가 어떤 말로 받아들였는지 확인할 때 표현의 완성도와 관계의 안심이 달라집니다.",
      },
      비겁: {
        curved: "자기 선택을 지키는 일지에 두 주요선의 곡선을 함께 읽으면, 함께하는 즐거움 안에도 각자의 취향과 말할 속도를 남기는 흐름이 됩니다. 같은 활동을 골라도 원하는 거리가 다를 수 있어, 상대의 반응을 고치려 하기보다 서로 편한 시간을 듣는 일이 가까움을 만듭니다.",
        straight: "자기 선택을 지키는 일지에 두 주요선의 직선에 가까운 모양을 함께 읽으면, 자신의 기준과 상대에게 전할 표현을 한 흐름으로 정리하려는 모습이 놓입니다. 내 방식만 맞추기보다 각자가 양보할 수 없는 한 가지를 말할 때 독립성과 친밀함이 함께 남습니다.",
      },
    };
    const body = head.curved && heart.curved
      ? closeFrame[closeGroup].curved
      : !head.curved && !heart.curved
        ? closeFrame[closeGroup].straight
        : head.curved
          ? "여러 예를 이어 이해하는 생각과 조용히 챙기는 감정 표현이 함께 읽힙니다. 머릿속에서는 마음을 풍부하게 설명했어도 밖에는 작은 행동 하나만 남을 수 있습니다. 상대가 알아보지 못했을 때 정성을 더 늘리기보다 그 행동에 담은 이유를 짧게 건네면, 혼자 완성한 이해가 실제로 주고받는 마음으로 이어집니다."
          : "생각을 한 흐름으로 정리하는 모습과 말로 감정을 주고받는 표현이 함께 읽힙니다. 대화에서는 빨리 분명한 답을 얻고 싶어도 감정은 같은 속도로 정리되지 않을 수 있습니다. 상대의 뜻을 확인한 뒤에도 지금의 느낌을 더 들을 시간이 남아 있을 때, 답을 알아낸 안심과 서로 마음을 나눈 편안함이 함께 자리 잡습니다.";
    add("overall", "이해한 내용과 마음에 닿은 경험", body, [natal[1], ...observed("headLine", head), ...observed("heartLine", heart)]);
  }
  return result;
}
