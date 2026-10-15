import type { SajuFacts } from "@/lib/saju-facts";
import { buildPersonalReading } from "@/lib/personal-reading";
import { buildPremiumEditorialPlan } from "@/lib/premium-editorial-plan";
import { buildCustomerFreeNarrative } from "@/lib/saju-customer-narrative";
import { buildSajuMoneyMeaning } from "@/lib/saju-money-meaning";

// The same natal source selection feeds free summaries and the later verdict.
export function buildSajuReadingCoherence(facts: SajuFacts) {
  const editorial = buildPremiumEditorialPlan(facts, buildPersonalReading(facts).rule);
  const narrative = buildCustomerFreeNarrative(facts);
  return { arcId: editorial.id, snapshot: narrative.snapshot, temperament: narrative.temperament,
    decisionStyle: narrative.decisionStyle, strengths: narrative.strengths, cautions: narrative.cautions,
    money: { ...buildSajuMoneyMeaning(editorial), structure: narrative.wealthStructure,
      keeping: narrative.keepingStyle, spending: narrative.leakPattern },
    verdictLead: narrative.snapshot.text };
}
