"use client";

import { ReportSection } from "@/components/diagnosis/report-section";
import { dayStrengthShort, pillarLifeAreaLabel } from "@/lib/saju-labels";
import { daeunFlavor } from "@/lib/fortune-candidates";
import type { MyeongsikView } from "@/lib/myeongsik-view";

const PILLAR_LABEL_KO: Record<MyeongsikView["pillars"][number]["pillar"], string> = {
  year: "연주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const FIVE_ELEMENT_ORDER = ["목", "화", "토", "금", "수"];

/** 무료 결과의 실제 차별점 — 이미 계산 중인 명식을 화면에 펼친다(새 계산
 * 없음, 노출만). 판정 방식 근거 문장은 geukgukSource가 실제 oh-my-saju
 * 판정에서 왔을 때만 보여준다 — ssaju 원본 폴백이면 없는 근거를 말하지
 * 않는다. 사주 정확도("잘 맞습니다")는 어디서도 주장하지 않는다. */
export function MyeongsikSection({ view }: { view: MyeongsikView | null }) {
  if (!view) return null;

  return (
    <ReportSection title="명식(命式) — 이 사주의 원국">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-center text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              {view.pillars.map((p) => (
                <th key={p.pillar} className="pb-1.5 font-medium">
                  {PILLAR_LABEL_KO[p.pillar]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {view.pillars.map((p) => (
                <td key={`${p.pillar}-stem`} className="rounded-t-lg border border-border bg-card py-2 font-semibold">
                  {p.stemKo ? `${p.stemKo}(${p.stemHanja})` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              {view.pillars.map((p) => (
                <td key={`${p.pillar}-branch`} className="rounded-b-lg border border-t-0 border-border bg-card py-2 font-semibold">
                  {p.branchKo ? `${p.branchKo}(${p.branchHanja})` : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {!view.hasTimeInput && (
        <p className="mt-1.5 text-xs text-muted-foreground">시간을 알면 더 정확해집니다.</p>
      )}

      <p className="mt-4 text-sm font-medium">오행 분포</p>
      <div className="mt-1.5 flex gap-3">
        {FIVE_ELEMENT_ORDER.map((el) => (
          <div key={el} className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-muted-foreground">{el}</span>
            <span className="text-sm font-semibold">{view.fiveElements[el] ?? 0}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm">
        격국(格局) <span className="font-semibold">{view.geukguk}</span> · 신강신약(身强身弱){" "}
        <span className="font-semibold">{dayStrengthShort(view.dayStrength)}</span>({view.dayStrengthScore}점)
      </p>
      {view.geukgukSource === "ziping_ditianshui" && (
        <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
          <p>자평진전 방식(월지 지장간 사령·천간 투출)으로 판정</p>
          <p>적천수 방식(일간 기준 통근 위치배점)으로 산출</p>
        </div>
      )}

      <p className="mt-4 text-sm">
        재성 궁위 —{" "}
        {view.wealthStarPillars.length > 0
          ? view.wealthStarPillars.map((p) => pillarLifeAreaLabel(p)).join(", ")
          : "원국에 직접 드러나지 않음"}
      </p>
      <p className="mt-1 text-sm">
        관성 궁위 —{" "}
        {view.officerStarPillars.length > 0
          ? view.officerStarPillars.map((p) => pillarLifeAreaLabel(p)).join(", ")
          : "원국에 직접 드러나지 않음"}
      </p>

      {view.currentDaeun && (
        <p className="mt-4 text-sm">
          현재 대운 {view.currentDaeun.ageRange}세 <span className="font-semibold">{view.currentDaeun.ganzhi}</span> —{" "}
          {daeunFlavor(view.currentDaeun)} 시기
        </p>
      )}
    </ReportSection>
  );
}
