"use client";
import { AnalyticsView } from "@/components/analytics-view";
import { useEffect, useRef, useState } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonCompareCard } from "@/components/diagnosis/person-compare-card";
import { PremiumReportView } from "@/components/premium/premium-report-view";
import { LegacyPremiumReportView } from "@/components/premium/legacy-premium-report-view";
import { ServiceShareCard } from "@/components/service-share-card";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { PalmFacts } from "@/lib/palm-facts";
import type { RealityDominantHand } from "@/lib/reality-palm-context";
import type { PremiumReport } from "@/lib/premium-report";
import { PalmTaskSlot, runWithDeadline } from "@/lib/palm-analysis-task";
import { track } from "@/lib/analytics";
import { isCurrentPremiumReport, isRenderablePremiumReport, isStoredPremiumReport, type StoredPremiumReport } from "@/lib/premium-report-validation";

type Stage = "ready" | "loading" | "premium";
const STORAGE_KEY = "saju-app:integrated-premium:v1";

export function PostReadingDetailFlow({ birthInput, personalityInput, leftPalmFacts, rightPalmFacts, dominantHand, onPalmConnectionsVisibleChange }: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmFacts?: PalmFacts | null;
  leftPalmFacts?: PalmFacts | null;
  rightPalmFacts?: PalmFacts | null;
  dominantHand?: RealityDominantHand | null;
  onPalmConnectionsVisibleChange?: (visible: boolean) => void;
}) {
  const [stage, setStage] = useState<Stage>("ready");
  const [premiumReport, setPremiumReport] = useState<StoredPremiumReport | null>(null);
  const [previousReport, setPreviousReport] = useState<StoredPremiumReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const tasks = useRef(new PalmTaskSlot());
  const [refreshRequested, setRefreshRequested] = useState(false);
  const body = JSON.stringify({ ...birthInput, mbti: personalityInput?.mbti ?? null,
    leftPalmFacts: leftPalmFacts ?? null, rightPalmFacts: rightPalmFacts ?? null, dominantHand: dominantHand ?? null });
  const currentMonth = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "Asia/Seoul" }).format(new Date());
  const identity = body;

  useEffect(() => {
    onPalmConnectionsVisibleChange?.(stage === "premium" && isRenderablePremiumReport(premiumReport) && Boolean(premiumReport.palmConnections?.length));
  }, [stage, premiumReport, onPalmConnectionsVisibleChange]);

  useEffect(() => {
    const slot = tasks.current;
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      setStage("ready"); setPremiumReport(null); setPreviousReport(null); setError(null);
      setRefreshRequested(false);
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
        if ((saved?.identity === identity || saved?.identity?.endsWith(`:${identity}`)) && isStoredPremiumReport(saved.report)) {
          setPremiumReport(saved.report); setStage("premium");
          if (isStoredPremiumReport(saved.previousReport)) setPreviousReport(saved.previousReport);
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

  function persist(report: StoredPremiumReport, previous: StoredPremiumReport | null) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, report, previousReport: previous })); } catch { /* Storage is optional. */ }
  }

  async function loadPremium(refresh = false) {
    if (premiumReport && !refresh && !refreshRequested) { setStage("premium"); return; }
    setRefreshRequested(refresh || refreshRequested);
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
      setPreviousReport(premiumReport); setPremiumReport(report); setStage("premium");
      persist(report, premiumReport);
      setRefreshRequested(false);
      track("analysis_result_viewed", { mode: "premium_annual" });
    } catch (err) {
      if (!tasks.current.isCurrent(task)) return;
      setError(err instanceof Error ? err.message : "리포트를 불러오지 못했어요."); setStage("ready");
    } finally { tasks.current.finish(task); }
  }
  function cancel() {
    tasks.current.cancel(); setRefreshRequested(false); setStage("ready"); setError("요청을 취소했어요. 사주와 손금 결과는 그대로 남아 있습니다.");
  }

  return <section className="mt-8 border-t border-border pt-8">
    {stage === "premium" && <AnalyticsView event="premium_report_viewed" />}
    {stage === "ready" && <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2 text-(--gold)"><Crown className="size-4" /><p className="section-eyebrow">프리미엄</p></div>
      <h2 className="mt-2 text-xl leading-8 font-semibold">총운부터 연애·재물·직장까지, 한 번에</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">내 성향이 관계와 돈, 일에서 어떻게 드러나는지, 앞으로 12개월에는 어떤 흐름으로 읽히는지 함께 살펴보세요.</p>
      <Button size="lg" onClick={() => void loadPremium()} className="mt-4 h-14 w-full rounded-full text-base">{refreshRequested ? "새 리포트 다시 요청" : premiumReport ? "프리미엄 다시 보기" : "프리미엄 보기"}</Button>
      {refreshRequested && premiumReport && <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={() => { setRefreshRequested(false); setError(null); setStage("premium"); }}>저장된 리포트 보기</Button>}
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
      <div className="rounded-2xl border border-border p-4 text-sm leading-7">
        <p>{isCurrentPremiumReport(premiumReport) ? "근거 연결 개정판 · 저장된 원문" : "이전 풀이판 · 저장된 원문"}</p>
        <p className="text-muted-foreground">{premiumReport.annual.startLabel} ~ {premiumReport.annual.endLabel}의 보고서입니다. 다시 열어도 문장과 기간은 그대로 유지됩니다.</p>
        {(!isCurrentPremiumReport(premiumReport) || premiumReport.annual.startLabel !== currentMonth) && <Button variant="outline" onClick={() => void loadPremium(true)} className="mt-3 min-h-11">{isCurrentPremiumReport(premiumReport) ? "이번 달부터 새 리포트 만들기" : "새 풀이판으로 리포트 만들기"}</Button>}
        {previousReport && <button type="button" onClick={() => {
          setPremiumReport(previousReport); setPreviousReport(premiumReport); persist(previousReport, premiumReport);
        }} className="mt-3 block min-h-11 underline underline-offset-4">다른 저장본 보기</button>}
      </div>
      {isRenderablePremiumReport(premiumReport) ? <PremiumReportView report={premiumReport} /> : <LegacyPremiumReportView report={premiumReport} />}
      <button type="button" onClick={() => setStage("ready")} className="mt-5 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4">프리미엄 접기</button>
    </>}
    {stage !== "loading" && <><ServiceShareCard /><PersonCompareCard me={birthInput} /></>}
  </section>;
}
