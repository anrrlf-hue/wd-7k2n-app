import type { FreeSajuReport } from "@/lib/free-report-schema";
import { buildFocusedSajuReport } from "@/lib/free-saju-focus-report";
import type { PalmFacts } from "@/lib/palm-facts";
import { buildPalmBilateralReading, type DominantHand, type PalmBilateralReading } from "@/lib/palm-bilateral";
import type { SajuFacts } from "@/lib/saju-facts";
import { buildSajuAnnualOutlook, type SajuAnnualOutlook } from "@/lib/saju-timing";

export interface PremiumBalanceItem {
  title: string;
  whatItMeans: string;
  howToFill: string;
  goodResult: string;
}

export interface PremiumDomainSection {
  key: "love_relationship" | "work" | "money" | "wellbeing";
  label: string;
  headline: string;
  paragraphs: string[];
}

export interface PremiumReport {
  title: string;
  summary: string;
  corePatterns: string[];
  balance: PremiumBalanceItem[];
  domains: PremiumDomainSection[];
  annual: SajuAnnualOutlook;
  actionPlan: Array<{ title: string; text: string }>;
  palm: PalmBilateralReading | null;
  note: string;
}

const ELEMENT_GUIDE: Record<string, Omit<PremiumBalanceItem, "title">> = {
  목: {
    whatItMeans: "시작하고 키워가는 힘을 의식적으로 만들어야 성장이 끊기지 않는 편입니다.",
    howToFill: "한 번에 크게 바꾸기보다 배우는 것 1개, 새로 시작할 일 1개를 정해 매주 진행 상황을 남겨보세요.",
    goodResult: "생각만 하던 일이 실제 경험으로 쌓이고, 다음 선택을 할 재료가 많아집니다.",
  },
  화: {
    whatItMeans: "생각과 능력이 있어도 밖으로 보여주고 표현하는 힘을 일부러 써야 기회가 붙기 쉽습니다.",
    howToFill: "말하기·발표·콘텐츠·제안처럼 결과를 밖으로 보여주는 행동을 일정에 넣으세요.",
    goodResult: "혼자 알고 있던 강점이 사람의 반응·평가·기회로 연결되기 쉬워집니다.",
  },
  토: {
    whatItMeans: "변화가 많을수록 중심을 잡아주는 생활 기준과 마무리 습관이 중요합니다.",
    howToFill: "일정, 돈, 수면처럼 매일 반복되는 것 세 가지에 최소 기준을 정하고 흔들려도 다시 돌아오세요.",
    goodResult: "기회가 와도 생활 전체가 흔들리지 않고 오래 가져갈 수 있는 힘이 생깁니다.",
  },
  금: {
    whatItMeans: "선택지가 많을 때 무엇을 버리고 무엇을 남길지 기준을 세우는 연습이 필요합니다.",
    howToFill: "중요한 결정마다 ‘한다/안 한다’ 기준 3개를 미리 적고, 사람 관계에서도 내 경계를 문장으로 분명히 하세요.",
    goodResult: "시간과 에너지가 분산되는 일이 줄고, 잘하는 것에 힘을 모으기 쉬워집니다.",
  },
  수: {
    whatItMeans: "빠르게 움직이는 것만큼 정보를 모으고 쉬면서 흐름을 다시 읽는 시간이 필요합니다.",
    howToFill: "결정 전 하루를 비워 생각을 정리하고, 주 1회는 결과보다 정보·회복에 쓰는 시간을 확보하세요.",
    goodResult: "서두른 선택이 줄고, 사람과 상황의 변화를 더 유연하게 받아들이게 됩니다.",
  },
};

