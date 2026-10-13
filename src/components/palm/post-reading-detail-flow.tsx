"use client";
import { AnalyticsView } from "@/components/analytics-view";
import { useEffect, useRef, useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonCompareCard } from "@/components/diagnosis/person-compare-card";
import { PremiumReportView } from "@/components/premium/premium-report-view";
import { ServiceShareCard } from "@/components/service-share-card";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { PalmFacts } from "@/lib/palm-facts";
import type { RealityDominantHand } from "@/lib/reality-palm-context";
import type { PremiumReport } from "@/lib/premium-report";
import { PalmTaskSlot, runWithDeadline } from "@/lib/palm-analysis-task";
import { track } from "@/lib/analytics";
import { isRenderablePremiumReport } from "@/lib/premium-report-validation";

type Stage = "ready" | "loading" | "premium";
const STORAGE_KEY = "saju-app:integrated-premium:v1";

export function PostReadingDetailFlow({ birthInput, personalityInput, leftPalmFacts, rightPalmFacts, dominantHand }: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmFacts?: PalmFacts | null;
  leftPalmFacts?: PalmFacts | null;
  rightPalmFacts?: PalmFacts | null;
  dominantHand?: RealityDominantHand | null;
}) {
  const [stage, setStage] = useState<Stage>("ready");
  const [premiumReport, setPremiumReport] = useState<PremiumReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const tasks = useRef(new PalmTaskSlot());
  const body = JSON.stringify({ ...birthInput, mbti: personalityInput?.mbti ?? null,
    leftPalmFacts: leftPalmFacts ?? null, rightPalmFacts: rightPalmFacts ?? null, dominantHand: dominantHand ?? null });
  const month = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Seoul" }).format(new Date());
  const identity = `${month}:${body}`;

  useEffect(() => {
    const slot = tasks.current;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setStage("ready"); setPremiumReport(null); setError(null);
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
        if (saved?.identity === identity && isRenderablePremiumReport(saved.report)) {
          setPremiumReport(saved.report); setStage("premium");
        }
      } catch { /* Storage may be unavailable; the report still works. */ }
    });
    let interrupted = false;
    const onHide = () => { interrupted = slot.hasActive(); slot.cancel(); };
    const onRestore = (event: PageTransitionEvent) => {
      if (event.persisted && interrupted) {
        interrupted = false; setStage("ready"); setError("화면을 떠나 리포트 요청이 중단됐어요. 입력은 유지되어 다시 볼 수 있습니다.");
      }
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onRestore);
    return () => { mounted = false; slot.cancel(); window.removeEventListener("pagehide", onHide); window.removeEventListener("pageshow", onRestore); };
  }, [identity]);

  async function loadPremium() {
    if (premiumReport) { setStage("premium"); return; }
    const task = tasks.current.begin();
    setStage("loading"); setError(null); setReceiving(false);
    try {
      const report = await runWithDeadline(task.signal, 30_000, "리포트 수신이 30초를 넘었어요. 입력은 유지되어 다시 시도할 수 있습니다.", async signal => {
        const response = await fetch("/api/premium-report", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal });
        signal.throwIfAborted();
        if (tasks.current.isCurrent(task)) setReceiving(true);
        const data = await response.json().catch(() => {
          signal.throwIfAborted();
          throw new Error("리포트 본문을 읽지 못했어요. 입력은 유지되어 다시 시도할 수 있습니다.");
        }) as { report?: PremiumReport; error?: string };
        signal.throwIfAborted();
        if (!response.ok || !isRenderablePremiumReport(data.report)) throw new Error(data.error || "리포트 내용을 확인하지 못했어요. 입력은 유지되어 다시 시도할 수 있습니다.");
        return data.report;
      });
      if (!tasks.current.isCurrent(task)) return;
      setPremiumReport(report); setStage("premium");
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, report })); } catch { /* Quota/privacy mode must not hide a successful report. */ }
      track("analysis_result_viewed", { mode: "premium_annual" });
    } catch (err) {
      if (!tasks.current.isCurrent(task)) return;
      setError(err instanceof Error ? err.message : "리포트를 불러오지 못했어요."); setStage("ready");
    } finally { tasks.current.finish(task); }
  }
  function cancel() {
    tasks.current.cancel(); setStage("ready"); setError("요청을 취소했어요. 사주와 손금 결과는 그대로 남아 있습니다.");
  }

  return <section className="mt-8 border-t border-border pt-8">
    {stage === "premium" && <AnalyticsView event="premium_report_viewed" />}
    {stage === "ready" && <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2 text-(--gold)"><Crown className="size-4" /><p className="section-eyebrow">프리미엄</p></div>
      <h2 className="mt-2 text-xl leading-8 font-semibold">총운부터 연애·재물·직장까지, 한 번에</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">내 사주에서 이 풀이가 나온 이유, 생활 속 행동 예시, 앞으로 12개월의 흐름을 한 리포트로 읽어보세요.</p>
      <Button size="lg" onClick={() => void loadPremium()} className="mt-4 h-14 w-full rounded-full text-base">{premiumReport ? "프리미엄 다시 보기" : "프리미엄 보기"}</Button>
      <p className="mt-2 text-center text-xs leading-6 text-muted-foreground">현재 베타 기간에는 무료로 바로 볼 수 있습니다.</p>
      <p className="mt-1 text-center text-xs leading-6 text-muted-foreground">같은 탭에서 다시 열 수 있어요. 탭을 닫으면 보관이 끝납니다.</p>
      {error && <p role="alert" className="mt-4 text-sm leading-6 text-destructive">{error}</p>}
    </section>}
    {stage === "loading" && <div className="rounded-3xl border border-(--gold-soft) bg-card p-7 text-center">
      <p role="status" className="font-semibold">{receiving ? "연결됐어요. 리포트 본문을 받고 있어요" : "통합 연간 리포트를 요청했어요. 응답을 기다리고 있습니다"}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">총운·연애·재물·직장과 12개월 흐름을 함께 불러옵니다.</p>
      <Button variant="outline" onClick={cancel} className="mt-4">리포트 요청 취소</Button>
    </div>}
    {stage === "premium" && premiumReport && <>
      <PremiumReportView report={premiumReport} />
      <button type="button" onClick={() => setStage("ready")} className="mt-5 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4">프리미엄 접기</button>
    </>}
    {stage !== "loading" && <><ServiceShareCard /><PersonCompareCard me={birthInput} /></>}
  </section>;
}
