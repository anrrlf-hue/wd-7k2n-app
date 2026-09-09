"use client";

import { Camera } from "lucide-react";

// 손금 교차분석 기능은 이번 범위에서 제외. UI 자리만 마련해두고
// 실제 촬영/분석 로직은 연결하지 않는다.
export function PalmEntryCard() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Camera className="size-4.5 text-muted-foreground" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">사진 한 장으로 재물운 교차 확인</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          손금 사진으로 사주 재물운을 교차 분석하는 기능을 준비하고 있어요.
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        곧 만나요
      </span>
    </div>
  );
}