function balanceItems(facts: SajuFacts, free: FreeSajuReport): PremiumBalanceItem[] {
  const items: PremiumBalanceItem[] = [];
  for (const element of facts.missingElements.slice(0, 2)) {
    const guide = ELEMENT_GUIDE[element];
    if (!guide) continue;
    items.push({
      title: `${element} 기운이 비어 있을 때 보완할 생활 방식`,
      ...guide,
    });
  }

  for (const caution of free.cautions) {
    if (items.length >= 3) break;
    items.push({
      title: caution.title,
      whatItMeans: caution.detail,
      howToFill: "이 패턴이 나타나는 순간을 먼저 알아차리고, 결정을 바로 확정하기보다 한 번 확인하는 절차를 만들어두세요.",
      goodResult: "타고난 강점이 과해져 생기는 손실은 줄이고, 같은 강점을 더 안정적으로 쓸 수 있습니다.",
    });
  }

  if (items.length === 0) {
    items.push({
      title: "균형을 잡는 핵심",
      whatItMeans: "특정한 한 부분이 크게 비었다기보다 강한 장점이 과해질 때 균형이 흔들리기 쉬운 편입니다.",
      howToFill: "잘하는 것을 더 늘리기 전에 최근 반복된 실수 한 가지를 정하고, 그 상황에서만 적용할 작은 규칙을 만들어보세요.",
      goodResult: "강점을 버리지 않으면서도 같은 문제를 반복하는 횟수를 줄일 수 있습니다.",
    });
  }
  return items.slice(0, 3);
}

function premiumDomains(facts: SajuFacts, free: FreeSajuReport): PremiumDomainSection[] {
  const defs = [
    ["love_relationship", "연애·관계"],
    ["work", "일·직업·사업"],
    ["money", "돈·재물"],
    ["wellbeing", "생활·건강"],
  ] as const;

  return defs.map(([key, label]) => {
    const report = buildFocusedSajuReport(facts, free, key);
    return {
      key,
      label,
      headline: report?.intro ?? `${label} 흐름을 현재 사주 구조에서 더 깊게 정리합니다.`,
      paragraphs: report
        ? report.sections.slice(0, 4).map((section) => `${section.title} — ${section.paragraph.text}`)
        : [],
    };
  });
}

export function buildPremiumReport(input: {
  facts: SajuFacts;
  freeReport: FreeSajuReport;
  leftPalm?: PalmFacts | null;
  rightPalm?: PalmFacts | null;
  dominantHand?: DominantHand | null;
}): PremiumReport {
  const { facts, freeReport } = input;
  const annual = buildSajuAnnualOutlook(facts);
  const palm =
    input.leftPalm && input.rightPalm && input.dominantHand
      ? buildPalmBilateralReading(input.leftPalm, input.rightPalm, input.dominantHand)
      : null;

  const currentFlow = facts.currentDaeun
    ? `현재는 ${facts.currentDaeun.ageRange}세 구간의 ${facts.currentDaeun.ganzhi} 대운 흐름 안에 있습니다.`
    : "현재 대운의 정확한 구간은 출생시간 정보에 따라 정밀도가 달라집니다.";

  return {
    title: "프리미엄 1년 리포트",
    summary:
      `${freeReport.snapshot.text} ${currentFlow} 무료 결과에서 보인 성향을 반복하기보다, 앞으로 12개월에 무엇을 보완하고 어떤 선택을 하면 강점이 실제 결과로 이어지기 쉬운지까지 정리했습니다.`,
    corePatterns: [
      freeReport.decisionStyle.text,
      freeReport.opportunityStyle.text,
      freeReport.nextMove.text,
    ],
    balance: balanceItems(facts, freeReport),
    domains: premiumDomains(facts, freeReport),
    annual,
    actionPlan: [
      { title: "지금 먼저 할 것", text: freeReport.nextMove.text },
      { title: "큰 흐름이 바뀔 때", text: freeReport.timingShift.text },
      {
        title: "좋은 결과를 만들기 위한 기준",
        text: "운이 좋아 보이는 시기에도 실제 결과는 준비·사람·환경·선택에 따라 달라집니다. 이번 리포트에서 강하게 잡힌 달에는 기회를 넓히고, 주의가 필요한 달에는 조건을 확인하는 식으로 속도를 조절하는 것이 핵심입니다.",
      },
    ],
    palm,
    note:
      "프리미엄 리포트는 사주 원국·현재 대운·세운·월운을 함께 보고, 양손 손금이 있으면 타고난 경향과 현재 변화까지 보조 근거로 사용합니다. 특정 사건이나 결과를 보장하는 예언이 아니라 선택 시점을 좁히고 행동 방향을 정리하는 해석입니다.",
  };
}
