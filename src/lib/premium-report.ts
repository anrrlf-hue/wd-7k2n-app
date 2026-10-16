import type { FreeSajuReport } from "@/lib/free-report-schema";
import type { PalmFacts } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import type { SajuFacts } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";
import type { SajuFocus, SajuDetailFocus } from "@/lib/saju-focus";
import { buildSajuAnnualOutlook, type AnnualMonthSymbols, type SajuAnnualOutlook } from "@/lib/saju-timing";

import { buildPremiumYearNarrative } from "@/lib/premium-year-narrative";
import { buildPremiumMonthNarrative, traditionalSymbolSubject, type MonthReadingContext } from "@/lib/premium-month-narrative";
import { buildPersonalReading, PERSONAL_GROUP_LABEL } from "@/lib/personal-reading";
import type { ReadingPlan } from "@/lib/reading-plan";
import { buildTripleCompare, type CompareItem } from "@/lib/triple-compare";
import { isPalmFactsUsable, normalizePalmFactsObservation } from "@/lib/palm-facts";
import { READING_GUIDE } from "@/lib/reading-guide";
import { buildIntegratedPalmReading } from "@/lib/integrated-palm-reading";
import { buildPremiumEditorialPlan } from "@/lib/premium-editorial-plan";
import { premiumAnnualThread, premiumClosing, premiumOverallEvidence } from "@/lib/premium-domain-story";
import { buildCustomerPremiumNarrative } from "@/lib/saju-customer-narrative";
import { validateReadingPlan } from "@/lib/reading-plan";
import { describeReadingEvidence } from "@/lib/reading-evidence-display";

export const PREMIUM_REPORT_VERSION = "natal-customer-reading-2026-10-v15" as const;
export interface PremiumReading {
  headline: string;
  paragraphs: string[];
  opportunity: string;
  caution: string;
  tip: string;
  basis: string;
  observationNote?: string | null;
}
export interface PremiumDomainSection extends PremiumReading {
  key: SajuDetailFocus;
  label: string;
}
export interface PremiumPeriod {
  label: string;
  months: string[];
  headline: string;
  reading: string;
  basis: string;
  domains: Array<{ key: "love_relationship" | "money" | "work"; label: string; text: string }>;
  interpretation?: ReadingPlan;
  symbols?: AnnualMonthSymbols;
}
export interface PremiumReport {
  version: typeof PREMIUM_REPORT_VERSION | "natal-customer-reading-2026-10-v14" | "year-connected-reading-2026-10-v13" | "connected-reading-2026-10-v12" | "lived-reading-2026-10-v11" | "decision-reading-2026-10-v10" | "distinct-reading-2026-10-v9" | "evidence-reading-2026-10-v8" | "edited-reading-2026-10-v7" | "coherent-reading-2026-10-v6" | "integrated-reading-2026-10-v5" | "personal-reading-2026-10-v4" | "context-reading-2026-10-v3" | "annual-reading-2026-10-v2";
  title: string;
  summary: string;
  overall: PremiumReading;
  domains: PremiumDomainSection[];
  annual: SajuAnnualOutlook;
  annualIntroduction: string;
  annualBackground: string | null;
  annualMethod?: string;
  periods: PremiumPeriod[];
  note: string;
  annualHighlights?: string[];
  palmConnections?: CompareItem[];
  profileRule?: string;
  closing?: { remember: string; question: string; basis: string };
}

const GROUP_LABEL: Record<string, string> = {
  비겁: "자기 선택",
  식상: "표현과 결과",
  재성: "쓰임과 교환",
  관성: "역할과 신뢰",
  인성: "이해와 도움",
};

function groupsForDaeun(facts: SajuFacts): string[] {
  if (!facts.currentDaeun) return [];
  return [...new Set([
    TEN_GOD_GROUP[facts.currentDaeun.stemTenGod],
    TEN_GOD_GROUP[facts.currentDaeun.branchTenGod],
  ].filter(Boolean))];
}

function daeunPair(facts: SajuFacts): { daeun: NonNullable<SajuFacts["currentDaeun"]>; groups: string[] } | null {
  const daeun = facts.currentDaeun;
  return daeun ? { daeun, groups: groupsForDaeun(facts) } : null;
}

function natalLeaders(facts: SajuFacts): string[] {
  const counts: Record<string, number> = {
    비겁: facts.peerStarCount, 식상: facts.outputStarCount, 재성: facts.wealthStarCount,
    관성: facts.officerStarCount, 인성: facts.resourceStarCount,
  };
  const maximum = Math.max(...Object.values(counts));
  return Object.entries(counts).filter(([, count]) => count === maximum && maximum > 0).map(([group]) => group);
}

function natalPlacement(facts: SajuFacts, group: string): string {
  const placements = facts.pillars
    .filter(pillar => facts.hasTimeInput || pillar.pillar !== "hour")
    .filter(pillar => TEN_GOD_GROUP[pillar.stemTenGod] === group || TEN_GOD_GROUP[pillar.branchTenGod] === group)
    .map(pillar => pillar.pillar === "year" ? "연주" : pillar.pillar === "month" ? "월주" : pillar.pillar === "day" ? "일주" : "시주");
  return [...new Set(placements)].join("·") || "명식 전반";
}

