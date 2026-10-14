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
import { gwaWa, iGa } from "@/lib/korean-particle";

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
  if (!current) return "현재 대운을 계산할 수 없어 원국의 신호만으로 읽었습니다.";
  const key = `${current.daeun.stemTenGod}|${current.daeun.branchTenGod}`;
  const exact = DAEUN_READINGS[key];
  if (exact) return `현재 ${current.daeun.ganzhi} 대운의 ${current.daeun.stemTenGod}·${current.daeun.branchTenGod} 조합은 ${exact[area]}`;
  const groups = current.groups.map(group => GROUP_LABEL[group]).join("와 ");
  return `현재 ${current.daeun.ganzhi} 대운의 ${current.daeun.stemTenGod}·${current.daeun.branchTenGod} 조합은 ${groups}의 문제를 함께 드러냅니다. 이 시기에 익숙한 원국의 장점을 어떤 조건으로 이어갈지 확인하는 흐름입니다.`;
}

function buildOverallContext(facts: SajuFacts): string {
  const current = daeunPair(facts);
  if (!current) return "현재 대운을 계산할 수 없어 원국의 중심 긴장만으로 읽었습니다.";
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
  const period = current ? daeunReading(facts, "love") : "현재 대운은 계산되지 않아 원국의 관계 신호만 읽습니다.";
  if (facts.wealthStarCount > 0 && facts.outputStarCount > 0) {
    return `${period} 사람의 매력과 반응을 알아보고 분위기를 만드는 힘은 관계의 시작을 돕지만, 계속 좋은 모습을 제공해야 한다고 느끼면 자신의 피로와 서운함을 뒤로 미룰 수 있습니다. 끌림을 만든 능력과 약한 마음을 나누는 친밀함을 같은 것으로 보지 않을 때 관계가 오래 이어질 여지가 생깁니다.`;
  }
  if (facts.resourceStarCount > 0) {
    return `${period} 상대의 말과 사정을 충분히 이해하려는 마음이 가까워지는 통로가 됩니다. 다만 설명을 모두 끝내야 마음을 보일 수 있다고 여기면 실제 감정은 뒤로 밀릴 수 있어, 이해한 사실과 지금 느낀 마음을 나누어 말하는 것이 관계의 회복을 돕습니다.`;
  }
  return `${period} 관계에서는 잘 맞추는 능력보다 서로의 기대와 불편을 확인하는 대화가 중요합니다. 한 번의 반응을 관계 전체의 결론으로 만들지 않고, 다시 확인할 수 있는 작은 약속을 남기는 쪽으로 읽습니다.`;
}

function buildMoneyContext(facts: SajuFacts): string {
  const current = daeunPair(facts);
  const period = current ? daeunReading(facts, "money") : "현재의 큰 운이 계산되지 않아 원국의 재성 구조가";
  if (facts.outputStarCount === 0 && facts.wealthStarCount > 0) {
    return `${period} 원국의 재성 ${facts.wealthStarCount}개와 만납니다. 드러난 식상 0은 표현이나 수입 능력의 부재를 뜻하지 않으며, 이미 가진 판단·신뢰·도움이 누구의 필요를 해결하고 어떤 조건으로 보상받는지 확인하는 흐름입니다.`;
  }
  if (facts.outputStarCount > 0 && facts.wealthStarCount > 0) {
    return `${period} 원국의 식상과 재성 사이를 이어 줍니다. 잘 만든 결과의 반응을 모두 수입으로 착각하지 않고, 추가 시간·책임·지속 가능성을 보상 조건에 포함할 때 벌어들인 돈이 실제 생활의 몫으로 남습니다.`;
  }
  return `${period} 원국의 재물 신호와 만납니다. 돈을 얻는 장면과 지키는 장면을 한 번의 성과로 묶지 않고, 무엇이 실제로 남는지 확인하는 기준이 필요합니다.`;
}

function buildWorkContext(facts: SajuFacts): string {
  const current = daeunPair(facts);
  if (!current) return "현재 대운을 계산할 수 없어 원국의 일하는 방식과 환경 조건만으로 읽었습니다.";
  return daeunReading(facts, "work");
}

