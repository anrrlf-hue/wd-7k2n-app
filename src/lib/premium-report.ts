import type { FreeSajuReport } from "@/lib/free-report-schema";
import type { PalmFacts } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import type { SajuFacts } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";
import type { SajuFocus, SajuDetailFocus } from "@/lib/saju-focus";
import { buildSajuAnnualOutlook, type AnnualMonthSymbols, type SajuAnnualOutlook } from "@/lib/saju-timing";

import { buildPremiumMonthNarrative, traditionalSymbolSubject } from "@/lib/premium-month-narrative";
import { buildPersonalReading, PERSONAL_GROUP_LABEL } from "@/lib/personal-reading";
import type { ReadingPlan } from "@/lib/reading-plan";
import { buildTripleCompare, type CompareItem } from "@/lib/triple-compare";
import { isPalmFactsUsable } from "@/lib/palm-facts";
import { READING_GUIDE } from "@/lib/reading-guide";
import { buildIntegratedPalmReading } from "@/lib/integrated-palm-reading";
import { buildPremiumEditorialPlan } from "@/lib/premium-editorial-plan";
import { composePremiumDomainStory, composePremiumOverallStory } from "@/lib/premium-domain-story";
import { validateReadingPlan } from "@/lib/reading-plan";

export const PREMIUM_REPORT_VERSION = "decision-reading-2026-10-v10" as const;
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
  version: typeof PREMIUM_REPORT_VERSION | "distinct-reading-2026-10-v9" | "evidence-reading-2026-10-v8" | "edited-reading-2026-10-v7" | "coherent-reading-2026-10-v6" | "integrated-reading-2026-10-v5" | "personal-reading-2026-10-v4" | "context-reading-2026-10-v3" | "annual-reading-2026-10-v2";
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

/** Equal contextual readings may be grouped, but a year boundary remains visible.
 * The complete calendar is kept even when the main report selects a few topics. */