function premiumEvidenceBasis(facts: SajuFacts, area: "overall" | "relationship" | "money" | "work"): string {
  const counts = `비겁 ${facts.peerStarCount} · 식상 ${facts.outputStarCount} · 재성 ${facts.wealthStarCount} · 관성 ${facts.officerStarCount} · 인성 ${facts.resourceStarCount}`;
  if (area === "overall") {
    return `중심 일간 ${facts.dayStem} · 오행 ${Object.entries(facts.fiveElements).map(([key, value]) => `${key} ${value}`).join(" · ")} · ${facts.dayStrengthReliable ? `강약 ${facts.dayStrengthGrade}` : "출생시간 미상으로 강약 보완 제외"}. ${counts}`;
  }
  const group = area === "relationship" ? "비겁·인성" : area === "money" ? "재성·식상" : "관성·식상";
  const pillarLabel = (pillar: string) => ({ year: "해의 자리", month: "달의 자리", day: "태어난 날의 자리", hour: "태어난 시간의 자리" }[pillar] ?? pillar);
  const placements = area === "money" ? facts.wealthStarPillars.map(pillarLabel) : area === "work" ? facts.officerStarPillars.map(pillarLabel) : facts.keyRelations.length ? ["관계의 핵심 결합"] : [];
  const placementText = placements.length ? `${[...new Set(placements)].join(" · ")}${area === "relationship" ? "을" : "를"} 함께 ` : "배치 없이 ";
  return `${group}의 ${placementText}별 개수로 확인한 계산 근거. 원국 분포: ${counts}.`;
}

type DaeunArea = "overall" | "love" | "money" | "work";
type DaeunReading = Record<DaeunArea, string>;

const DAEUN_READINGS: Record<string, DaeunReading> = {
  "정관|상관": {
    overall: "정관의 책임과 상관의 질문이 함께 있어, 맡은 기준을 지키면서도 납득되지 않는 방식에는 자기 판단을 남기려는 시기입니다.",
    love: "관계에서는 믿을 만한 약속을 원하면서도 상대의 말과 행동이 어긋나는 부분을 그냥 넘기기 어렵습니다. 판정하기 전에 무엇을 지키고 싶은지 먼저 말하는 일이 회복의 통로가 됩니다.",
    money: "재물에서는 잘해낸 결과를 더 맡길 수 있는 사람이라는 신뢰로 연결하되, 추가 결과와 추가 대가를 분리해 확인하는 일이 중요해집니다.",
    work: "일에서는 책임을 맡는 것과 더 나은 방법을 제안하는 일이 함께 커집니다. 목표와 절차를 나누어 합의할 수 있는 환경에서 전문성이 드러납니다.",
  },
  "비견|정관": {
    overall: "비견의 자기 몫과 정관의 약속이 함께 있어, 남의 기준에 맞추면서도 내가 선택한 이유를 잃지 않는 일이 현재의 중심입니다.",
    love: "관계에서는 상대의 기대를 존중하면서도 내 시간과 선택을 관계 밖으로 밀어내지 않는 것이 중요합니다. 맞춰 주는 것과 함께 결정하는 것을 구분할 때 가까움이 대등해집니다.",
    money: "재물에서는 함께 움직인 결과에서 각자의 시간·비용·몫을 분명히 하는 일이 중요합니다. 좋은 뜻으로 시작한 공동의 일이 한 사람의 부담으로 남지 않게 조건을 말해야 합니다.",
    work: "일에서는 조직의 기준을 지키면서도 모든 판단을 넘기지 않는 역할이 필요합니다. 공동 기준과 내 결정권을 함께 정할 수 있는 환경이 맞습니다.",
  },
  "정관|식신": {
    overall: "정관의 신뢰와 식신의 꾸준한 산출이 함께 있어, 한 번의 인상보다 반복해서 맡길 수 있는 결과를 만드는 일이 현재의 중심입니다.",
    love: "관계에서는 큰 표현보다 평범한 날에도 지켜지는 태도가 신뢰를 만듭니다. 다만 늘 안정적인 사람이어야 한다고 혼자 책임지지 않고 도움을 청할 자리도 남겨야 합니다.",
    money: "재물에서는 맡은 일을 꾸준히 해낸 신뢰가 보상으로 이어질 수 있지만, 반복해서 제공할 시간과 대가가 맞는지 확인해야 합니다.",
    work: "일에서는 기준을 지키면서 결과를 꾸준히 쌓는 역할이 강해집니다. 안정적인 운영과 작은 개선을 함께 인정하는 환경에서 실력이 지속됩니다.",
  },
  "비견|편관": {
    overall: "비견의 자기 선택과 편관의 낯선 책임이 함께 있어, 내 방식으로 정하고 싶은 마음과 갑자기 커진 요구를 동시에 다루는 시기입니다.",
    love: "관계에서는 내 속도를 지키고 싶은 마음과 상대의 강한 기대가 부딪힐 수 있습니다. 관계를 지키기 위해 모두 맞추기보다 감당할 약속의 범위를 먼저 정하는 편이 가깝습니다.",
    money: "재물에서는 공동의 기회나 경쟁 속에서 내 몫을 지키는 기준이 필요합니다. 제안의 크기보다 누가 무엇을 부담하고 어떤 결과를 나눌지 확인해야 합니다.",
    work: "일에서는 독립적으로 판단하고 싶은 마음에 낯선 책임이 더해집니다. 권한 없이 책임만 늘어나는지, 실제로 결정할 범위가 있는지 확인하는 환경이 중요합니다.",
  },
  "편재|비견": {
    overall: "편재의 넓은 교류와 비견의 자기 몫이 함께 있어, 새로운 사람·기회와 연결되면서도 무엇을 내 생활에 남길지 고르는 시기입니다.",
    love: "관계에서는 사람을 만나고 경험을 넓히는 즐거움이 커질 수 있지만, 함께 움직였다는 사실만으로 친밀함을 확정하지 않는 것이 중요합니다. 서로 다시 선택할 여지를 남길 때 관계가 대등해집니다.",
    money: "재물에서는 거래·제안·사람을 통한 기회가 보여도 공동의 성과와 개인의 몫은 다를 수 있습니다. 넓어진 기회를 따라가기 전에 내 시간과 비용을 빼고도 남는 가치를 확인해야 합니다.",
    work: "일에서는 협업과 독립의 선택지가 함께 열립니다. 사람을 통해 들어온 기회라도 역할·결정권·성과 귀속을 분명히 할 수 있는 환경에서 오래 이어집니다.",
  },
};

