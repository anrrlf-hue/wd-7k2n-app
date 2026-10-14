// Authored traditional readings selected from calculated natal sources.
// No model/API, invented biography or palm signal enters the free natal report.
import type { SajuFacts } from "@/lib/saju-facts";
import type { FreeSajuReport } from "@/lib/free-report-schema";
import type { PersonalityInput } from "@/lib/personality-check";
import { buildCustomerFreeNarrative } from "@/lib/saju-customer-narrative";
import { buildRealWorldPersonalization } from "@/lib/real-world-personalization";

export function buildFreeSajuReport(facts: SajuFacts, personality?: PersonalityInput): FreeSajuReport {
  return { ...buildCustomerFreeNarrative(facts),
    realWorldPersonalization: personality ? buildRealWorldPersonalization(facts, personality) : null };
}
