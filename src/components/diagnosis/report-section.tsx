"use client";

import { useState, type ReactNode } from "react";

/** Quiet shared reading layout. All calculated content stays visible. */
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
    <section className="report-section">
      <h3 className="flex items-baseline gap-1.5">
        {step && <span className="text-sm font-semibold text-(--gold)">{step}</span>}
        <span className="text-lg font-semibold tracking-tight">{title}</span>
      </h3>
      <div className="mt-2 text-base leading-7 text-foreground/90">{children}</div>
    </section>
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
        aria-expanded={open}
        className="text-sm text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        왜 이렇게 봤나요?
      </button>
      {open && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{evidence}</p>}
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
      <p className="text-base font-semibold">
        {index}. {title}
      </p>
      <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">{detail}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-2 text-sm text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        왜 이렇게 봤나요?
      </button>
      {open && (
        <span className="mt-1.5 inline-block rounded-full bg-(--gold-soft) px-2.5 py-1 text-xs text-(--gold)">
          {evidence}
        </span>
      )}
    </div>
  );
}