function daeunReading(facts: SajuFacts, area: DaeunArea): string {
  const current = daeunPair(facts);
  if (!current) return `출생시간이 확인되지 않아 대운의 시기는 제외하고, 원국에서 확인된 ${area === "money" ? "수입과 지출의 기준" : area === "work" ? "역할과 결정 방식" : area === "love" ? "약속과 관계의 경계" : "중심 기질"}만 읽었습니다.`;
  const key = `${current.daeun.stemTenGod}|${current.daeun.branchTenGod}`;
  const exact = DAEUN_READINGS[key];
  if (exact) return `현재 ${current.daeun.ganzhi} 대운의 ${current.daeun.stemTenGod}·${current.daeun.branchTenGod} 조합은 ${exact[area]}`;
  const groups = current.groups.map(group => GROUP_LABEL[group]).join("·");
  return `현재 ${current.daeun.ganzhi} 대운의 ${current.daeun.stemTenGod}·${current.daeun.branchTenGod} 조합은 ${groups}의 문제를 함께 드러냅니다. 이 시기에 익숙한 원국의 장점을 어떤 조건으로 이어갈지 확인하는 흐름입니다.`;
}

function buildOverallContext(facts: SajuFacts): string {
  const current = daeunPair(facts);
  const leaders = natalLeaders(facts);
  if (leaders[0] === "관성") return current ? daeunReading(facts, "overall") : "확인된 원국에서는 맡은 책임의 기준과 자신의 한계를 함께 세우는 일이 중심입니다.";
  if (leaders[0] === "인성") {
    return `원국에서는 ${natalPlacement(facts, "인성")}의 인성처럼 이유를 이해하고 충분한 바탕을 만든 뒤 움직이는 힘이 중심입니다. 많이 아는 것보다 무엇을 실제 경험으로 옮길지 정할 때 자기 중심이 선명해집니다. ${current ? daeunReading(facts, "overall") : "확인된 원국에서는 이해한 내용을 자신의 말과 경험으로 옮길 때 배움이 생활에 남습니다."}`;
  }
  if (!current) {
    if (facts.peerStarCount >= 2) return "확인된 원국에서는 주변의 기대와 자기 선택을 함께 다루는 힘이 중심입니다. 여러 요구를 모두 떠안기보다 직접 결정할 범위와 도움을 받을 범위를 나눌 때 중심이 선명해집니다.";
    if (facts.wealthStarCount > 0) return "확인된 원국에서는 맡은 역할과 실제 생활에 남는 가치가 이어지는 과정이 중심입니다. 책임을 다하는 방식과 자신의 몫을 받는 조건을 함께 확인할 때 방향이 구체화됩니다.";
    return "확인된 원국에서는 익숙한 기준과 새로 달라진 바람을 함께 살피는 태도가 중심입니다. 경험으로 확인한 부분을 현재의 선택 기준으로 남길 때 풀이가 생활에 닿습니다.";
  }
  if (facts.outputStarCount > 0 && facts.wealthStarCount > 0) {
    return `원국에서는 내놓은 결과가 실제 쓰임과 보상으로 이어지는 과정이 중심입니다. ${daeunReading(facts, "overall")} 결과를 넓히기 전에 지속할 범위와 자기 몫을 함께 정하는 긴장으로 읽습니다.`;
  }
  if (facts.dayStrengthReliable && facts.dayStrength === "weak") {
    return `원국의 장점은 혼자 더 밀어붙일 때보다 사람과 환경의 도움을 자기 결과로 연결할 때 편하게 드러납니다. ${daeunReading(facts, "overall")} 그 도움을 받으면서도 자신의 판단과 이름을 남길 수 있는지가 중심 질문입니다.`;
  }
  return `원국에서 두드러진 기준이 현재의 큰 흐름과 만납니다. ${daeunReading(facts, "overall")} 익숙한 방식으로 잘해내는 것과 새로 맡아야 할 역할을 구분할 때 자신의 중심이 선명해집니다.`;
}

