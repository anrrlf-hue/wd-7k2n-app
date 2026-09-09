"use client";

import { motion } from "framer-motion";
import type { JobLeaning } from "@/lib/money-tendency";

export function JobSpectrum({ jobType }: { jobType: JobLeaning }) {
  const percent = ((jobType.leaning - 1) / 4) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>직장형</span>
        <span>사업형</span>
      </div>
      <div className="relative mt-1.5 h-1.5 rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 rounded-full bg-(--gold-soft)" style={{ width: "100%" }} />
        <motion.div
          className="absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-(--gold) shadow-[0_0_10px_var(--gold-soft)]"
          initial={{ left: "50%", opacity: 0.5 }}
          animate={{ left: `${percent}%`, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ marginLeft: -7 }}
        />
      </div>
      <p className="mt-2 text-sm leading-relaxed">{jobType.label}</p>
    </div>
  );
}
