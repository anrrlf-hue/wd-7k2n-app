import { z } from "zod";
import type { PremiumReport } from "@/lib/premium-report";
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
const reading = z.object({ headline: text, paragraphs: z.array(text).min(1), opportunity: text, caution: text, tip: text, basis: text });
const renderableReport = z.object({
  version: z.literal("annual-reading-2026-10-v2"),
  title: z.literal("프리미엄 통합 연간 리포트"), summary: text, note: text,
  overall: reading,
  domains: z.array(reading.extend({ key: z.enum(keys), label: text })).length(3).refine(items => items.every((item, i) => item.key === keys[i])),
  annual,
  annualIntroduction: text, annualBackground: text.nullable(),
  periods: z.array(z.object({ label: text, months: z.array(text).min(1), headline: text, reading: text, basis: text,
    domains: z.array(z.object({ key: z.enum(keys), label: text, text })),
  })).min(1),
}).refine(report => JSON.stringify(report.periods.flatMap(period => period.months)) === JSON.stringify(report.annual.months.map(month => month.label)));

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
export function isStoredPremiumReport(value: unknown): value is StoredPremiumReport {
  return isRenderablePremiumReport(value) || legacyReport.safeParse(value).success;
}