function buildLoveContext(facts: SajuFacts): string {
  const current = daeunPair(facts);
  if (facts.outputStarCount + facts.wealthStarCount > facts.resourceStarCount + facts.officerStarCount) {
    const period = current ? `현재의 큰 흐름에서는 사람과 결과가 만나는 장면이 커집니다.` : "출생시간이 확인되지 않아 시기 대신 원국의 표현과 교환 신호만 읽습니다.";
    return `${period} 반응이 다를 때에는 잘된 점 하나와 아쉬운 점 하나를 따로 말해 보세요. 한쪽의 취향을 다른 쪽의 거절로 바꾸지 않을 때 가까움이 오래 갑니다.`;
  }
  if (facts.officerStarCount > facts.resourceStarCount) {
    return "신뢰를 지키려다 모든 조정까지 혼자 맡지 않도록, 약속을 바꿔야 하는 날에는 지킬 수 있는 범위와 다시 정할 범위를 나누어 말해 보세요.";
  }
  if (facts.peerStarCount >= facts.outputStarCount) {
    return "상대를 배려해 정한 약속이라도 내가 계속 감당할 수 있는지 먼저 확인하세요. 다음 약속을 다시 고를 때 가능한 선택과 포기할 조건을 나란히 말하면 결정권이 남습니다.";
  }
  return "설명을 충분히 들은 뒤에도 남은 감정 하나를 판단 없이 말해 보세요. 이해한 내용과 직접 느낀 마음이 함께 놓일 때 가까움으로 이어집니다.";
}

function buildMoneyContext(facts: SajuFacts): string {
  if (facts.wealthStarCount === 0) {
    return "일을 끝낸 날에는 결과물 하나와 그 결과에 붙일 조건 하나를 함께 적어 보세요. 잘한 일과 받을 대가가 같은 문장 안에서 사라지지 않게 하는 방법입니다.";
  }
  if (facts.outputStarCount >= facts.wealthStarCount) {
    return "제안이나 판매 뒤에는 반응의 크기만 보지 말고, 다시 제공할 시간과 실제로 남은 몫을 나누어 기록해 보세요.";
  }
  return "반복해서 맡을 일과 한 번만 가능한 일을 구분하고, 다음 약속의 대가와 범위를 미리 확인해 보세요.";
}

function buildWorkContext(facts: SajuFacts): string {
  if (facts.officerStarCount > facts.outputStarCount) {
    return "일을 잘했다는 이유로 다음 책임까지 자동으로 늘어나지 않도록 완료 기준과 추가 요청의 절차를 먼저 확인해 보세요.";
  }
  if (facts.outputStarCount > facts.officerStarCount) {
    return "초안을 완성품처럼 지키기보다 무엇을 시험한 결과인지 설명하고, 반응 중 한 가지를 다음 버전에 반영해 보세요.";
  }
  return "시작 전에 완료 기준과 수정 권한을 맞추고, 끝난 뒤에는 결과와 다음 개선을 구분해 기록해 보세요.";
}

