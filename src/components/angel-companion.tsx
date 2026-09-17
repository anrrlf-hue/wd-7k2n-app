"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

type CompanionProps = {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition" | "scene";
};

export function AngelCompanion({ state, presence = "quiet" }: CompanionProps) {
  return <CompanionPortrait key={state + presence} state={state} presence={presence} />;
}

function CompanionPortrait({ state, presence = "quiet" }: CompanionProps) {
  const root = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element || presence === "quiet") return;
    let inView = false;
    const updateVisibility = () => setVisible(inView && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      updateVisibility();
    }, { threshold: [0, 0.5] });
    observer.observe(element);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, [presence]);

  return <span ref={root} data-motion-ready={loaded && visible} className={`angel-companion angel-${presence}`} data-companion-state={state} data-motion={presence === "quiet" ? "still" : state === "analyzing" ? "focus" : "arrive"} aria-hidden="true">
    <span className="angel-light" />
    <span className="angel-shadow" />
    <Image src={`/images/angel-${POSE[state]}.webp`} alt="" width={240} height={320}
      sizes={presence === "quiet" ? "48px" : presence === "regular" ? "64px" : presence === "scene" ? "140px" : "80px"}
      onLoad={() => setLoaded(true)} className="angel-portrait" />
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
