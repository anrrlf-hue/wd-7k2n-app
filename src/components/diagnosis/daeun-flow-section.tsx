"use client";

import { ReportSection } from "@/components/diagnosis/report-section";
import { daeunFlavor } from "@/lib/fortune-candidates";
import type { MyeongsikView } from "@/lib/myeongsik-view";

/** 명식·재물유형 다음, 손금으로 넘어가기 전에 두는 "지금 이 시기" 흐름
 * 섹션. 이미 계산된 대운(currentDaeun/nextDaeun)을 노출만 한다 — 새 계산
 * 없음. 이전에는 명식 섹션 맨 아래 한 줄로만 붙어 있던 걸 별도 섹션으로
 * 승격했다(무료 결과 화면 순서 재배치). */
export function DaeunFlowSection({ view }: { view: MyeongsikView | null }) {
  if (!view || !view.currentDaeun) return null;

  return (
    <ReportSection title="지금은 이런 흐름입니다">
      <p className="text-base leading-7">
        {view.currentDaeun.ageRange}세 전후부터 이어지는 지금의 흐름은 <span className="font-semibold">{daeunFlavor(view.currentDaeun)}</span> 쪽에 가깝습니다.
      </p>
      {view.nextDaeun && (
        <p className="mt-2 text-base leading-7 text-muted-foreground">
          다음 큰 흐름은 {view.nextDaeun.ageRange}세 전후부터 <span className="font-semibold">{daeunFlavor(view.nextDaeun)}</span> 쪽으로 결이 바뀝니다.
        </p>
      )}
    </ReportSection>
  );
}