function premiumDomainBase(area: "love_relationship" | "money" | "work", facts: SajuFacts): string[] {
  if (area === "love_relationship") {
    if (facts.outputStarCount + facts.wealthStarCount > facts.resourceStarCount + facts.officerStarCount && facts.dayElement === "화") return [
      "관계에서는 함께 움직이며 바로 반응을 주고받는 장면이 가까움을 키웁니다. 먼저 제안하고 분위기를 살리는 힘이 있지만, 빠르게 정한 즐거움이 상대에게도 같은 속도로 편한지는 따로 확인해야 합니다. 열정이 의무가 되지 않도록 각자의 회복 시간까지 관계의 일부로 남겨야 합니다.",
    ];
    if (facts.outputStarCount + facts.wealthStarCount > facts.resourceStarCount + facts.officerStarCount) return [
      "관계에서는 좋아하는 것을 함께 만들고 반응을 주고받는 과정이 가까움을 키웁니다. 표현한 것을 상대가 실제로 쓰거나 즐기는 모습을 보면 자신의 취향이 관계 밖으로도 이어졌다는 보람이 생깁니다. 다만 상대의 반응을 얻기 위해 내가 좋아한 부분까지 바꾸지는 않는 편이 좋습니다.",
    ];
    if (facts.officerStarCount > facts.resourceStarCount) return [
      "관계에서는 지켜야 할 약속과 책임의 범위를 분명히 할 때 신뢰가 생깁니다. 꾸준히 챙기는 힘은 상대에게 안정감을 주지만, 잘해 온 사람이 계속 조정해야 한다는 역할로 굳어질 수도 있습니다. 책임감이 곧 모든 조정을 혼자 떠맡는 일은 아니므로, 서로 맡을 몫을 나누어야 합니다.",
    ];
    if (facts.peerStarCount >= facts.outputStarCount) return [
      "관계에서는 함께하는 시간보다 각자의 결정권이 남는 방식이 중요합니다. 배려해서 약속을 정했는데 상대가 다른 제안을 내놓으면, 내가 들인 정성을 알아주지 않은 듯 서운할 수 있습니다. 혼자 정하면 빠르고 편할 수 있지만, 상대가 고를 자리를 줄이면 가까움이 의무처럼 느껴질 수 있으므로 친밀함을 증명하려고 선택을 대신하지 않는 편이 좋습니다.",
    ];
    return ["관계에서는 이해한 내용과 직접 느낀 마음을 함께 말할 때 가까움이 구체화됩니다. 상대의 사정을 잘 알아보는 힘이 장점이지만, 이해했다는 이유로 자신의 불편을 지우면 관계의 실제 온도를 놓칠 수 있습니다. 설명이 끝난 뒤에도 남은 감정을 숨기지 않는 것이 중요합니다."];
  }
  if (area === "money") {
    if (facts.wealthStarCount === 0) return [
      "획득에서는 만들어 낸 결과를 가격과 생활의 몫으로 번역하는 과정이 핵심입니다. 결과의 완성도에는 민감하지만 대가를 말하는 순간 관계가 거칠어질까 망설일 수 있어, 잘하는 힘과 협상하는 힘을 따로 길러야 합니다.",
      "유지에서는 다른 사람의 기대와 내 생활에 남길 자원을 분리해야 합니다. 좋은 뜻으로 맡은 일이 계속 무급의 추가 부담으로 늘어나지 않게 선을 정할 필요가 있으며, 도와주고 싶은 마음과 계속 부담할 의무는 다릅니다.",
      "지출에서는 새 준비물을 늘리기 전에 이미 가진 것으로 작은 결과를 만들어 보는 편이 맞습니다. 실행 뒤 실제로 부족했던 것만 추가하면 기대와 필요를 구분할 수 있고, 준비하는 안심을 생활의 결과로 착각하는 일도 줄어듭니다.",
    ];
    if (facts.outputStarCount >= facts.wealthStarCount && facts.dayElement === "화") return [
      "획득에서는 먼저 움직여 만든 결과를 상대의 필요에 맞게 다듬는 힘이 교환의 가치로 이어집니다. 수입이 생긴 뒤에는 도구·광고·공동 비용에 한꺼번에 넓히기보다 다음 시도에 남겨 둘 여유를 먼저 떼어 두어야 추진력이 생활을 압박하지 않습니다.",
      "유지에서는 빠르게 커진 기회와 생활의 회복 시간을 함께 계산해야 합니다. 결과를 더 넓히는 데 모두 재투입하기보다 다음에도 감당할 몫을 남길 때 추진력이 지속 가능한 자원으로 남습니다.",
      "지출에서는 시작을 돕는 도구와 실제로 반복해서 쓰는 도구를 구분하는 일이 중요합니다. 처음의 열정에 맞춰 모두 갖추기보다 한 번 실행한 뒤 다음 비용을 정하면 선택의 속도와 생활의 여유가 함께 보존됩니다.",
    ];
    if (facts.outputStarCount >= facts.wealthStarCount) return [
      "획득에서는 표현한 결과가 실제 필요와 만날 때 교환의 가치가 커집니다. 반응을 넓히는 즐거움은 기회를 키우지만, 관심이 곧 지속 가능한 대가라는 뜻은 아니므로 내 시간에 남는 몫을 함께 계산해야 합니다.",
      "유지에서는 함께 만든 결과를 다시 키울 자원과 지금 생활에 남길 자원을 따로 두어야 합니다. 사람의 관심이 커져도 내 시간을 모두 내놓을 필요는 없으며, 확장하고 싶은 마음과 쉬어야 하는 생활을 함께 고려해야 합니다.",
      "지출에서는 무엇을 더 사야 할지보다 이미 가진 도구로 한 번 시험한 뒤 부족한 기능만 고르는 방식이 맞습니다. 작은 실행이 다음 비용의 근거가 되고, 좋은 아이디어와 실제로 필요한 기능을 구분하게 합니다.",
    ];
    return [
      "획득에서는 반복해서 제공할 수 있는 품질과 안정적인 대가를 연결하는 일이 중심입니다. 믿음을 얻는 힘이 장점이지만, 한 번의 호의가 계속 맡을 일로 굳어지지 않게 구분해야 합니다.",
      "유지에서는 신뢰를 지키는 비용과 생활에 남길 자원을 분리해야 합니다. 책임을 다하는 방식이 자기 몫을 없애지 않게 하면서도, 오래 이어 갈 수 있는 범위를 스스로 인정해야 합니다.",
      "지출에서는 오래 쓸 수 있는 선택과 당장의 만족을 비교해 보는 편이 맞습니다. 안정적인 선택만 고르면 새로운 필요를 놓칠 수 있고, 다음 선택의 여유까지 남는지가 기준입니다.",
    ];
  }
  if (facts.officerStarCount > facts.outputStarCount) return [
    ...(facts.dayElement === "화" ? [
      "일에서는 책임을 맡는 속도와 결과를 완성하는 속도가 함께 빨라질 수 있어, 기준을 지키면서도 조정할 시점을 미리 정하는 일이 중요합니다. 신뢰받는 만큼 즉시 해결하려는 힘을 전문성으로 남기려면 다음 요청을 받을 조건까지 말해야 합니다.",
      "환경에서는 요구의 우선순위와 실제 결정권이 한 문장 안에서 맞아야 합니다. 책임만 먼저 커지면 추진력이 피로로 바뀌므로, 어느 범위까지 직접 판단하고 어디서 협의할지 정할 수 있는 자리가 맞습니다.",
      "협업에서는 문제를 먼저 붙잡는 장점과 동료가 자기 몫을 찾을 시간을 함께 남겨야 합니다. 내가 빠르게 해결한 부분과 다음 사람이 이어 갈 부분을 구분할 때 믿음직함이 한 사람에게 고정되지 않습니다.",
    ] : [
    "일에서는 맡은 기준을 지키고 책임의 범위를 분명히 하는 힘이 중심입니다. 성실함은 신뢰를 쌓지만, 잘할수록 더 맡겨지는 구조에서는 자신의 한계를 말하기 어려워질 수 있으므로 완료 기준을 먼저 정해야 합니다.",
    "환경에서는 평가 기준과 결정 권한이 함께 주어지는 자리가 맞습니다. 책임만 있고 수정할 권한이 없다면 신뢰가 소진으로 바뀔 수 있고, 반대로 기준이 분명하면 꾸준함이 전문성으로 남습니다.",
    "협업에서는 먼저 맡은 범위와 추가 요청의 절차를 합의하는 것이 중요합니다. 결과를 끝낸 뒤 다음 책임을 별도로 선택해야 오래 일할 수 있으며, 모두를 대신 해결하는 방식만이 믿음직함은 아닙니다.",
    ]),
  ];
  if (facts.outputStarCount > facts.officerStarCount) return [
    "일에서는 생각을 결과물로 꺼내고 반응을 받아 다시 다듬는 힘이 중심입니다. 새로운 시도를 빠르게 만드는 장점이 있지만, 반응을 모두 따라가면 처음의 취향을 잃을 수 있어 완벽한 첫 결과보다 다음 버전으로 이어지는 실험이 실력이 됩니다.",
    "환경에서는 초안을 보여 줄 수 있고 반응을 실제 개선에 반영할 수 있는 자리가 맞습니다. 표현의 자유와 결과의 기준을 함께 확인해야 하며, 자유롭게 만든다는 것이 기준 없이 계속 바꾸는 일은 아닙니다.",
    "협업에서는 혼자 완성한 뒤 평가받기보다 첫 결과를 공유하고 한 가지 피드백을 선택해 반영하는 방식이 좋습니다. 내 목소리와 공동 기준을 함께 남길 수 있어야 반응을 얻는 일과 자기 결과를 지키는 일이 양립합니다.",
  ];
  return [
    "일에서는 맡은 기준과 내가 만든 결과를 함께 조율하는 힘이 중심입니다. 시작 전에 완료 기준을 맞추면 책임과 표현이 서로 충돌하지 않고, 어느 한쪽만 강조할 때 생기는 피로도 줄어듭니다.",
    "환경에서는 수정 권한과 평가 방식이 분명한 자리가 맞습니다. 결과를 설명할 기회와 책임질 범위를 함께 정해야 하며, 기준을 모르는 상태에서 성실함만 요구받는 자리는 오래 맞지 않습니다.",
    "협업에서는 역할을 나눈 뒤 결과와 개선점을 따로 기록하는 방식이 좋습니다. 잘한 일을 인정하면서 다음 수정도 선택할 수 있어야 안정감과 발전이 함께 남습니다.",
  ];
}

