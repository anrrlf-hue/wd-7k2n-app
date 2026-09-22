import type { ReactNode } from "react";

export type CompanionState =
  | "welcome" | "input-guide" | "analyzing" | "saju-companion"
  | "palm-guide" | "palm-observing" | "simulation-companion"
  | "reality-transition" | "finance-guide" | "diagnosis-reveal" | "report-handoff";

type CompanionProps = {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition" | "scene";
};

export function BrandCompanion({}: CompanionProps) {
  return null;
}

export function CompanionHeading({ children }: {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition" | "scene";
  showCompanion?: boolean;
  children: ReactNode;
}) {
  return <div className="companion-heading">
    <div className="min-w-0 flex-1">{children}</div>
  </div>;
}
