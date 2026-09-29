"use client";

import { ReportSection } from "@/components/diagnosis/report-section";
import type { WealthTypeResult } from "@/lib/wealth-type";

/** 전체 사주 안의 돈·재물 한 영역. 서비스 전체 대표 결과로 사용하지 않는다. */
export function WealthTypeSection({ result }: { result: WealthTypeResult | null }) {
  if (!result) return null;

  const { pieces } = result;

  return (
    <ReportSection title="사주에서 본 돈 관리 성향">
      <p className="text-base font-semibold text-(--gold)">{pieces.typeAndDiagnosis}</p>
      <p className="mt-2 text-base leading-7 text-muted-foreground">{pieces.evidence}</p>
      <p className="mt-3 text-base leading-7">{pieces.problem}</p>
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-base leading-7 text-accent-foreground">{pieces.bridge}</p>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">재물은 전체 사주의 한 영역입니다. 실제 돈 상태는 사주와 별도로 현실 숫자를 확인해야 합니다.</p>
    </ReportSection>
  );
}