function buildIntegratedDomainParagraphs(
  area: "love_relationship" | "money" | "work",
  facts: SajuFacts,
  palmText?: string,
): string[] {
  const base = premiumDomainBase(area, facts);
  const connection = area === "love_relationship" ? buildLoveContext(facts) : area === "money" ? buildMoneyContext(facts) : buildWorkContext(facts);
  // Keep the domain's authored structure intact. Context is a conclusion,
  // not another card repeating the same explanation.
  const paragraphs = [...base];
  if (connection) paragraphs[paragraphs.length - 1] += ` ${connection}`;
  if (palmText) paragraphs[paragraphs.length - 1] += ` ${palmText}`;
  return paragraphs.filter(Boolean);
}

function compactPeriodReading(parts: string[]): string {
  const sentences = parts.flatMap(part => part.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [part])
    .map(sentence => sentence.trim()).filter(Boolean);
  const kept: string[] = [];
  for (const sentence of sentences) {
    const words = new Set(sentence.replace(/[^가-힣A-Za-z0-9 ]/g, " ").split(/\s+/).filter(word => word.length >= 2));
    const repeats = kept.some(previous => {
      const priorWords = new Set(previous.replace(/[^가-힣A-Za-z0-9 ]/g, " ").split(/\s+/).filter(word => word.length >= 2));
      const overlap = [...words].filter(word => priorWords.has(word)).length;
      return words.size >= 5 && overlap / Math.min(words.size, priorWords.size) >= 0.68;
    });
    if (!repeats) kept.push(sentence);
  }
  // The first relation, one lived scene, and its practical resolution remain
  // visible while near-duplicate sentences are omitted from the customer view.
  return kept.slice(0, 6).join(" ");
}

