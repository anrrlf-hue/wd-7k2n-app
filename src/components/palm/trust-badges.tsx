"use client";

import { ShieldCheck } from "lucide-react";
import { TRUST_BADGES } from "@/lib/trust-badges-copy";

/** 결제 화면의 신뢰 신호 블록 — 후기·리뷰가 아니라 사실 진술만 나열한다.
 * 옛 trust-section.tsx(현실정보 플로우와 함께 삭제됨)를 복원한 게 아니라
 * 새로 만든 컴포넌트다. enabled: false인 항목(재무협회 관련, 명칭 미확정)은
 * 렌더링에서 제외한다. */
export function TrustBadges() {
  const badges = TRUST_BADGES.filter((b) => b.enabled && b.text);
  if (badges.length === 0) return null;

  return (
    <div className="mystic-card mt-4 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-(--gold)">
        <ShieldCheck className="size-3.5" />
        이런 경험을 바탕으로 방향을 함께 잡습니다
      </p>
      <ul className="mt-2 space-y-1.5">
        {badges.map((b) => (
          <li key={b.text} className="text-sm leading-relaxed text-muted-foreground">
            {b.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
