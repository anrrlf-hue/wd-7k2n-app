"use client";

import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";

// 손금 교차분석 기능은 이번 범위에서 제외. UI 자리만 마련해두고
// 실제 촬영/분석 로직은 연결하지 않는다.
export function PalmEntryCard() {
  return (
    <div className="mystic-card flex items-center gap-3 border-dashed p-4">
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-(--gold-soft)">
        <PalmLineIllustration />
      </span>
      <div className="flex-1">
        <p className="text-sm leading-snug font-medium">
          사주에서 보인 돈 성향, 손에도 같은 흐름이 있을까?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          손금 사진 한 장으로 사주 재물운과 교차 분석하는 기능을 준비하고 있어요.
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        곧 만나요
      </span>
    </div>
  );
}