/** Equal contextual readings may be grouped, but a year boundary remains visible.
 * The complete calendar is kept even when the main report selects a few topics. */
export function buildPremiumPeriods(annual: SajuAnnualOutlook, facts: SajuFacts, context: MonthReadingContext = {}): PremiumPeriod[] {
  const periods: PremiumPeriod[] = [];
  let previousSignature = "";
  for (const [monthIndex, month] of annual.months.entries()) {
    const { plan: interpretation, symbols } = buildPremiumMonthNarrative(facts, month, annual.months[monthIndex - 1] ?? null, context);
    validateReadingPlan(interpretation);
    const signature = JSON.stringify([
      symbols.year.ganzhi, symbols.month.ganzhi,
      symbols.month.stemTenGod, symbols.month.branchTenGod,
      interpretation.passages.map(p => [p.id, p.text]),
    ]);
    const prior = periods.at(-1);
    if (prior && previousSignature === signature) {
      prior.months.push(month.label);
      prior.label = `${prior.months[0]} ~ ${month.label}`;
      // Keep every month's actual stem/branch evidence, even if the reading is shared.
      prior.basis += ` / ${month.comparisons[0].basis}`;
      continue;
    }
    const narrative = interpretation.passages;
    const used = new Set(interpretation.passages.flatMap(p => p.evidenceIds));
    const interpreted = interpretation.evidence.filter(e => used.has(e.id));
    periods.push({
      label: month.label, months: [month.label], headline: interpretation.headline,
      reading: compactPeriodReading((narrative.length ? narrative : interpretation.passages).map(p => p.text)),
      basis: `계산된 세운 ${symbols.year.ganzhi} · 월운 ${symbols.month.ganzhi}. 함께 읽은 근거: ${describeReadingEvidence(interpreted)}. 이 상징의 전통적 의미를 이 달의 이야기로 읽었습니다.`,
      domains: [], interpretation, symbols,
    });
    previousSignature = signature;
  }
  return periods;
}

/** Editorial selection: show the start and the first two different combinations.
 * No invented auspicious ranking; chronological labels explain what was selected. */
function annualHighlights(periods: PremiumPeriod[]): string[] {
  const selected = periods.slice(0, 1);
  const exchange = periods.find(p => {
    const groups = [p.symbols?.month.stemTenGod, p.symbols?.month.branchTenGod]
      .map(god => god ? TEN_GOD_GROUP[god] : null);
    return groups.includes("식상") && groups.includes("재성");
  });
  if (exchange && !selected.includes(exchange)) selected.push(exchange);
  const later = periods.find(p => periods.indexOf(p) > periods.indexOf(selected.at(-1)!) && !selected.some(s => s.headline === p.headline));
  if (later) selected.push(later);
  return selected.map(p => p.months[0]);
}

