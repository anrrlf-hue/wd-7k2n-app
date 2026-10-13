import { z } from "zod";
import { PREMIUM_REPORT_VERSION, type PremiumReport } from "@/lib/premium-report";
import type { LegacyPremiumReport } from "@/lib/legacy-premium-report";

const text = z.string();
const keys = ["love_relationship", "money", "work"] as const;
const comparison = z.object({ domain: z.enum([...keys, "wellbeing"]), emphasis: z.enum(["실험", "유지", "점검"]), basis: text });
const annual = z.object({
  startLabel: text, endLabel: text, precision: z.enum(["monthly", "broad"]),
  months: z.array(z.object({ label: text, year: z.number().int(), month: z.number().int().min(1).max(12),
    comparisons: z.array(comparison).length(4).refine(items => new Set(items.map(item => item.domain)).size === 4),
  })).length(12),
});
const reading = z.object({ headline: text, paragraphs: z.array(text).min(1), opportunity: text, caution: text, tip: text, basis: text, observationNote: text.nullable().optional() });
const interpretation = z.object({
  headline: text,
  passages: z.array(z.object({ id: text, kind: z.enum(["observation", "traditional", "reflection"]), text, evidenceIds: z.array(text).min(1) })).min(1),
  evidence: z.array(z.object({ id: text, kind: z.enum(["calculated", "observed"]), source: text, value: z.union([text, z.number(), z.boolean(), z.null()]) })),
  limits: z.array(text),
}).refine(plan => {
  const ids = new Set(plan.evidence.map(e => e.id));
  return ids.size === plan.evidence.length && plan.passages.every(p => p.evidenceIds.every(id => ids.has(id)));
});
const renderableReport = z.object({
  version: z.enum(["annual-reading-2026-10-v2", "context-reading-2026-10-v3", "personal-reading-2026-10-v4", "integrated-reading-2026-10-v5", "coherent-reading-2026-10-v6", "edited-reading-2026-10-v7", "evidence-reading-2026-10-v8", "distinct-reading-2026-10-v9", PREMIUM_REPORT_VERSION]),
  title: z.literal("프리미엄 통합 연간 리포트"), summary: text, note: text,
  overall: reading,
  domains: z.array(reading.extend({ key: z.enum(keys), label: text })).length(3).refine(items => items.every((item, i) => item.key === keys[i])),
  annual,
  annualIntroduction: text, annualBackground: text.nullable(),
  annualMethod: text.optional(),
  annualHighlights: z.array(text).optional(),
  palmConnections: z.array(z.object({ topic: text, text })).optional(),
  profileRule: text.optional(),
  closing: z.object({ remember: z.string().min(1), question: z.string().min(1), basis: z.string().min(1) }).optional(),
  periods: z.array(z.object({ label: text, months: z.array(text).min(1), headline: text, reading: text, basis: text,
    domains: z.array(z.object({ key: z.enum(keys), label: text, text })),
    interpretation: interpretation.optional(),
    symbols: z.object({
      year: z.object({ ganzhi: text, stem: text, branch: text, stemTenGod: text.nullable(), branchTenGod: text.nullable() }),
      month: z.object({ ganzhi: text, stem: text, branch: text, stemTenGod: text.nullable(), branchTenGod: text.nullable() }),
    }).optional(),
  })).min(1),
}).refine(report => JSON.stringify(report.periods.flatMap(period => period.months)) === JSON.stringify(report.annual.months.map(month => month.label)))
  .refine(report => report.version === "annual-reading-2026-10-v2" || (
    Boolean(report.profileRule) && Array.isArray(report.palmConnections)
    && !!report.annualHighlights?.length && report.annualHighlights.length <= 3
    && new Set(report.annualHighlights).size === report.annualHighlights.length
    && report.annualHighlights.every(label => report.periods.some(period => period.months[0] === label))
    && report.periods.every(period => period.interpretation)
  )).refine(report => !["personal-reading-2026-10-v4", "integrated-reading-2026-10-v5", "coherent-reading-2026-10-v6", "edited-reading-2026-10-v7", "evidence-reading-2026-10-v8", "distinct-reading-2026-10-v9", PREMIUM_REPORT_VERSION].includes(report.version) || Boolean(report.closing))
  .refine(report => !["evidence-reading-2026-10-v8", "distinct-reading-2026-10-v9", PREMIUM_REPORT_VERSION].includes(report.version) || Boolean(report.annualMethod))
  .refine(report => !["distinct-reading-2026-10-v9", PREMIUM_REPORT_VERSION].includes(report.version) || report.periods.every(period => Boolean(period.symbols)));

// Preserve saved v1 prose in its original view; only an explicit request creates
// the new edition. Accept no half-written report that could crash either view.
const legacyReport = z.object({
  title: z.literal("프리미엄 통합 연간 리포트"), summary: text, note: text,
  corePatterns: z.array(text).min(1),
  balance: z.array(z.object({ title: text, howToFill: text, whatItMeans: text })),
  domains: z.array(z.object({ key: z.enum([...keys, "wellbeing"]), label: text, headline: text,
    paragraphs: z.array(text).min(2), experiment: text, changeWhen: text,
    monthlyActions: z.object({ 실험: text, 유지: text, 점검: text }),
  })).length(4).refine(items => items.every((item, i) => item.key === [...keys, "wellbeing"][i])),
  annual,
});
export type StoredPremiumReport = PremiumReport | LegacyPremiumReport;
export function isRenderablePremiumReport(value: unknown): value is PremiumReport {
  return renderableReport.safeParse(value).success;
}
export function isCurrentPremiumReport(value: unknown): value is PremiumReport {
  return isRenderablePremiumReport(value) && value.version === PREMIUM_REPORT_VERSION;
}
export function isStoredPremiumReport(value: unknown): value is StoredPremiumReport {
  return isRenderablePremiumReport(value) || legacyReport.safeParse(value).success;
}
