"use client";

import { EvidenceToggle, ReportSection } from "@/components/diagnosis/report-section";
import { pillarLifeAreaLabel } from "@/lib/saju-labels";
import type { MyeongsikView } from "@/lib/myeongsik-view";

const PILLAR_LABEL_KO: Record<MyeongsikView["pillars"][number]["pillar"], string> = {
  year: "연주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const FIVE_ELEMENT_ORDER = ["목", "화", "토", "금", "수"] as const;

const ELEMENT_GUIDE: Record<string, string> = {
  목: "초록 식물이나 나무 소재를 가까이 두고, 공원·산책길처럼 자연이 있는 곳에서 시간을 보내보세요. 새로운 일을 배우거나 조금씩 키워가는 활동이 잘 맞습니다. 계획을 세우고 꾸준히 성장하는 사람과 대화를 나누는 것도 도움이 됩니다.",
  화: "낮에는 햇빛을 자주 보고, 집이나 책상에는 따뜻한 조명이나 빨강·주황 계열 소품을 조금 두어보세요. 혼자 있는 시간이 길다면 밝고 적극적인 사람과 대화하거나 만나는 일정을 만들어보는 것도 좋습니다. 걷기·운동, 발표·글쓰기처럼 밖으로 표현하는 활동도 잘 맞습니다.",
  토: "베이지·브라운 계열이나 도자기·흙·돌처럼 안정감을 주는 물건을 가까이 두어보세요. 공간을 한 번에 크게 바꾸기보다 자주 쓰는 자리부터 정리하는 것이 좋습니다. 약속을 잘 지키고 차분한 사람과 시간을 보내거나 식사·수면 시간을 일정하게 맞추는 것도 도움이 됩니다.",
  금: "흰색·회색 계열, 금속 소재처럼 선명하고 정돈된 느낌의 물건을 가까이 두어보세요. 책상이나 서랍처럼 작은 공간 하나를 정리하고, 해야 할 일과 하지 않을 일을 분명히 나누는 연습이 좋습니다. 기준이 분명하고 솔직하게 말해주는 사람과 대화하는 것도 도움이 됩니다.",
  수: "파랑·남색 계열이나 물을 떠올리게 하는 소품을 가까이 두고, 물가나 조용한 공간에서 생각을 정리하는 시간을 가져보세요. 책을 읽거나 정보를 천천히 비교하는 활동이 잘 맞습니다. 말이 빠른 사람보다 차분히 들어주고 생각을 나눌 수 있는 사람과 대화하는 것이 좋습니다.",
};

function elementAdvice(view: MyeongsikView): string[] {
  const missing = FIVE_ELEMENT_ORDER.filter((el) => (view.fiveElements[el] ?? 0) === 0);
  if (missing.length > 0) return missing.map((el) => ELEMENT_GUIDE[el]);

  const minimum = Math.min(...FIVE_ELEMENT_ORDER.map((el) => view.fiveElements[el] ?? 0));
  const low = FIVE_ELEMENT_ORDER.filter((el) => (view.fiveElements[el] ?? 0) === minimum);
  return low.slice(0, 2).map((el) => ELEMENT_GUIDE[el]);
}

export function MyeongsikSection({ view }: { view: MyeongsikView | null }) {
  if (!view) return null;
  const advice = elementAdvice(view);
  const missing = FIVE_ELEMENT_ORDER.filter((el) => (view.fiveElements[el] ?? 0) === 0);
  const minimum = Math.min(...FIVE_ELEMENT_ORDER.map((el) => view.fiveElements[el] ?? 0));
  const low = FIVE_ELEMENT_ORDER.filter((el) => (view.fiveElements[el] ?? 0) === minimum);
  const elementEvidence =
    `오행 분포는 ${FIVE_ELEMENT_ORDER.map((el) => `${el} ${view.fiveElements[el] ?? 0}`).join(" · ")}입니다. ` +
    (missing.length > 0
      ? `이 중 ${missing.join("·")}가 없어 부족한 오행으로 봤어요.`
      : `가장 적은 오행은 ${low.join("·")}라서 이 부분을 상대적으로 약한 쪽으로 봤어요.`);

  return (
    <ReportSection title="명식(命式) — 내 사주의 기본 구조">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-center text-base">
          <thead>
            <tr className="text-sm text-muted-foreground">
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
        <p className="mt-1.5 text-sm text-muted-foreground">출생 시간을 알면 해석이 조금 더 정교해집니다.</p>
      )}

      <p className="mt-4 text-base font-medium">오행 분포</p>
      <div className="mt-1.5 flex gap-3">
        {FIVE_ELEMENT_ORDER.map((el) => (
          <div key={el} className="flex flex-col items-center gap-0.5">
            <span className="text-sm text-muted-foreground">{el}</span>
            <span className="text-base font-semibold">{view.fiveElements[el] ?? 0}</span>
          </div>
        ))}
      </div>
      <EvidenceToggle
        evidence={elementEvidence}
        title="오행 부족과 균형"
        adviceOverride={advice.join(" ")}
      />

      <p className="mt-4 text-sm">
        격국 <span className="font-semibold">{view.geukguk}</span> · 신강신약{" "}
        <span className="font-semibold">{view.dayStrengthGrade}</span>({view.dayStrengthScore})
      </p>

      <p className="mt-4 text-sm">
        재성 궁위 —{" "}
        {view.wealthStarPillars.length > 0
          ? view.wealthStarPillars.map((p) => pillarLifeAreaLabel(p)).join(", ")
          : "원국에 직접 드러나지 않음"}
      </p>
      <p className="mt-1 text-base leading-7">
        관성 궁위 —{" "}
        {view.officerStarPillars.length > 0
          ? view.officerStarPillars.map((p) => pillarLifeAreaLabel(p)).join(", ")
          : "원국에 직접 드러나지 않음"}
      </p>
    </ReportSection>
  );
}
