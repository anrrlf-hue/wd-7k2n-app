"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ReportParagraph } from "@/lib/free-report-schema";

/** 손금 완료 직후에 뜨는 종합판정 — 원국+대운+성향+손금을 하나로 묶은
 * 무료 경험의 클라이맥스. result-step.tsx의 히어로 카드와 같은
 * mystic-ring 톤을 쓰되, "종합판정"이라는 이름으로 그 앞의 목록형
 * ParagraphSection들과는 시각적으로 분리한다. */
export function VerdictCard({ verdict }: { verdict: ReportParagraph }) {
  return (
    <motion.div
      initial={{ opacity: 0.4, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5 }}
      className="mystic-ring relative mt-8 overflow-hidden rounded-2xl border border-(--gold-soft) bg-card p-6"
    >
      <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-(--gold-soft) blur-3xl" />
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-(--gold)">
        <Sparkles className="size-3.5" />
        종합판정
      </p>
      <p className="mt-3 text-[15px] leading-relaxed">{verdict.text}</p>
    </motion.div>
  );
}
