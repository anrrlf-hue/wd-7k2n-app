"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StepBadge({ icon }: { icon: ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mb-6 flex size-14 items-center justify-center rounded-full bg-(--gold-soft) text-(--gold)"
    >
      <div className="animate-twinkle absolute inset-0 rounded-full ring-1 ring-(--gold-soft)" />
      {icon}
    </motion.div>
  );
}
