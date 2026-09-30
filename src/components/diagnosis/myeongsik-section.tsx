"use client";

import { ReportSection } from "@/components/diagnosis/report-section";
import type { MyeongsikView } from "@/lib/myeongsik-view";

const PILLAR_LABEL_KO: Record<MyeongsikView["pillars"][number]["pillar"], string> = {
  year: "연주",
  month: "월주",
  day: "일주",
  hour: "시주",
};

const FIVE_ELEMENT_ORDER = ["목", "화", "토", "금", "수"] as const;

const ELEMENT_GUIDE: Record<string, string> = {
  목: "새로운 것을 배우고 키워가는 흐름이 잘 맞습니다. 자연이 있는 곳이나 천천히 성장하는 활동에서 마음이 정리되기 쉽습니다.",
  화: "표현하고 움직일수록 기운이 살아나는 쪽입니다. 사람과 대화하거나 밝은 공간에서 활동할 때 답답함이 풀리기 쉽습니다.",
  토: "일정한 생활 리듬과 익숙한 공간에서 안정감을 얻는 쪽입니다. 급하게 바꾸기보다 차분하게 쌓아가는 흐름이 잘 맞습니다.",
  금: "기준을 분명히 하고 정리할 때 생각이 선명해지는 쪽입니다. 복잡한 것을 줄이고 필요한 것과 아닌 것을 나눌수록 편해집니다.",
  수: "조용히 생각하고 정보를 충분히 살필 때 감각이 살아나는 쪽입니다. 혼자 정리할 시간과 차분한 대화가 잘 맞습니다.",
};

function elementAdvice(view: MyeongsikView): string[] {
  const missing = FIVE_ELEMENT_ORDER.filter((el) => (view.fiveElements[el] ?? 0) === 0);
  if (missing.length > 0) return missing.slice(0, 2).map((el) => ELEMENT_GUIDE[el]);

  const minimum = Math.min(...FIVE_ELEMENT_ORDER.map((el) => view.fiveElements[el] ?? 0));
  const low = FIVE_ELEMENT_ORDER.filter((el) => (view.fiveElements[el] ?? 0) === minimum);
  return low.slice(0, 2).map((el) => ELEMENT_GUIDE[el]);
}

export function MyeongsikSection({ view }: { view: MyeongsikView | null }) {
  if (!view) return null;
  const advice = elementAdvice(view);

  return (
    <ReportSection title="내 사주의 기본 구조">
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
        <p className="mt-2 text-sm text-muted-foreground">
          출생 시간을 알면 현재 흐름과 시기를 조금 더 세밀하게 볼 수 있습니다.
        </p>
      )}

      <p className="mt-5 text-base font-medium">오행 분포</p>
      <div className="mt-2 flex gap-3">
        {FIVE_ELEMENT_ORDER.map((el) => (
          <div key={el} className="flex flex-col items-center gap-0.5">
            <span className="text-sm text-muted-foreground">{el}</span>
            <span className="text-base font-semibold">{view.fiveElements[el] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-accent p-4">
        <p className="text-sm font-semibold">오행에서 이렇게 볼 수 있어요</p>
        <div className="mt-2 space-y-2 text-[15px] leading-7 text-accent-foreground">
          {advice.map((item, index) => (
            <p key={index}>{item}</p>
          ))}
        </div>
      </div>
    </ReportSection>
  );
}
