"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** 무료 사주 V2 섹션 공용 레이아웃. 카드보다 문단 중심으로, 제목/본문 위계를
 * 명확히 하고 3~5분 읽기에 맞춰 line-height를 넉넉히 둔다.
 * px-2(모바일 전용, sm 이상에서는 해제): StepShell의 전역 px-6(24px)은
 * 버튼·카드·진행바까지 다 같이 줄이므로 건드리지 않고, 장문 리포트 본문
 * 컨테이너인 이 컴포넌트에만 안쪽 여백 8px을 더해 모바일 체감 여백을
 * 약 32px로 맞춘다 — 다른 화면 요소는 이 변경의 영향을 받지 않는다. */
export function ReportSection({
  title,
  step,
  children,
}: {
  title: string;
  step?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0.5, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-7 px-2 sm:px-0"
    >
      <h3 className="flex items-baseline gap-1.5">
        {step && <span className="text-xs font-semibold text-(--gold)">{step}</span>}
        <span className="text-[15px] font-semibold tracking-tight">{title}</span>
      </h3>
      <div className="mt-2 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </motion.section>
  );
}

export function EvidenceItemCard({
  index,
  title,
  detail,
  evidence,
}: {
  index: number;
  title: string;
  detail: string;
  evidence: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-sm font-semibold">
        {index}. {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
      <span className="mt-2 inline-block rounded-full bg-(--gold-soft) px-2 py-0.5 text-[11px] text-(--gold)">
        {evidence}
      </span>
    </div>
  );
}
