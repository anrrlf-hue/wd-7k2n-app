"use client";

import { ReportSection } from "@/components/diagnosis/report-section";
import type { WealthTypeResult } from "@/lib/wealth-type";

/** 타고난 성향을 읽는 구간. 실제 관리방법은 재무질문 뒤에 이어진다. */
export function WealthTypeSection({ result }: { result: WealthTypeResult | null }) {
  if (!result) return null;

  const { pieces } = result;

  return (
    <ReportSection title="내 재물 유형">
      <p className="text-base font-semibold text-(--gold)">{pieces.typeAndDiagnosis}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pieces.evidence}</p>
      <p className="mt-3 text-sm leading-relaxed">{pieces.problem}</p>
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">{pieces.bridge}</p>

      <p className="mt-4 text-xs text-muted-foreground">손금과 실제 선택을 본 뒤, 내 돈의 흐름을 함께 살펴볼게요.</p>
    </ReportSection>
  );
}
