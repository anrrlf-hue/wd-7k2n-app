"use client";

import { useEffect, useRef } from "react";
import { track, type ConversionEvent } from "@/lib/analytics";

// Count a visible screen marker, not just a completed network request.
export function AnalyticsView({ event }: { event: ConversionEvent }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = marker.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        track(event);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [event]);
  return <span ref={marker} aria-hidden="true" className="block h-px w-px" />;
}
