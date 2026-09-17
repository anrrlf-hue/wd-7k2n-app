import Image from "next/image";
import type { ReactNode } from "react";

export type CompanionState =
  | "welcome" | "input-guide" | "analyzing" | "saju-companion"
  | "palm-guide" | "palm-observing" | "simulation-companion"
  | "reality-transition" | "finance-guide" | "diagnosis-reveal" | "report-handoff";

// One identity, three reusable poses. These states only affect decoration.
// Background, light and portrait remain independent visual layers.
const POSE: Record<CompanionState, "guide" | "reading" | "handoff"> = {
  welcome: "guide",
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
  presence?: "quiet" | "regular" | "transition" | "scene";
}) {
  return <span className={`angel-companion angel-${presence}`} data-companion-state={state} data-motion={presence === "quiet" ? "still" : state === "analyzing" ? "focus" : "arrive"} aria-hidden="true">
    <span className="angel-light" />
    <span className="angel-shadow" />
    <Image src={`/images/angel-${POSE[state]}.webp`} alt="" width={240} height={320}
      sizes={presence === "quiet" ? "48px" : presence === "regular" ? "64px" : presence === "scene" ? "140px" : "80px"}
      className="angel-portrait" />
  </span>;
}

/** Reserves a separate column: never floats over text, fields or buttons. */
export function CompanionHeading({ state, presence = "quiet", showCompanion = true, children }: {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition" | "scene";
  showCompanion?: boolean;
  children: ReactNode;
}) {
  return <div className="companion-heading">
    <div className="min-w-0 flex-1">{children}</div>
    {showCompanion && <AngelCompanion state={state} presence={presence} />}
  </div>;
}
