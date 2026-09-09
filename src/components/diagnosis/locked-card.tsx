"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LockedReportCard } from "@/lib/money-tendency";

export function LockedCard({ title, cta }: LockedReportCard) {
  const [requested, setRequested] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-border bg-card/60 p-4"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-(--gold-soft)">
          <Lock className="size-3.5 text-(--gold)" />
        </span>
        <p className="text-sm leading-snug font-medium">{title}</p>
      </div>

      <Button
        variant="outline"
        onClick={() => setRequested(true)}
        className="mt-3.5 h-11 w-full rounded-full border-(--gold-soft) text-sm"
      >
        {cta}
      </Button>

      {requested && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2 flex items-center gap-1 text-xs text-(--gold)"
        >
          <Sparkles className="size-3.5" />
          빠른 시일 내에 열릴 예정이에요. 조금만 기다려주세요.
        </motion.p>
      )}
    </motion.div>
  );
}
