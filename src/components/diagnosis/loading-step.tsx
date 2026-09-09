"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SajuFormingVisual } from "@/components/diagnosis/saju-forming-visual";

const STATUS_MESSAGES = [
  "명식을 펼치는 중이에요",
  "년주와 월주를 맞추는 중이에요",
  "일주와 시주를 계산하는 중이에요",
  "재물운의 결을 읽는 중이에요",
];

export function LoadingStep() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 850);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <SajuFormingVisual />
      <AnimatePresence mode="wait">
        <motion.p
          key={statusIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {STATUS_MESSAGES[statusIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