export function buildPremiumPeriods(annual: SajuAnnualOutlook, facts: SajuFacts): PremiumPeriod[] {
  const periods: PremiumPeriod[] = [];
  let previousSignature = "";
  for (const [monthIndex, month] of annual.months.entries()) {
    const { plan: interpretation, symbols } = buildPremiumMonthNarrative(facts, month, annual.months[monthIndex - 1] ?? null);
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
      basis: `해석에 사용한 근거: ${interpreted.map(e => `${e.id} ${e.value ?? "미확인"}`).join(" / ")}. 계산 참고(월별 본문에 사용하지 않음): ${month.comparisons[0].basis}.`,
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
  const { facts } = input;
  const annual = buildSajuAnnualOutlook(facts, input.referenceDate);
  const natal = buildPersonalReading(facts);
  const editorial = buildPremiumEditorialPlan(facts, natal.rule);
  const { overall, domains } = natal;
  const hasPalms = input.leftPalm && input.rightPalm && input.dominantHand
    && isPalmFactsUsable(input.leftPalm) && isPalmFactsUsable(input.rightPalm);
  const integration = hasPalms ? buildIntegratedPalmReading(facts, input.leftPalm!, input.rightPalm!, input.dominantHand!, editorial) : {};
  overall.paragraphs = [composePremiumOverallStory(editorial)];
  overall.opportunity = "";
  overall.caution = "";
  if (editorial.id === "duty-translation") {
    const names = { year: "연", month: "월", day: "일", hour: "시" };
    const positions = editorial.natalEvidence.placements
      .filter(item => ["관성", "인성", "식상", "비겁", "재성"].includes(item.group))
      .map(item => `${names[item.pillar]}${item.part === "stem" ? "간" : "지"} ${item.symbol}/${item.tenGod}`);
    const positionBasis = `선택 근거: 관성 ${editorial.natalEvidence.counts.관성}개가 다른 각 그룹보다 많고, 확인된 자리 ${positions.join(" · ")}. 이 배치는 전통적 해석의 근거이며 실제 능력이나 결과를 판정하지 않습니다.`;
    overall.basis += ` ${positionBasis}`;
    for (const reading of domains) reading.basis += ` ${positionBasis}`;
  }
  for (const reading of domains) {
    const area = reading.key;
    if (area === "wellbeing") continue;
    const connection = integration[area];
    reading.paragraphs = [composePremiumDomainStory(area, editorial, connection,
      hasPalms ? { left: input.leftPalm!, right: input.rightPalm!, dominant: input.dominantHand! } : null)];
    // The single passage already contains its example and caution. Saved
    // editions still render their separate cards unchanged.
    reading.opportunity = "";
    reading.caution = "";
    reading.tip = "";
    reading.observationNote = connection?.observationNote;
    if (connection) reading.basis += ` 손금 연결 근거: ${connection.plan.evidence.map(e => `${e.id}=${e.value ?? "미확인"}`).join(" / ")}.`;
  }
  const priorSignals = hasPalms ? buildTripleCompare(facts, (input.dominantHand === "left" ? input.leftPalm! : input.rightPalm!).onnxLines, null) : [];
  const palmConnections: CompareItem[] = Object.entries(integration).filter(([area]) => area !== "overall").map(([area, item]) => ({
    topic: item.plan.headline, kind: "보완", text: domains.find(domain => domain.key === area)?.paragraphs[0] ?? item.plan.passages.map(p => p.text).join("\n\n"),
    signals: priorSignals[area === "love_relationship" ? 1 : 0]?.signals,
    evidence: item.plan.evidence,
  }));
  const periods = buildPremiumPeriods(annual, facts);
  const yearlySymbols = [...new Map(periods.map(period => [period.symbols!.year.ganzhi, period.symbols!.year])).values()];
  const yearContext = yearlySymbols.map(year => `세운 ${year.ganzhi}의 배경은 천간 ${year.stemTenGod ?? "미확인"}의 ${traditionalSymbolSubject(year.stemTenGod)}, 지지 ${year.branchTenGod ?? "미확인"}의 ${traditionalSymbolSubject(year.branchTenGod)}입니다.`).join(" ");
  const highlights = annualHighlights(periods);
  const selectedPeriods = periods.filter(period => highlights.includes(period.months[0]));
  const background = facts.hasTimeInput && facts.currentDaeun
    ? [...new Set([TEN_GOD_GROUP[facts.currentDaeun.stemTenGod], TEN_GOD_GROUP[facts.currentDaeun.branchTenGod]].filter(Boolean))] : [];
  return {
    version: PREMIUM_REPORT_VERSION,
    title: "프리미엄 통합 연간 리포트",
    summary: `이번 풀이의 중심 질문은 ‘${editorial.question}’입니다. 관계와 돈, 일에서 같은 질문을 다르게 살펴보고 ${annual.startLabel}부터 ${annual.endLabel}까지 이어 읽습니다.`,
    overall, domains, annual, periods,
    profileRule: natal.rule,
    closing: natal.closing,
    annualHighlights: highlights,
    palmConnections,
    annualIntroduction: `${selectedPeriods.map(period => period.label).join(", ")}의 흐름을 먼저 살펴봅니다. ${yearContext} 세운 배경과 각 달의 천간·지지 질문을 구분하며, 12개월 전체는 아래에서 이어 읽을 수 있습니다.`,
    annualBackground: background.length ? `현재의 큰 흐름에는 ${background.map(g => `‘${PERSONAL_GROUP_LABEL[g]}’`).join(", ")}의 의미가 놓여 있습니다. 이를 한 해의 배경으로 두고, 달마다 달라지는 주제를 따로 살펴봅니다.` : null,
    annualMethod: `월별 흐름은 매월 중순의 세운·월운을 기준으로 묶었습니다. 절기 경계와 기간 중 큰 운의 전환일은 세밀하게 나누지 않았습니다.${facts.hasTimeInput ? "" : " 출생시간을 몰라 큰 운의 배경과 강약에 따른 보완은 생략했습니다."}`,
    note: READING_GUIDE,
  };
}
