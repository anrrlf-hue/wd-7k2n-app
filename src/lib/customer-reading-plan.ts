import { validateReadingPlan, type ReadingDomainAllocation, type ReadingPlan, type ReadingTheme } from "@/lib/reading-plan";
import type { SajuFacts } from "@/lib/saju-facts";

export type CustomerReadingPlan = ReadingPlan & {
  themes: ReadingTheme[];
  allocations: ReadingDomainAllocation[];
};

export interface CustomerPlanCopy {
  center: string;
  relationship: [string, string];
  work: [string, string];
  money: [string, string];
}

function evidence(id: string, source: string, value: string | number | boolean | null) {
  return { id, kind: "calculated" as const, source, value };
}

export function renderCustomerPlanCopy(facts: SajuFacts, plan: CustomerReadingPlan): CustomerPlanCopy {
  const month = facts.pillars.find((pillar) => pillar.pillar === "month");
  const springMyoWater = month?.branchHanja === "卯" && facts.dayElement === "수";
  const expression = facts.outputStarCount >= facts.officerStarCount;

  if (springMyoWater) {
    return {
      center: "봄의 묘월에 놓인 임수는 생각을 밖으로 꺼내 표현하고, 여러 번 고쳐 더 나은 모양을 찾는 힘이 먼저 읽힙니다. 동시에 기토 정관처럼 평가와 기준을 의식하는 흐름도 있어, 잘 만들고 싶은 마음과 틀리지 않고 싶은 마음이 한 결과 안에서 만날 수 있습니다.",
      relationship: [
        "관계에서는 함께할 일을 즐겁게 제안하는 표현력과 상대의 속도를 듣는 태도가 함께 필요합니다. 데이트 계획이 어긋났을 때 더 좋은 방법을 바로 설득하려 하기보다, 상대가 꼭 지키고 싶은 한 가지를 먼저 듣고 나머지는 다음 만남으로 나누면 표현이 배려로 이어집니다.",
        "반대로 상대의 반응을 빨리 바꾸려는 마음이 앞서면 즐거움을 준비한 정성이 평가받아야 한다는 부담으로 바뀔 수 있습니다. 함께 정한 계획이 잘되지 않은 날에는 해결책 하나와 상대가 아쉬웠던 이유 하나를 따로 말해 보세요. 잘 맞추는 능력과 서로의 마음을 알아가는 시간은 같은 것이 아니므로, 두 가지를 모두 남기는 선택이 중요합니다.",
      ],
      work: [
        "일에서는 회의에서 불평이 나왔을 때 곧바로 정답을 제시하기보다, 무엇이 불편했는지 한 번 더 묻고 그 내용을 작은 시안으로 바꾸는 방식이 잘 맞습니다. 표현하고 개선하는 힘이 있어도 평가 기준을 혼자 추측하면, 좋은 아이디어가 검토받기 전에 스스로 줄어들 수 있습니다.",
        "초안을 먼저 보여 줄 때는 완성품처럼 방어하지 말고 이번 시안에서 확인하고 싶은 한 가지를 밝혀 보세요. 반응 전체를 따라 방향을 계속 바꾸는 대신 실제로 도움이 된 의견만 다음 결과에 반영하면, 목월의 확장성과 정관의 기준이 경쟁하지 않고 개선의 순서로 이어집니다.",
      ],
      money: [
        "돈에서는 새 장비가 있으면 더 좋은 결과를 낼 것 같은 기대와, 실제 생활에서 불편한 한 가지를 먼저 해결하는 기준을 나누어 볼 필요가 있습니다. 장비의 성능을 상상하는 마음이 커도 구매 전 지금 가진 도구로 한 번 시험하면, 필요한 기능과 갖고 싶은 기분을 구별할 수 있습니다.",
        "실제로 써 보니 불편했던 지점과 다시 만들고 싶은 결과를 따로 적어 보세요. 표현을 위해 쓰는 비용은 결과와 연결될 때 의미가 커지지만, 반응을 얻기 위해 계속 장비를 늘리면 내 시간에 남는 몫이 줄어들 수 있습니다. 다음 비용은 확인된 불편 하나를 해결하는 만큼만 정하는 편이 안전합니다.",
      ],
    };
  }

  if (!expression) {
    return {
      center: "관성은 맡은 기준과 약속을 지키려는 힘으로, 비겁은 자기 판단과 독립성을 지키려는 힘으로 함께 읽힙니다. 책임을 다하는 일과 자신의 선택을 남기는 일은 반대가 아니지만, 한쪽이 다른 쪽을 모두 대신하면 관계와 일의 부담이 커질 수 있습니다.",
      relationship: [
        "관계에서는 약속을 지키는 태도와 각자의 생활을 침범하지 않는 독립성이 함께 신뢰를 만듭니다. 상대를 위해 일정을 맞추더라도 모든 결정을 대신 정하지 말고, 이번 약속에서 꼭 지킬 것과 각자 선택할 것을 나누어 말해 보세요.",
        "함께 쓰는 시간과 개인 시간이 충돌할 때 한쪽이 계속 양보하면 책임감이 거리감으로 바뀔 수 있습니다. 약속을 바꾸어야 하는 날에는 미안함을 길게 설명하기보다 가능한 시간과 혼자 회복할 시간을 함께 제안하는 편이 관계를 오래 지킵니다.",
      ],
      work: [
        "일에서는 맡은 책임을 끝까지 지키면서도 방법을 선택할 재량이 있어야 꾸준함이 전문성으로 남습니다. 결과의 기준과 마감은 분명히 확인하되, 세부 방법까지 모두 지시받는 자리라면 어디까지 스스로 결정할 수 있는지 먼저 묻는 것이 좋습니다.",
        "추가 업무가 들어올 때 바로 떠안는 것이 신뢰를 증명하는 방법은 아닙니다. 현재 맡은 일의 완료 기준, 새 요청의 우선순위, 수정할 수 있는 범위를 나누어 확인하면 책임과 독립성이 서로의 자리를 침범하지 않습니다.",
      ],
      money: [
        "돈에서는 함께 부담할 공동지출과 각자가 결정할 개인 자원을 분리해야 마음이 편해집니다. 공동 생활이나 모임의 비용은 기준을 먼저 정하고, 개인 취향에 쓰는 돈까지 같은 기준으로 통제하지 않을 때 신뢰와 독립성이 함께 남습니다.",
        "누군가의 몫을 대신 내거나 공동 비용을 먼저 처리한 뒤에도 정산을 미루면 배려가 의무처럼 굳어질 수 있습니다. 이번 지출의 공동분과 개인분을 기록하고, 다음 달에 계속 감당할 수 있는 금액인지 확인하는 것이 책임을 오래 쓰는 방법입니다.",
      ],
    };
  }

  if (facts.resourceStarCount >= 1) {
    return {
      center: "표현을 바로 꺼내기보다 충분히 이해한 뒤 자기 언어로 바꾸는 힘이 중심입니다. 생각을 정리하는 시간이 길어져도 실제로 써 본 결과를 다시 읽을 때 배움이 다음 표현으로 이어집니다.",
      relationship: [
        "관계에서는 대화의 내용보다 그 말을 꺼내기까지 무엇을 오래 생각했는지가 중요할 수 있습니다. 상대의 말을 곧바로 해결하려 하기보다 내가 이해한 부분을 한 문장으로 되돌려 주면, 조언보다 경청이 먼저 필요한 순간을 놓치지 않습니다.",
        "마음이 정리될 때까지 아무 말도 하지 않으면 상대는 거리를 거절로 느낄 수 있습니다. 완성된 답 대신 지금 알 수 있는 감정 하나를 먼저 말하고, 더 생각할 시간이 필요하다는 사실도 약속처럼 알려 주는 편이 좋습니다.",
      ],
      work: [
        "일에서는 자료를 충분히 확인한 뒤 핵심을 자기 언어로 정리하는 힘이 있습니다. 회의에서 바로 결론을 내기보다 확인할 근거와 아직 모르는 부분을 나누어 말하면, 신중함이 지연이 아니라 정확한 제안으로 읽힙니다.",
        "초안을 낼 때는 완벽히 정리한 뒤 한 번에 보여 주기보다, 지금 확인한 사실과 추가로 시험할 가설을 구분해 보세요. 질문을 받으며 고치는 과정도 결과의 일부로 인정할 때 배운 것이 실제 업무에 남습니다.",
      ],
      money: [
        "돈에서는 충분히 알아보고 나서 선택하고 싶은 마음이 강할 수 있습니다. 구매 전 사용 목적과 유지 비용을 적어 보면 정보가 안심을 주는지, 실제 선택을 미루게 하는지 구별할 수 있습니다.",
        "새로운 비용을 결정할 때 모든 가능성을 확인하려 하면 필요한 시기를 놓칠 수 있습니다. 작은 금액으로 먼저 시험하고 실제 불편과 만족을 기록한 뒤 다음 지출을 정하면, 신중함과 실행력이 함께 남습니다.",
      ],
    };
  }

  if (facts.wealthStarCount >= 2) {
    return {
      center: "표현한 결과가 사람의 필요와 만나고, 그 교환이 생활의 자원으로 남는 흐름이 중심입니다. 관심과 보상이 커질수록 더 많이 내놓고 싶은 마음과 내 시간을 지켜야 하는 기준을 함께 세워야 합니다.",
      relationship: [
        "관계에서는 함께 누릴 경험을 만드는 능력과 각자 부담할 비용·시간을 분리하는 태도가 필요합니다. 좋은 식사나 여행을 제안할 때 상대가 무엇을 원하는지 먼저 묻고, 비용과 일정은 호의가 아니라 합의할 조건으로 다루면 편안함이 오래 갑니다.",
        "상대의 만족을 높이려고 계속 더 좋은 것을 고르면 관계의 기쁨이 지출 경쟁으로 바뀔 수 있습니다. 이번 만남에서 정말 남기고 싶은 경험 하나를 고르고, 나머지는 다음 기회로 미루는 선택이 서로의 여유를 지킵니다.",
      ],
      work: [
        "일에서는 결과가 실제 고객이나 동료의 필요에 닿을 때 성취감이 커집니다. 반응이 좋은 기능을 더하는 일과 일정·품질·비용의 한계를 지키는 일을 함께 표로 놓으면, 성과를 넓히면서도 무리한 약속을 줄일 수 있습니다.",
        "추가 요청이 들어올 때 바로 더 제공하기보다 기존 결과에 포함된 범위와 새로 필요한 시간을 나누어 설명하세요. 잘 쓰이는 결과를 만드는 힘은 모든 요구를 받아들이는 일이 아니라, 지속할 조건을 함께 제시할 때 전문성으로 남습니다.",
      ],
      money: [
        "돈에서는 더 나은 장비나 서비스를 쓰고 싶은 기대와 실제 생활에 남는 효용을 비교해야 합니다. 구매 전 한 달 동안 얼마나 자주 쓸지와 유지비가 얼마인지 적으면, 풍부한 선택지가 생활의 자원으로 이어질지 판단하기 쉽습니다.",
        "수입이나 보상이 늘어도 곧바로 지출 규모를 키우기보다 다시 벌기 위해 필요한 시간과 쉬는 시간을 함께 계산하세요. 돈이 가져오는 선택의 폭을 넓히되, 계속 유지해야 하는 부담까지 함께 사지 않는 기준이 필요합니다.",
      ],
    };
  }

  return {
    center: "생각을 자기 방식으로 표현하고 실제 반응 속에서 고쳐 가는 힘이 중심입니다. 반응은 다음 결과를 정교하게 만드는 근거가 되지만, 모두의 기대를 곧바로 자기 기준으로 삼으면 처음 좋아했던 방향을 잃을 수 있습니다.",
    relationship: [
      "관계에서는 함께할 경험을 먼저 제안하고, 상대가 실제로 좋았던 부분을 다시 듣는 과정에서 가까움이 깊어집니다. 즐거운 계획을 잘 만드는 것과 상대의 취향을 알아가는 것은 다르므로, 함께한 뒤 각자 좋았던 점을 하나씩 말해 보세요.",
      "반응이 기대와 다를 때 상대를 설득해 같은 취향으로 만들기보다, 내가 지키고 싶은 부분과 조정할 부분을 나누는 편이 좋습니다. 표현을 줄이지 않으면서도 상대의 선택을 남겨 둘 때 함께하는 기쁨이 의무가 되지 않습니다.",
    ],
    work: [
      "일에서는 초안을 먼저 꺼내고 구체적인 반응을 받아 다음 결과에 반영하는 환경에서 강점이 살아납니다. 한 번에 완벽한 답을 만들려 하기보다 이번 결과에서 확인할 질문을 정하면, 표현력과 개선력이 실제 성과로 이어집니다.",
      "반응이 많을수록 모두 따르지 말고 다음 버전에 반영할 한 가지를 고르세요. 자기 취향을 지키는 일과 팀의 기준을 맞추는 일은 함께 가능하며, 무엇을 시험한 결과인지 설명할 때 수정이 평가가 아니라 협업의 언어가 됩니다.",
    ],
    money: [
      "돈에서는 내가 만든 것이 실제로 쓰이는 순간 가치가 구체화됩니다. 좋아서 만든 결과에 가격을 붙이는 일이 어색할 수 있지만, 상대가 얻은 효용과 내가 다시 제공할 시간은 따로 계산해야 보람과 대가가 함께 남습니다.",
      "관심이 커졌다는 이유만으로 장비·재료·시간을 계속 늘리지는 마세요. 실제 사용처와 내 시간에 남는 몫을 나누어 기록하고, 다음 비용은 확인된 필요 하나를 해결하는 만큼 정할 때 표현의 즐거움이 생활을 압박하지 않습니다.",
    ],
  };
}

