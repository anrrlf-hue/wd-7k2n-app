"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonCompareCard } from "@/components/diagnosis/person-compare-card";
import { PremiumReportView } from "@/components/premium/premium-report-view";
import type { BirthInput, FullSajuDiagnosis, PersonalityInputEcho } from "@/lib/saju";
import {
  SAJU_DETAIL_FOCUS_VALUES,
  SAJU_FOCUS_LABELS,
  SAJU_FOCUS_SHORT_DESCRIPTIONS,
  type SajuDetailFocus,
} from "@/lib/saju-focus";
import type { PalmFacts } from "@/lib/palm-facts";
import type { RealityDominantHand } from "@/lib/reality-palm-context";
import type { PremiumReport } from "@/lib/premium-report";
import { track } from "@/lib/analytics";

type Stage = "focus" | "loading_detail" | "detail" | "loading_premium" | "premium";
type FocusedReport = NonNullable<FullSajuDiagnosis["focusedReport"]>;

export function PostReadingDetailFlow({
  birthInput,
  personalityInput,
  palmFacts,
  leftPalmFacts,
  rightPalmFacts,
  dominantHand,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmFacts?: PalmFacts | null;
  leftPalmFacts?: PalmFacts | null;
  rightPalmFacts?: PalmFacts | null;
  dominantHand?: RealityDominantHand | null;
}) {
  const [stage, setStage] = useState<Stage>("focus");
  const [focus, setFocus] = useState<SajuDetailFocus | null>(null);
  const [focusedReport, setFocusedReport] = useState<FocusedReport | null>(null);
  const [premiumReport, setPremiumReport] = useState<PremiumReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDetail(nextFocus: SajuDetailFocus) {
    setFocus(nextFocus);
    setStage("loading_detail");
    setError(null);
    setFocusedReport(null);

    try {
      const response = await fetch("/api/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          focus: nextFocus,
          mbti: personalityInput?.mbti ?? undefined,
        }),
      });
      const data = (await response.json()) as FullSajuDiagnosis & { error?: string };
      if (!response.ok || !data.focusedReport) {
        throw new Error(data.error || "세부 풀이를 만들지 못했습니다.");
      }
      setFocusedReport(data.focusedReport);
      setStage("detail");
      track("analysis_result_viewed", { mode: "detail_focus", focus: nextFocus });
    } catch (err) {
      setError(err instanceof Error ? err.message : "세부 풀이를 만들지 못했습니다.");
      setStage("focus");
    }
  }

  async function loadPremium() {
    setStage("loading_premium");
    setError(null);
    try {
      const response = await fetch("/api/premium-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          mbti: personalityInput?.mbti ?? null,
          leftPalmFacts: leftPalmFacts ?? null,
          rightPalmFacts: rightPalmFacts ?? null,
          dominantHand: dominantHand ?? null,
        }),
      });
      const data = (await response.json()) as { report?: PremiumReport; error?: string };
      if (!response.ok || !data.report) {
        throw new Error(data.error || "프리미엄 리포트를 만들지 못했습니다.");
      }
      setPremiumReport(data.report);
      setStage("premium");
      track("analysis_result_viewed", { mode: "premium_annual" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "프리미엄 리포트를 만들지 못했습니다.");
      setStage("focus");
    }
  }

  function backToFocus() {
    setStage("focus");
    setFocus(null);
    setFocusedReport(null);
    setError(null);
  }

  return (
    <section className="mt-8 border-t border-border pt-8">
      {stage === "focus" && (
        <>
          <p className="section-eyebrow">사주·손금을 다 봤다면</p>
          <h2 className="mt-2 text-2xl leading-9 font-semibold">이제 더 깊게 볼 차례입니다</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            질문을 계속 이어가기보다, 필요한 분야를 자세히 보거나 1년 전체 흐름을 프리미엄 리포트로 정리합니다.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {SAJU_DETAIL_FOCUS_VALUES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void loadDetail(item)}
                className="min-h-24 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-(--gold)"
              >
                <p className="text-sm font-semibold">{SAJU_FOCUS_LABELS[item]}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{SAJU_FOCUS_SHORT_DESCRIPTIONS[item]}</p>
              </button>
            ))}
          </div>

          <section className="mt-5 rounded-3xl border border-(--gold-soft) bg-card p-5">
            <div className="flex items-center gap-2 text-(--gold)">
              <Crown className="size-4" />
              <p className="section-eyebrow">프리미엄</p>
            </div>
            <h3 className="mt-2 text-xl leading-8 font-semibold">부족한 점·보완법·앞으로 1년을 한 번에</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              무료풀이보다 더 깊게 네 영역을 모두 보고, 부족한 부분을 어떻게 채울지와 좋은 결과를 만들 행동, 앞으로 12개월의 월별 흐름까지 정리합니다.
            </p>
            <Button size="lg" onClick={() => void loadPremium()} className="mt-4 h-14 w-full rounded-full text-base">
              프리미엄 보기
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              결제 연결 전 베타 기간에는 바로 확인할 수 있습니다.
            </p>
          </section>

          <PersonCompareCard me={birthInput} />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </>
      )}

      {stage === "loading_detail" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-medium">선택한 분야를 깊게 정리하고 있어요</p>
          <p className="mt-2 text-sm text-muted-foreground">같은 설명을 반복하지 않고 이 분야에 필요한 내용만 추립니다.</p>
        </div>
      )}

      {stage === "detail" && focus && focusedReport && (
        <>
          <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 상세풀이</p>
          <h2 className="mt-2 text-2xl leading-9 font-semibold">이 분야만 따로 깊게 보면</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{focusedReport.intro}</p>

          <div className="mt-5 space-y-3">
            {focusedReport.sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <p className="mt-2 text-base leading-8 text-muted-foreground">{section.paragraph.text}</p>
              </section>
            ))}
          </div>

          <section className="mt-5 rounded-3xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">전체를 더 깊게 보고 싶다면</p>
            <h3 className="mt-2 text-lg font-semibold">1년 전체 흐름과 보완법까지 이어봅니다</h3>
            <Button size="lg" onClick={() => void loadPremium()} className="mt-4 h-13 w-full rounded-full text-base">
              프리미엄 보기
            </Button>
          </section>

          <PersonCompareCard me={birthInput} />

          <button
            type="button"
            onClick={backToFocus}
            className="mt-5 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            다른 분야 자세히 보기
          </button>
        </>
      )}

      {stage === "loading_premium" && (
        <div className="rounded-3xl border border-(--gold-soft) bg-card p-7 text-center">
          <Crown className="mx-auto size-6 text-(--gold)" />
          <p className="mt-3 font-semibold">프리미엄 1년 리포트를 만들고 있어요</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            원국·대운·세운·월운과 양손 변화가 있으면 함께 묶어 12개월 전체를 정리합니다.
          </p>
        </div>
      )}

      {stage === "premium" && premiumReport && (
        <>
          <PremiumReportView report={premiumReport} />
          <PersonCompareCard me={birthInput} />
          <button
            type="button"
            onClick={backToFocus}
            className="mt-6 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            세부 분야 선택으로 돌아가기
          </button>
        </>
      )}
    </section>
  );
}
