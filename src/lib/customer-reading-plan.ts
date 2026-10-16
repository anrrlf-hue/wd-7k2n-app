import { validateReadingPlan, type ReadingDomainAllocation, type ReadingPlan, type ReadingTheme } from "@/lib/reading-plan";
import type { SajuFacts } from "@/lib/saju-facts";

export type CustomerReadingPlan = ReadingPlan & {
  themes: ReadingTheme[];
  allocations: ReadingDomainAllocation[];
};

function evidence(id: string, source: string, value: string | number | boolean | null) {
  return { id, kind: "calculated" as const, source, value };
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