export function buildCustomerReadingPlan(facts: SajuFacts): CustomerReadingPlan {
  const output = facts.outputStarCount;
  const officer = facts.officerStarCount;
  const wealth = facts.wealthStarCount;
  const resource = facts.resourceStarCount;
  const peer = facts.peerStarCount;
  const evidenceItems = [
    evidence("core.output", "outputStarCount", output),
    evidence("core.officer", "officerStarCount", officer),
    evidence("core.wealth", "wealthStarCount", wealth),
    evidence("core.resource", "resourceStarCount", resource),
    evidence("core.peer", "peerStarCount", peer),
    evidence("core.time-input", "hasTimeInput", facts.hasTimeInput),
    evidence("core.month", "monthPillar", facts.pillars.find((p) => p.pillar === "month")?.ganzhi ?? null),
  ];

  const themes: ReadingTheme[] = [];
  if (output >= officer) {
    themes.push({
      id: "expression-reaction",
      title: "표현과 반응",
      meaning: "자기 경험과 생각을 꺼내 실제 반응으로 다듬는 힘",
      opposite: "반응을 애정이나 가치의 크기로 곧장 해석해 자기 취향을 잃는 모습",
      conditions: ["새로운 결과를 먼저 보여 주고 구체적인 반응을 받을 때 힘이 납니다.", "반응이 모호할 때는 좋아한 부분과 보완할 부분을 나누어 확인해야 합니다."],
      evidenceIds: ["core.output", "core.wealth"],
    });
  } else {
    themes.push({
      id: "responsibility-scope",
      title: "책임과 범위",
      meaning: "맡은 기준을 지키면서 책임의 범위를 조정하는 힘",
      opposite: "책임은 늘어나는데 결정권과 보상 기준은 정하지 못하는 모습",
      conditions: ["역할과 수정 권한을 함께 합의할 때 책임이 지속 가능한 결과가 됩니다.", "잘한 몫과 새로 맡을 몫을 분리해 말할 때 신뢰가 선명해집니다."],
      evidenceIds: ["core.officer", "core.peer"],
    });
  }
  if (wealth >= 2 || output >= 2) {
    themes.push({
      id: "use-value",
      title: "사용과 가치",
      meaning: "내가 만든 시간과 결과가 실제로 쓰이는 곳에서 가치를 확인하는 흐름",
      opposite: "유용함을 증명하려고 시간과 비용의 한계를 넘기는 모습",
      conditions: ["사용처와 내 시간에 남는 몫을 따로 계산할 때 대가가 구체화됩니다.", "좋아하는 일에도 중단선과 가격 기준을 둘 때 지속할 수 있습니다."],
      evidenceIds: ["core.wealth", "core.output"],
    });
  } else if (resource >= 2) {
    themes.push({
      id: "meaning-rest",
      title: "의미와 회복",
      meaning: "배운 것과 납득한 이유를 충분히 소화해 다음 행동으로 옮기는 흐름",
      opposite: "더 이해해야 한다는 이유로 결정과 실행을 계속 미루는 모습",
      conditions: ["혼자 정리한 뒤 작은 실행으로 확인할 때 배움이 생활에 남습니다.", "회복에 필요한 시간과 실제 마감일을 함께 정해야 합니다."],
      evidenceIds: ["core.resource", "core.time-input"],
    });
  } else {
    themes.push({
      id: "belonging-boundary",
      title: "소속과 경계",
      meaning: "함께하는 기준을 만들면서도 자기 몫을 분명히 하는 흐름",
      opposite: "분위기를 지키려다 원하지 않는 약속과 비용까지 떠안는 모습",
      conditions: ["함께할 것과 각자 할 일을 미리 나눌 때 관계가 편안해집니다.", "거절이 필요한 지점을 늦추지 않을 때 실제 신뢰가 남습니다."],
      evidenceIds: ["core.peer", "core.time-input"],
    });
  }
  if (themes.length < 3) {
    themes.push({
      id: facts.dominantElement === facts.dayElement ? "pace-consistency" : "translation-change",
      title: facts.dominantElement === facts.dayElement ? "속도와 지속" : "번역과 전환",
      meaning: facts.dominantElement === facts.dayElement ? "익숙한 속도를 지켜 결과를 쌓는 흐름" : "서로 다른 요구를 자기 방식의 결과로 바꾸는 흐름",
      opposite: facts.dominantElement === facts.dayElement ? "속도를 지키려다 변화 신호를 놓치는 모습" : "상대 요구에 맞추다 자기 기준을 잃는 모습",
      conditions: facts.dominantElement === facts.dayElement
        ? ["반복 가능한 속도를 정하면 성과가 오래 갑니다.", "변화가 생긴 자리에서는 속도보다 우선순위를 먼저 다시 정해야 합니다."]
        : ["요구를 그대로 따르지 않고 핵심을 자기 언어로 바꿀 때 강점이 됩니다.", "바꿀 수 없는 기준은 먼저 선을 그어야 합니다."],
      evidenceIds: ["core.month", "core.peer"],
    });
  }

  const primary = themes[0];
  const secondary = themes[1];
  const sceneSuffix = secondary.id === "use-value"
    ? " 실제 쓰임을 확인하는 자리"
    : secondary.id === "meaning-rest"
      ? " 혼자 정리한 뒤 공유하는 자리"
      : secondary.id === "pace-consistency"
        ? " 반복 가능한 속도를 정하는 자리"
        : " 기준을 먼저 합의하는 자리";
  const allocations: ReadingDomainAllocation[] = primary.id === "expression-reaction"
    ? [
        { domain: "relationship", scene: `함께 즐긴 뒤 각자 좋았던 부분을 말하는 장면${sceneSuffix}`, choice: "맞춰 준 정성과 실제 마음에 남은 경험을 구별합니다.", evidenceIds: primary.evidenceIds },
        { domain: "work", scene: `초안을 먼저 보여 주고 한 가지 피드백을 다음 결과에 반영하는 장면${sceneSuffix}`, choice: "반응 전체를 좇기보다 다음 결과에 반영할 한 가지를 고릅니다.", evidenceIds: primary.evidenceIds },
        { domain: "money", scene: `실제 사용처와 내 시간에 남는 몫을 따로 계산하는 장면${sceneSuffix}`, choice: "좋아하는 일의 보람과 지속할 가격을 함께 정합니다.", evidenceIds: ["core.wealth", "core.output"] },
      ]
    : [
        { domain: "relationship", scene: `약속한 몫과 새로 맡을 몫을 대화로 나누는 장면${sceneSuffix}`, choice: "잘해 준 양보다 앞으로 감당할 범위를 먼저 합의합니다.", evidenceIds: primary.evidenceIds },
        { domain: "work", scene: `역할·수정 권한·마감을 한 번에 확인하는 장면${sceneSuffix}`, choice: "책임을 맡기 전에 결정할 수 있는 범위와 보상 기준을 묻습니다.", evidenceIds: primary.evidenceIds },
        { domain: "money", scene: `끝낸 결과와 추가 요청의 대가를 분리해 말하는 장면${sceneSuffix}`, choice: "신뢰를 지키는 일과 무상으로 더 맡는 일을 구별합니다.", evidenceIds: ["core.officer", "core.wealth"] },
      ];

  const plan: CustomerReadingPlan = {
    headline: `${primary.title}와 ${secondary.title}을 함께 읽는 생활 기준`,
    themes,
    allocations,
    passages: themes.map((theme) => ({ id: `theme-${theme.id}`, kind: "observation", text: `${theme.meaning}. ${theme.opposite}`, evidenceIds: theme.evidenceIds })),
    evidence: evidenceItems,
    limits: [
      ...(facts.hasTimeInput ? [] : ["출생시간이 확인되지 않아 시간에 따른 강약과 시기는 확정하지 않습니다."]),
      "강약·격국·용신을 단정하지 않고 확인 가능한 배치와 개수만 사용합니다.",
    ],
  };
  validateReadingPlan(plan);
  return plan;
}
