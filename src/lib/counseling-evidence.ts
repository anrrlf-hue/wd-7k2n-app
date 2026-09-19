import { z } from "zod";
import { SURVEY_USAGE } from "@/lib/survey-usage";

const text = z.string().trim().min(1);
export const CounselingPatternSchema = z.object({
  id: text,
  sourceRef: text,
  anonymized: z.literal(true),
  context: text,
  observedFact: z.array(text).min(1),
  followup: z.array(text),
  diagnosisPattern: text,
  action: text, // Recorded proposal, not an automatically approved product rule.
  questionIds: z.array(text.refine(id => Object.hasOwn(SURVEY_USAGE, id), "Unknown survey question")),
  outcome: z.discriminatedUnion("status", [
    z.object({ status: z.literal("unknown") }).strict(),
    z.object({ status: z.literal("confirmed"), measuredAt: z.iso.date(), measurement: text, sourceRef: text }).strict(),
  ]),
}).strict();
export type CounselingPattern = z.infer<typeof CounselingPatternSchema>;
// No authorized full sources loaded. No fabricated cases/aggregates/efficacy claims.
export const COUNSELING_PATTERNS: readonly CounselingPattern[] = [];
export function counselingReferences(questionId: keyof typeof SURVEY_USAGE): readonly CounselingPattern[] {
  return COUNSELING_PATTERNS.filter(pattern => pattern.questionIds.includes(questionId));
}
