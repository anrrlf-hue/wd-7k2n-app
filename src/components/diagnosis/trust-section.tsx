"use client";

import { ShieldCheck } from "lucide-react";

/** 결제 직전 신뢰 설명. 서민금융진흥원의 공식 서비스·제휴·검증이 아니라,
 * 그 기관의 온라인 재무상담에서 실제 쓰인 질문·답변 사례를 참고해 설계한
 * 분석이라는 점만 정확하게 전달한다 — "공식", "인증", "제휴", "검증받은"
 * 같은 표현은 쓰지 않는다. */
export function TrustSection() {
  return (
    <div className="mystic-card mt-6 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-(--gold)">
        <ShieldCheck className="size-3.5" />
        이 분석은 이렇게 만들어졌습니다
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        현실 재무분석은 서민금융진흥원 온라인 재무상담에서 실제 사용된 질문과 답변 사례를 바탕으로 설계했습니다.
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        사주는 성향과 시기를 참고하고, 실제 실행 방향은 소득·지출·저축·대출 같은 현실정보를 함께 분석해 제안합니다.
      </p>
    </div>
  );
}