function buildAnnualConnection(periods: PremiumPeriod[]): string {
  const years = [...new Map(periods.map(period => [period.symbols?.year.ganzhi, period.symbols?.year])).values()]
    .filter((year): year is AnnualMonthSymbols["year"] => Boolean(year?.stemTenGod && year.branchTenGod));
  if (!years.length) return "연운의 십성 관계가 충분히 확인되지 않아 월별 계산만 반영했습니다.";
  const threads = years.map(year => {
    const stem = GROUP_LABEL[TEN_GOD_GROUP[year.stemTenGod!]] ?? year.stemTenGod!;
    const branch = GROUP_LABEL[TEN_GOD_GROUP[year.branchTenGod!]] ?? year.branchTenGod!;
    const same = TEN_GOD_GROUP[year.stemTenGod!] === TEN_GOD_GROUP[year.branchTenGod!];
    return `${year.ganzhi}에는 ${same ? `${stem}${iGa(stem)} 반복되고` : `${stem}${gwaWa(stem)} ${branch}${iGa(branch)} 함께 놓입니다`}. 이 해에는 ${stem}${iGa(stem)} 요구하는 것과 ${branch}${iGa(branch)} 실제로 쓰이는 곳을 함께 살핍니다.`;
  });
  return `연간 세운의 흐름은 ${threads.join(" ")} 이 연간 연결은 한 가지 성과를 예고하는 것이 아니라, 연도별로 달라지는 요구와 쓰임이 실제 생활에서 어떻게 조정되는지 읽기 위한 것입니다.`;
}

function buildIntegratedDomainParagraphs(
  area: "love_relationship" | "money" | "work",
  customer: ReturnType<typeof buildCustomerPremiumNarrative>,
  facts: SajuFacts,
  palmText?: string,
): string[] {
  const base = area === "love_relationship" ? customer.love : area === "money" ? customer.money : customer.work;
  const connection = area === "love_relationship" ? buildLoveContext(facts) : area === "money" ? buildMoneyContext(facts) : buildWorkContext(facts);
  const paragraphs = [...base, connection];
  if (palmText) paragraphs.push(palmText);
  if (area === "money" && facts.outputStarCount === 0) {
    paragraphs.push("이 구성에서 드러난 식상 0은 어떤 일을 할 수 없다는 판정이 아닙니다. 다만 돈을 얻는 설명은 ‘만든 것을 팔 수 있다’는 일반론보다, 이미 가진 판단·신뢰·관계·준비가 누구의 필요를 해결하고 어떤 조건으로 인정되는지를 확인하는 쪽에 둡니다.");
  }
  return paragraphs.filter(Boolean);
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
      reading: (narrative.length ? narrative : interpretation.passages).map(p => p.text).join(" "),
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
    : " 현재 대운은 계산되지 않았습니다.";
  overall.paragraphs = [...customer.overall, buildOverallContext(facts), buildAnnualConnection(periods)];
  overall.basis = customer.frame.evidence.self + currentDaeunBasis;
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
    reading.paragraphs = buildIntegratedDomainParagraphs(area, customer, facts, palmText);
    reading.headline = area === "money" ? "얻은 가치와 생활에 남기는 조건" : area === "work" ? "실력이 쓰이는 환경과 끝내는 방식" : "가까움에서 서로의 선택이 남는 방식";
    reading.opportunity = ""; reading.caution = ""; reading.tip = "";
    reading.observationNote = null;
    reading.basis = customer.frame.evidence[area === "love_relationship" ? "relationship" : area] + currentDaeunBasis;
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
    title: "프리미엄 통합 연간 리포트",
    summary: customer.summary,
    overall, domains, annual, periods,
    profileRule: natal.rule,
    closing: natal.closing ? premiumClosing(editorial, natal.closing) : undefined,
    annualHighlights: highlights,
    palmConnections,
    annualIntroduction: premiumAnnualThread(editorial, yearlySymbols.map(buildPremiumYearNarrative).filter(year => year !== null)),
    annualBackground: background.length ? `현재의 큰 흐름에는 ${background.map(g => `‘${PERSONAL_GROUP_LABEL[g]}’`).join(", ")}의 의미가 놓여 있습니다. 이를 한 해의 배경으로 두고, 달마다 달라지는 주제를 따로 살펴봅니다.` : null,
    annualMethod: `${yearContext} 월별 흐름은 매월 중순의 세운·월운을 기준으로 묶었습니다. 절기 경계와 기간 중 큰 운의 전환일은 세밀하게 나누지 않았습니다.${facts.hasTimeInput ? "" : " 출생시간을 몰라 큰 운의 배경과 강약에 따른 보완은 생략했습니다."}`,
    note: `${READING_GUIDE} 풀이 속 장면은 실제 개인 경험을 확인한 진술이 아니며, 월별 상징은 사건·수입·건강·수명의 예고로 보지 않습니다.`,
  };
}