export function buildPremiumReport(input: {
  facts: SajuFacts;
  freeReport?: FreeSajuReport;
  focus?: SajuFocus;
  referenceDate?: Date;
  leftPalm?: PalmFacts | null;
  rightPalm?: PalmFacts | null;
  dominantHand?: DominantHand | null;
}): PremiumReport {
  input = { ...input,
    leftPalm: input.leftPalm ? normalizePalmFactsObservation(input.leftPalm) : input.leftPalm,
    rightPalm: input.rightPalm ? normalizePalmFactsObservation(input.rightPalm) : input.rightPalm,
  };
  const { facts } = input;
  const annual = buildSajuAnnualOutlook(facts, input.referenceDate);
  const natal = buildPersonalReading(facts);
  const editorial = buildPremiumEditorialPlan(facts, natal.rule);
  const { overall, domains } = natal;
  const customer = buildCustomerPremiumNarrative(facts);
  const hasPalms = input.leftPalm && input.rightPalm && input.dominantHand
    && isPalmFactsUsable(input.leftPalm) && isPalmFactsUsable(input.rightPalm);
  const integration = hasPalms ? buildIntegratedPalmReading(facts, input.leftPalm!, input.rightPalm!, input.dominantHand!, editorial) : {};
  const periods = buildPremiumPeriods(annual, facts, { leftPalm: input.leftPalm, rightPalm: input.rightPalm, dominantHand: input.dominantHand });
  const currentDaeunBasis = facts.currentDaeun
    ? ` 현재 대운 ${facts.currentDaeun.ganzhi}(${facts.currentDaeun.stemTenGod}/${facts.currentDaeun.branchTenGod})을 함께 읽었습니다.`
    : " 출생시간이 확인되지 않아 대운 기반 시기 해석은 제외했습니다.";
  const overallBase = natalLeaders(facts)[0] === "관성"
    ? [
      "원국의 중심에는 맡은 역할을 끝까지 지키고 신뢰를 쌓는 기준이 놓여 있습니다. 잘해냈다는 평가보다 어떤 약속을 계속 맡을지, 누구의 기대까지 책임질지를 스스로 정해야 삶의 방향이 흐려지지 않습니다.",
      "책임감은 강점이지만 모든 요청에 같은 무게로 답할 필요는 없습니다. 지킬 약속과 조정할 약속을 나누고, 일을 잘하는 사람이라는 이름 뒤에 쉬어야 할 시간을 남길 때 신뢰가 오래 갑니다.",
    ]
    : customer.overall;
  overall.paragraphs = [...overallBase, buildOverallContext(facts)];
  overall.basis = premiumEvidenceBasis(facts, "overall") + currentDaeunBasis;
  const overallEvidence = premiumOverallEvidence(editorial);
  if (overallEvidence) overall.basis += ` ${overallEvidence}`;
  overall.headline = "자기 중심과 마음속의 다른 바람";
  overall.opportunity = "";
  overall.caution = "";
  for (const reading of domains) {
    const area = reading.key;
    if (area === "wellbeing") continue;
    const connection = integration[area];
    const palmText = connection?.plan.passages.map(passage => passage.text).join("\n\n");
    const planParagraphs = area === "love_relationship" ? customer.frame.planCopy.relationship : area === "money" ? customer.frame.planCopy.money : customer.frame.planCopy.work;
    reading.paragraphs = [...planParagraphs, ...(palmText ? [palmText] : [])];
    reading.headline = area === "money" ? "얻은 가치와 생활에 남기는 조건" : area === "work" ? "실력이 쓰이는 환경과 끝내는 방식" : "가까움에서 서로의 선택이 남는 방식";
    reading.opportunity = ""; reading.caution = ""; reading.tip = "";
    reading.observationNote = null;
    reading.basis = premiumEvidenceBasis(facts, area === "love_relationship" ? "relationship" : area) + currentDaeunBasis;
    if (connection) reading.basis += ` 함께 읽은 주요선: ${describeReadingEvidence(connection.plan.evidence)}.`;
  }
  const priorSignals = hasPalms ? buildTripleCompare(facts, (input.dominantHand === "left" ? input.leftPalm! : input.rightPalm!).onnxLines, null) : [];
  const joint = integration.overall;
  const palmConnections: CompareItem[] = joint ? [{
    topic: joint.plan.headline, kind: "보완", text: joint.plan.passages.map(p => p.text).join("\n\n"),
    signals: priorSignals[0].signals, evidence: joint.plan.evidence,
  }] : [];
  const yearlySymbols = [...new Map(periods.map(period => [period.symbols!.year.ganzhi, period.symbols!.year])).values()];
  const yearContext = yearlySymbols.map(year => `세운 ${year.ganzhi}의 배경은 천간 ${year.stemTenGod ?? "미확인"}의 ${traditionalSymbolSubject(year.stemTenGod)}, 지지 ${year.branchTenGod ?? "미확인"}의 ${traditionalSymbolSubject(year.branchTenGod)}입니다.`).join(" ");
  const highlights = annualHighlights(periods);
  const background = facts.hasTimeInput && facts.currentDaeun
    ? [...new Set([TEN_GOD_GROUP[facts.currentDaeun.stemTenGod], TEN_GOD_GROUP[facts.currentDaeun.branchTenGod]].filter(Boolean))] : [];
  return {
    version: PREMIUM_REPORT_VERSION,
    title: "프리미엄 통합 풀이",
    summary: customer.summary,
    overall, domains, annual, periods,
    profileRule: natal.rule,
    closing: natal.closing ? premiumClosing(editorial, natal.closing) : undefined,
    annualHighlights: highlights,
    palmConnections,
    annualIntroduction: premiumAnnualThread(editorial, yearlySymbols.map(buildPremiumYearNarrative).filter(year => year !== null),
      [...new Set(annual.months.map(month => `${month.year}년 세운`))]),
    annualBackground: background.length ? `현재의 큰 흐름에는 ${background.map(g => `‘${PERSONAL_GROUP_LABEL[g]}’`).join(", ")}의 의미가 놓여 있습니다. 이를 한 해의 배경으로 두고, 달마다 달라지는 주제를 따로 살펴봅니다.` : null,
    annualMethod: `${yearContext} 월별 흐름은 매월 중순의 세운·월운을 기준으로 묶었습니다. 절기 경계와 기간 중 큰 운의 전환일은 세밀하게 나누지 않았습니다.${facts.hasTimeInput ? "" : " 출생시간을 몰라 큰 운의 배경과 강약에 따른 보완은 생략했습니다."}`,
    note: `${READING_GUIDE} 풀이 속 장면은 실제 개인 경험을 확인한 진술이 아니며, 월별 상징은 사건·수입·건강·수명의 예고로 보지 않습니다.`,
  };
}
