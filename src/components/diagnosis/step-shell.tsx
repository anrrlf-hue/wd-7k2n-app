"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { JourneyHeader } from "@/components/journey-header";

export function StepShell({
  stepKey,
  progress,
  children,
  progressLabel,
}: {
  stepKey: string;
  progress: number;
  children: ReactNode;
  progressLabel?: string;
}) {
  return (
    <div className={`journey-surface ${["result", "answer"].includes(stepKey) ? "result-bright" : ""}`}>
    <div className="journey-shell">
      <JourneyHeader chapter={1} />
      {/* Exit animations can stall when a mobile tab is backgrounded.
       * Mount the new step immediately; only animate its entrance. */}
      {!["result", "answer"].includes(stepKey) && (
        <div className="mb-7">
          <p className="mb-2 text-xs text-muted-foreground">
            {progressLabel ??
              (stepKey === "focus"
                ? "관심 사주 · 1 / 4"
                : stepKey === "date"
                  ? "출생정보 · 2 / 4"
                  : stepKey === "time"
                    ? "출생정보 · 3 / 4"
                    : stepKey === "personality"
                      ? "MBTI · 4 / 4 · 선택사항"
                      : "분석 준비")}
          </p>
          <Progress value={progress} className="h-1" />
        </div>
      )}
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </div>
    </div>
  );
}
