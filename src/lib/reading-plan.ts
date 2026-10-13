/** An inspectable boundary between measured/calculated facts and interpretation.
 * These records document a reading rule; they do not validate divination. */
export interface ReadingEvidence {
  id: string;
  kind: "calculated" | "observed";
  source: string;
  value: string | number | boolean | null;
}

export interface ReadingPassage {
  id: string;
  kind: "observation" | "traditional" | "reflection";
  text: string;
  evidenceIds: string[];
}

export interface ReadingPlan {
  headline: string;
  passages: ReadingPassage[];
  evidence: ReadingEvidence[];
  limits: string[];
}

/** Missing evidence is an authoring error, never permission to fill a gap. */
export function validateReadingPlan(plan: ReadingPlan): void {
  const ids = new Set(plan.evidence.map(item => item.id));
  if (ids.size !== plan.evidence.length) throw new Error("Duplicate reading evidence");
  for (const passage of plan.passages) {
    if (!passage.text.trim() || !passage.evidenceIds.length || passage.evidenceIds.some(id => !ids.has(id))) {
      throw new Error(`Untraceable reading passage: ${passage.id}`);
    }
  }
}
