"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

export function LaunchAnalytics() {
  useEffect(() => {
    track("landing_viewed", { source: "home" });
  }, []);

  return null;
}
