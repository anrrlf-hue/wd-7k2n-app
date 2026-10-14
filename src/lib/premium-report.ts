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
import { premiumAnnualThread, premiumClosing } from "@/lib/premium-domain-story";
import { buildCustomerPremiumNarrative } from "@/lib/saju-customer-narrative";
import { validateReadingPlan } from "@/lib/reading-plan";
import { describeReadingEvidence } from "@/lib/reading-evidence-display";

export const PREMIUM_REPORT_VERSION = "natal-customer-reading-2026-10-v14" as const;
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
  version: typeof PREMIUM_REPORT_VERSION | "year-connected-reading-2026-10-v13" | "connected-reading-2026-10-v12" | "lived-reading-2026-10-v11" | "decision-reading-2026-10-v10" | "distinct-reading-2026-10-v9" | "evidence-reading-2026-10-v8" | "edited-reading-2026-10-v7" | "coherent-reading-2026-10-v6" | "integrated-reading-2026-10-v5" | "personal-reading-2026-10-v4" | "context-reading-2026-10-v3" | "annual-reading-2026-10-v2";
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
  overall.paragraphs = customer.overall;
  overall.basis = customer.frame.evidence.self;
  overall.headline = "자기 중심과 마음속의 다른 바람";
  overall.opportunity = "";
  overall.caution = "";
  for (const reading of domains) {
    const area = reading.key;
    if (area === "wellbeing") continue;
    const connection = integration[area];
    const natalParagraphs = area === "love_relationship" ? customer.love : area === "money" ? customer.money : customer.work;
    const joint = connection?.plan.passages.filter(p => p.kind === "traditional").map(p => p.text) ?? [];
    // Each paragraph has a separate meaning: natal depth, observed interaction,
    // and (money only) preserving/spending. No connection copies this body.
    reading.paragraphs = area === "money" ? [natalParagraphs[0], ...joint, ...natalParagraphs.slice(1)] : [...natalParagraphs, ...joint];
    reading.headline = area === "money" ? "얻은 가치와 생활에 남기는 만족" : area === "work" ? "실력이 자라는 환경과 일에 남는 애착" : "가까워지는 마음과 서로 편한 거리";
    reading.opportunity = ""; reading.caution = ""; reading.tip = "";
    reading.observationNote = null;
    reading.basis = customer.frame.evidence[area === "love_relationship" ? "relationship" : area];
    if (connection) reading.basis += ` 함께 읽은 주요선: ${describeReadingEvidence(connection.plan.evidence)}.`;
  }
  const priorSignals = hasPalms ? buildTripleCompare(facts, (input.dominantHand === "left" ? input.leftPalm! : input.rightPalm!).onnxLines, null) : [];
  const joint = integration.overall;
  const palmConnections: CompareItem[] = joint ? [{
    topic: joint.plan.headline, kind: "보완", text: joint.plan.passages.map(p => p.text).join("\n\n"),
    signals: priorSignals[0].signals, evidence: joint.plan.evidence,
  }] : [];
  const periods = buildPremiumPeriods(annual, facts, { leftPalm: input.leftPalm, rightPalm: input.rightPalm, dominantHand: input.dominantHand });
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
