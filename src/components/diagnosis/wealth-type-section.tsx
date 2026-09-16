"use client";

import { useState } from "react";
import { ReportSection } from "@/components/diagnosis/report-section";
import type { WealthTypeResult } from "@/lib/wealth-type";

/** 재물 유형 4조각. 4번째 조각(bridge)에서 절대 특정 해법을 지목하지
 * 않는다 — "그래서 무엇부터 바꿔야 하는지"는 유료1(재무 설문→처방)의
 * 몫이라, 여기서는 그 질문만 남기고 끊는다. 아직 유료1 자체가 없으므로
 * CTA는 PaywallOffer의 "준비 중" 톤만 가볍게 재사용하고 실제 링크는
 * 만들지 않는다. */
export function WealthTypeSection({ result }: { result: WealthTypeResult | null }) {
  const [requested, setRequested] = useState(false);
  if (!result) return null;

  const { pieces } = result;

  return (
    <ReportSection title="내 재물 유형">
      <p className="text-base font-semibold text-(--gold)">{pieces.typeAndDiagnosis}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pieces.evidence}</p>
      <p className="mt-3 text-sm leading-relaxed">{pieces.problem}</p>
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">{pieces.bridge}</p>

      <button
        type="button"
        onClick={() => setRequested(true)}
        className="mt-3 text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
      >
        내 상황에 맞는 실행 순서가 궁금하다면
      </button>
      {requested && <p className="mt-1.5 text-xs text-(--gold)">이 기능은 아직 준비 중이에요.</p>}
    </ReportSection>
  );
}
