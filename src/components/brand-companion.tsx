"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type CompanionState =
  | "welcome" | "input-guide" | "analyzing" | "saju-companion"
  | "palm-guide" | "palm-observing" | "simulation-companion"
  | "reality-transition" | "finance-guide" | "diagnosis-reveal" | "report-handoff";

type CompanionProps = {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition" | "scene";
};

export function BrandCompanion({ state, presence = "quiet" }: CompanionProps) {
  const root = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(presence === "quiet");

  useEffect(() => {
    const element = root.current;
    if (!element || presence === "quiet") return;
    let inView = false;
    const update = () => setVisible(inView && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.45;
      update();
    }, { threshold: [0, 0.45] });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [presence]);

  return <span
    ref={root}
    aria-hidden="true"
    data-companion-state={state}
    data-motion-ready={loaded && visible}
    data-motion={presence === "quiet" ? "still" : state === "analyzing" ? "focus" : "arrive"}
    className={`brand-companion brand-${presence}`}
  >
    <span className="brand-light" />
    <span className="brand-shadow" />
    <Image
      src="/images/undon-moon-cat.svg"
      alt=""
      width={240}
      height={280}
      sizes={presence === "quiet" ? "48px" : presence === "regular" ? "64px" : presence === "scene" ? "140px" : "80px"}
      onLoad={() => setLoaded(true)}
      className="brand-portrait"
    />
  </span>;
}

export function CompanionHeading({ state, presence = "quiet", showCompanion = true, children }: {
  state: CompanionState;
  presence?: "quiet" | "regular" | "transition" | "scene";
  showCompanion?: boolean;
  children: ReactNode;
}) {
  return <div className="companion-heading">
    <div className="min-w-0 flex-1">{children}</div>
    {showCompanion && <BrandCompanion state={state} presence={presence} />}
  </div>;
}
