"use client";

import { useState, type ReactNode } from "react";
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

/** 전문 계산근거(재성 N개, 격국, 용신 같은 용어)를 본문에 바로 보여주지
 * 않고 "왜 이렇게 봤나요?" 토글 뒤에 접어둔다 — 기본은 항상 접힘. */
export function EvidenceToggle({ evidence }: { evidence: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        왜 이렇게 봤나요?
      </button>
      {open && <p className="mt-1.5 text-xs text-muted-foreground">{evidence}</p>}
    </div>
  );
}

/** {text, evidence} 쌍을 받아 본문은 항상 보여주고, 근거는 토글 뒤에 접는다.
 * free-report-mock.ts/schema.ts의 ReportParagraph 구조와 짝을 이룬다. */
export function ParagraphSection({
  title,
  step,
  paragraph,
  boxed,
}: {
  title: string;
  step?: string;
  paragraph: { text: string; evidence: string };
  /** leakPattern처럼 강조 박스로 감싸야 하는 문단용 */
  boxed?: boolean;
}) {
  return (
    <ReportSection title={title} step={step}>
      {boxed ? (
        <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{paragraph.text}</p>
      ) : (
        <p>{paragraph.text}</p>
      )}
      <EvidenceToggle evidence={paragraph.evidence} />
    </ReportSection>
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
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-sm font-semibold">
        {index}. {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        왜 이렇게 봤나요?
      </button>
      {open && (
        <span className="mt-1.5 inline-block rounded-full bg-(--gold-soft) px-2 py-0.5 text-[11px] text-(--gold)">
          {evidence}
        </span>
      )}
    </div>
  );
}
