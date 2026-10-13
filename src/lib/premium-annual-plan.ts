import type { PremiumDomainSection } from "@/lib/legacy-premium-report";
import type { SajuAnnualOutlook } from "@/lib/saju-timing";

type Emphasis = keyof PremiumDomainSection["monthlyActions"];

interface PlanMonth {
  label: string;
  basis: string;
}

interface PlanPeriod {
  emphasis: Emphasis;
  label: string;
  months: PlanMonth[];
}

/** Presentation only: keep every month's stage and basis, group repeated actions. */
export function buildPremiumAnnualPlan(domain: PremiumDomainSection, annual: SajuAnnualOutlook) {
  const periods: PlanPeriod[] = [];
  for (const month of annual.months) {
    const comparison = month.comparisons.find((item) => item.domain === domain.key)!;
    const entry = { label: month.label, basis: comparison.basis };
    const previous = periods.at(-1);
    if (previous?.emphasis === comparison.emphasis) {
      previous.months.push(entry);
      previous.label = `${previous.months[0].label} ~ ${entry.label}`;
    } else {
      periods.push({ emphasis: comparison.emphasis, label: month.label, months: [entry] });
    }
  }

  // Non-adjacent periods share an action, but remain separate date ranges.
  const emphases = [...new Set(periods.map((period) => period.emphasis))];
  const actions = emphases.map((emphasis) => {
    const matches = periods.filter((period) => period.emphasis === emphasis);
    return {
      emphasis,
      text: domain.monthlyActions[emphasis],
      periods: matches.map((period) => period.label),
      months: matches.flatMap((period) => period.months),
    };
  });
  return { periods, actions };
}
