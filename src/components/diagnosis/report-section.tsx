"use client";

import type { ReactNode } from "react";

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

export function ParagraphSection({
  title,
  step,
  paragraph,
  boxed,
}: {
  title: string;
  step?: string;
  paragraph: { text: string; evidence: string };
  boxed?: boolean;
  /** 하위호환: 예전 호출부가 남아 있어도 화면에는 근거/행동 토글을 노출하지 않는다. */
  showGuidance?: boolean;
}) {
  return (
    <ReportSection title={title} step={step}>
      {boxed ? (
        <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{paragraph.text}</p>
      ) : (
        <p>{paragraph.text}</p>
      )}
    </ReportSection>
  );
}

export function EvidenceItemCard({
  index,
  title,
  detail,
}: {
  index: number;
  title: string;
  detail: string;
  evidence?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-base font-semibold">
        {index}. {title}
      </p>
      <p className="mt-1.5 text-[15px] leading-7 text-muted-foreground">{detail}</p>
    </div>
  );
}
