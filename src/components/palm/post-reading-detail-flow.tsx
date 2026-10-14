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
const TRIAL_STORAGE_KEY = "saju-app:premium-trial:v1";

async function requestTrial(body: string, task: AbortController, action: "verify" | "participate", extra: { trialReceipt?: string; participation?: "native_share" | "clipboard" }) {
  return runWithDeadline(task.signal, 30_000, "참여 확인이 오래 걸려 중단했어요. 다시 시도해주세요.", async signal => {
    const response = await fetch("/api/premium-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(body), trialAction: action, ...extra }), signal });
    const data = await response.json() as { eligible?: boolean; trialReceipt?: string };
    signal.throwIfAborted();
    if (!response.ok || data.eligible !== true) throw new Error("Trial verification failed");
    return data;
  });
}

export function PostReadingDetailFlow({ birthInput, personalityInput, leftPalmFacts, rightPalmFacts, dominantHand, initialReport, onPalmConnectionsVisibleChange }: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmFacts?: PalmFacts | null;
  leftPalmFacts?: PalmFacts | null;
  rightPalmFacts?: PalmFacts | null;
  dominantHand?: RealityDominantHand | null;
  initialReport?: PremiumReport | null;
  onPalmConnectionsVisibleChange?: (visible: boolean) => void;
}) {
  const [stage, setStage] = useState<Stage>("ready");
  const [premiumReport, setPremiumReport] = useState<StoredPremiumReport | null>(null);
  const [previousReport, setPreviousReport] = useState<StoredPremiumReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const tasks = useRef(new PalmTaskSlot());
  const [refreshRequested, setRefreshRequested] = useState(false);
  const [trialState, setTrialState] = useState<"checking" | "locked" | "eligible">("checking");
  const [trialReceipt, setTrialReceipt] = useState<string | null>(null);
  const [trialIdentity, setTrialIdentity] = useState<string | null>(null);
  const activeIdentity = useRef<string | null>(null);
  const body = JSON.stringify({ ...birthInput, mbti: personalityInput?.mbti ?? null,
    leftPalmFacts: leftPalmFacts ?? null, rightPalmFacts: rightPalmFacts ?? null, dominantHand: dominantHand ?? null });
  const currentMonth = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "Asia/Seoul" }).format(new Date());
  const identity = body;
  const eligible = trialState === "eligible" && trialIdentity === identity;

  useEffect(() => {
    onPalmConnectionsVisibleChange?.(stage === "premium" && isRenderablePremiumReport(premiumReport) && Boolean(premiumReport.palmConnections?.length));
  }, [stage, premiumReport, onPalmConnectionsVisibleChange]);

  useEffect(() => {
    const slot = tasks.current;
    let mounted = true;
    activeIdentity.current = identity;
    queueMicrotask(() => {
      if (!mounted) return;
      setStage("ready"); setPremiumReport(null); setPreviousReport(null); setError(null);
      setRefreshRequested(false);
      setTrialState("checking"); setTrialReceipt(null); setTrialIdentity(null);
      let prior: StoredPremiumReport | null = null;
      let previous: StoredPremiumReport | null = null;
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
        if ((saved?.identity === identity || saved?.identity?.endsWith(`:${identity}`)) && isStoredPremiumReport(saved.report)) {
          prior = saved.report;
          if (isStoredPremiumReport(saved.previousReport)) previous = saved.previousReport;
        }
      } catch { /* Storage may be unavailable; the report still works. */ }
      if (isCurrentPremiumReport(initialReport)) {
        // Prepare the annual reading while keeping the palm reading first.
        previous = prior && JSON.stringify(prior) !== JSON.stringify(initialReport) ? prior : previous;
        setPremiumReport(initialReport); setPreviousReport(previous);
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, report: initialReport, previousReport: previous })); } catch { /* Optional storage. */ }
      } else if (prior) {
        setPremiumReport(prior); setPreviousReport(previous);
      }
      let savedTrial: { identity?: string; receipt?: string } | null = null;
      try { savedTrial = JSON.parse(sessionStorage.getItem(TRIAL_STORAGE_KEY) || "null"); } catch { /* Optional storage. */ }
      if (savedTrial?.identity !== identity || typeof savedTrial.receipt !== "string") { setTrialState("locked"); return; }
      const receipt = savedTrial.receipt;
      const task = slot.begin();
      void requestTrial(body, task, "verify", { trialReceipt: receipt }).then(() => {
        if (!mounted || !slot.isCurrent(task)) return;
        setTrialReceipt(receipt); setTrialIdentity(identity); setTrialState("eligible");
      }).catch(() => {
        if (!mounted || !slot.isCurrent(task)) return;
        setTrialState("locked"); setError("이 풀이의 무료 체험 참여를 다시 확인해주세요. 공유 또는 링크 복사로 참여할 수 있어요.");
      }).finally(() => slot.finish(task));
    });
    let interrupted = false;
    const onHide = () => { interrupted = slot.hasActive(); slot.cancel(); };
    const onRestore = (event: PageTransitionEvent) => {
      if (event.persisted && interrupted) {
        interrupted = false; setStage("ready"); setTrialState(state => state === "checking" ? "locked" : state); setError("화면을 떠나 리포트 요청이 중단됐어요. 입력은 유지되어 다시 볼 수 있습니다.");
      }
    };
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onRestore);
    return () => { mounted = false; activeIdentity.current = null; slot.cancel(); window.removeEventListener("pagehide", onHide); window.removeEventListener("pageshow", onRestore); };
  }, [body, identity, initialReport]);

  function persist(report: StoredPremiumReport, previous: StoredPremiumReport | null) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ identity, report, previousReport: previous })); } catch { /* Storage is optional. */ }
  }

  async function registerParticipation(participation: "native_share" | "clipboard") {
    if (activeIdentity.current !== identity) return;
    const task = tasks.current.begin();
    setError(null); setTrialState("checking");
    let receipt: string | null = null;
    try {
      const data = await requestTrial(body, task, "participate", { participation });
      if (!tasks.current.isCurrent(task) || activeIdentity.current !== identity) return;
      if (typeof data.trialReceipt !== "string") throw new Error("Trial receipt missing");
      receipt = data.trialReceipt;
      setTrialReceipt(receipt); setTrialIdentity(identity); setTrialState("eligible");
      try { sessionStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify({ identity, receipt })); } catch { /* The current screen still works. */ }
    } catch (err) {
      if (tasks.current.isCurrent(task)) setTrialState("locked");
      throw err;
    } finally { tasks.current.finish(task); }
    if (receipt && activeIdentity.current === identity) await loadPremium(false, receipt);
  }

  async function loadPremium(refresh = false, verifiedReceipt?: string) {
    const receipt = verifiedReceipt ?? trialReceipt;
    if (!receipt || (!eligible && !verifiedReceipt)) { setError("링크 공유 또는 복사로 이벤트에 참여한 뒤 무료 체험을 열 수 있어요."); return; }
    if (premiumReport && !refresh && !refreshRequested) { setStage("premium"); return; }
    setRefreshRequested(refresh || refreshRequested);
    const task = tasks.current.begin();
    setStage("loading"); setError(null); setReceiving(false);
    try {
      const report = await runWithDeadline(task.signal, 30_000, "리포트 수신이 30초를 넘었어요. 입력은 유지되어 다시 시도할 수 있습니다.", async signal => {
        const response = await fetch("/api/premium-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(body), trialReceipt: receipt }), signal });
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
      console.warn("[premium-report] request failed", err);
      const preserved = leftPalmFacts || rightPalmFacts ? "입력과 완료된 손 분석은 유지되며 다시 시도할 수 있습니다." : "입력한 생년월일은 유지되며 다시 시도할 수 있습니다.";
      setError(`${err instanceof Error && err.name === "TimeoutError" ? "리포트 받기가 30초를 넘어 중단했어요." : "리포트를 불러오지 못했어요."} ${preserved}`); setStage("ready");
    } finally { tasks.current.finish(task); }
  }
  function cancel() {
    tasks.current.cancel(); setRefreshRequested(false); setStage("ready"); setError("요청을 취소했어요. 입력한 정보와 이미 받은 풀이는 그대로 남아 있습니다.");
  }

  return <section className="mt-8 border-t border-border pt-8">
    {stage === "premium" && <AnalyticsView event="premium_report_viewed" />}
    {stage === "ready" && <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2 text-(--gold)"><Crown className="size-4" /><p className="section-eyebrow">프리미엄</p></div>
      <h2 className="mt-2 text-xl leading-8 font-semibold">프리미엄 깊은풀이 · 나의 12개월</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">무료 요약에서 더 나아가, 관계·재물·직장에서 같은 기질이 다르게 드러나는 장면과 구체적인 보완 방법을 읽습니다. 12개월의 흐름을 비교하고, 양손에서 실제로 읽힌 특징이 있으면 사주와 함께 살펴봅니다.</p>
      {eligible && <Button size="lg" onClick={() => void loadPremium()} className="mt-4 h-14 w-full rounded-full text-base">{refreshRequested ? "새 리포트 다시 요청" : premiumReport ? "프리미엄 무료 체험 다시 보기" : "프리미엄 무료 체험 보기"}</Button>}
      {trialState === "checking" && <p role="status" className="mt-3 text-sm">이 풀이의 이벤트 참여를 확인하고 있어요.</p>}
      {!eligible && <ServiceShareCard trial onCompleted={registerParticipation} />}
      {refreshRequested && premiumReport && <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={() => { setRefreshRequested(false); setError(null); setStage("premium"); }}>저장된 리포트 보기</Button>}
      <p className="mt-2 text-center text-xs leading-6 text-muted-foreground">향후 유료로 제공할 깊은풀이를 현재 공유 이벤트 참여 후 무료로 체험할 수 있습니다. 기기 공유창의 정상 완료 또는 링크 복사 성공이 참여 조건이며, 결제는 없습니다.</p>
      <p className="mt-1 text-center text-xs leading-6 text-muted-foreground">이 탭에서 다시 열 수 있어요. 사진 원본은 저장하지 않습니다.</p>
      {error && <p role="alert" className="mt-4 text-sm leading-6 text-destructive">{error}</p>}
    </section>}
    {stage === "loading" && <div className="rounded-3xl border border-(--gold-soft) bg-card p-7 text-center">
      <p role="status" className="font-semibold">{receiving ? "깊은풀이를 받고 있어요" : "나의 연간 깊은풀이를 준비하고 있어요"}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">총운·연애·재물·직장과 12개월 흐름을 함께 불러옵니다.</p>
      <Button variant="outline" onClick={cancel} className="mt-4">리포트 요청 취소</Button>
    </div>}
    {stage === "premium" && premiumReport && eligible && <>
      <p className="text-sm leading-7">이 풀이의 공유 이벤트 참여가 확인되어 무료 체험 중입니다. 공유창 완료·복사 성공을 확인했으며 실제 전달·신규 방문을 확인한 것은 아닙니다.</p>
      {isRenderablePremiumReport(premiumReport) ? <PremiumReportView report={premiumReport} /> : <LegacyPremiumReportView report={premiumReport} />}
      <details className="mt-5 rounded-2xl border border-border p-4 text-sm leading-7">
        <summary className="cursor-pointer">저장해둔 풀이 다시 보기</summary>
        <p>지금 보고 있는 풀이</p>
        <p className="text-muted-foreground">{premiumReport.annual.startLabel} ~ {premiumReport.annual.endLabel}의 보고서입니다. 다시 열어도 문장과 기간은 그대로 유지됩니다.</p>
        {(!isCurrentPremiumReport(premiumReport) || premiumReport.annual.startLabel !== currentMonth) && <Button variant="outline" onClick={() => void loadPremium(true)} className="mt-3 min-h-11">{isCurrentPremiumReport(premiumReport) ? "이번 달부터 새 리포트 만들기" : "새 풀이판으로 리포트 만들기"}</Button>}
        {previousReport && <button type="button" onClick={() => {
          setPremiumReport(previousReport); setPreviousReport(premiumReport); persist(previousReport, premiumReport);
        }} className="mt-3 block min-h-11 underline underline-offset-4">다른 저장본 보기</button>}
      </details>
      <button type="button" onClick={() => setStage("ready")} className="mt-5 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4">프리미엄 접기</button>
    </>}
    {stage !== "loading" && <>{eligible && <ServiceShareCard />}<PersonCompareCard me={birthInput} /></>}
  </section>;
}
