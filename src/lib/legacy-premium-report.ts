import type { SajuFocus, SajuDetailFocus } from "@/lib/saju-focus";
import type { SajuAnnualOutlook } from "@/lib/saju-timing";
import type { PalmBilateralReading } from "@/lib/palm-bilateral";
type MonthlyEmphasis = SajuAnnualOutlook["months"][number]["comparisons"][number]["emphasis"];
export interface PremiumBalanceItem {
  title: string;
  whatItMeans: string;
  howToFill: string;
  goodResult: string;
}

export interface PremiumDomainSection {
  key: SajuDetailFocus;
  label: string;
  headline: string;
  paragraphs: string[];
  experiment: string;
  checkpoint: string;
  changeWhen: string;
  monthlyActions: Record<MonthlyEmphasis, string>;
  timing: string;
}

export interface LegacyPremiumReport {
  title: string;
  summary: string;
  freeSummary: string;
  focus: SajuFocus;
  corePatterns: string[];
  balance: PremiumBalanceItem[];
  domains: PremiumDomainSection[];
  annual: SajuAnnualOutlook;
  palm: PalmBilateralReading | null;
  note: string;
}
