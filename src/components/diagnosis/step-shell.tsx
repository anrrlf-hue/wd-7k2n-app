"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

export function StepShell({
  stepKey,
  progress,
  children,
}: {
  stepKey: string;
  progress: number;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-10">
      <Progress value={progress} className="mb-8 h-1.5" />
      <AnimatePresence mode="wait">
        <motion.div
          key={stepKey}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-1 flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
