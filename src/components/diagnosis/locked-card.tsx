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
      initial={{ opacity: 0.4, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mystic-card relative overflow-hidden p-4"
    >
      <SealPattern />

      <div className="relative flex items-start gap-2.5">
        <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-(--gold-soft)">
          <span className="animate-twinkle absolute inset-0 rounded-full ring-1 ring-(--gold-soft)" />
          <Lock className="size-3.5 text-(--gold)" />
        </span>
        <p className="text-sm leading-snug font-medium">{title}</p>
      </div>

      <Button
        variant="outline"
        onClick={() => setRequested(true)}
        className="relative mt-3.5 h-11 w-full rounded-full border-(--gold-soft) text-sm"
      >
        {cta}
      </Button>

      {requested && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="relative mt-2 flex items-center gap-1 text-xs text-(--gold)"
        >
          <Sparkles className="size-3.5" />
          빠른 시일 내에 열릴 예정이에요. 조금만 기다려주세요.
        </motion.p>
      )}
    </motion.div>
  );
}

// 잠긴 리포트임을 은은하게 암시하는 인장(seal) 모티프. 우측 상단에 낮은
// 투명도로 배치해 "열어보고 싶은" 카드 질감을 준다.
function SealPattern() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -top-4 -right-4 size-24 text-(--gold) opacity-[0.08]"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 50 + Math.cos(angle) * 34;
        const y1 = 50 + Math.sin(angle) * 34;
        const x2 = 50 + Math.cos(angle) * 46;
        const y2 = 50 + Math.sin(angle) * 46;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" />
        );
      })}
    </svg>
  );
}
