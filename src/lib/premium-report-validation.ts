import { z } from "zod";
import type { PremiumReport } from "@/lib/premium-report";

const domainKeys = ["love_relationship", "money", "work", "wellbeing"] as const;
const text = z.string();
const domain = z.object({
  key: z.enum(domainKeys), label: text, headline: text,
  paragraphs: z.array(text).min(2), experiment: text, changeWhen: text,
  monthlyActions: z.object({ 실험: text, 유지: text, 점검: text }),
});
const comparison = z.object({ domain: z.enum(domainKeys), emphasis: z.enum(["실험", "유지", "점검"]), basis: text });
// Validate everything the view/grouping traverses before publishing a response
// or restoring browser storage. Old or incomplete reports remain retryable.
const renderableReport = z.object({
  title: z.literal("프리미엄 통합 연간 리포트"), summary: text, note: text,
  corePatterns: z.array(text).min(1),
  balance: z.array(z.object({ title: text, howToFill: text, whatItMeans: text })),
  domains: z.array(domain).length(4).refine(items => items.every((item, i) => item.key === domainKeys[i])),
  annual: z.object({
    startLabel: text, endLabel: text, precision: z.enum(["monthly", "broad"]),
    months: z.array(z.object({
      label: text, year: z.number().int(), month: z.number().int().min(1).max(12),
      comparisons: z.array(comparison).length(4).refine(items => new Set(items.map(item => item.domain)).size === 4),
    })).length(12),
  }),
});
export function isRenderablePremiumReport(value: unknown): value is PremiumReport {
  return renderableReport.safeParse(value).success;
}
