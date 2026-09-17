import Image from "next/image";
import type { ReactNode } from "react";

export type CompanionState =
  | "input-guide" | "analyzing" | "saju-companion"
  | "palm-guide" | "palm-observing" | "simulation-companion"
  | "reality-transition" | "finance-guide" | "diagnosis-reveal" | "report-handoff";

// One identity, three reusable poses. These states only affect decoration.
// Welcome is the same angel already painted into wealth-study-hero.webp.
const POSE: Record<CompanionState, "guide" | "reading" | "handoff"> = {
  "input-guide": "guide",
  analyzing: "reading",
  "saju-companion": "reading",
  "palm-guide": "guide",
  "palm-observing": "reading",
  "simulation-companion": "guide",
  "reality-transition": "handoff",
  "finance-guide": "reading",
  "diagnosis-reveal": "handoff",
  "report-handoff": "handoff",
};

export function AngelCompanion({ state, presence = "quiet" }: {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition";
}) {
  return <span className={`angel-companion angel-${presence}`} data-companion-state={state} aria-hidden="true">
    <Image src={`/images/angel-${POSE[state]}.webp`} alt="" width={240} height={320}
      sizes={presence === "quiet" ? "40px" : presence === "regular" ? "56px" : "68px"}
      className="angel-portrait" />
  </span>;
}

/** Reserves a separate column: never floats over text, fields or buttons. */
export function CompanionHeading({ state, presence = "quiet", children }: {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition";
  children: ReactNode;
}) {
  return <div className="companion-heading">
    <div className="min-w-0 flex-1">{children}</div>
    <AngelCompanion state={state} presence={presence} />
  </div>;
}
