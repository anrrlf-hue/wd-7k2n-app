"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearFinanceManagementState,
  loadFinanceManagement,
  saveFinanceRecheck,
  type FinanceBaselineSnapshot,
} from "@/lib/finance-management";
import {
  buildFinanceRecheckResult,
  type ExecutionStatus,
  type FinanceRecheckInput,
  type FinanceRecheckResult,
} from "@/lib/finance-recheck";
import { FINANCE_QUESTIONS, financeQuestion } from "@/lib/finance-question";
import { EMERGENCY_FUND_OPTIONS, surplusKrw } from "@/lib/survey-input";
import { syncFinanceManagementWithAccount } from "@/lib/finance-account-sync";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "overview" | "check" | "result";
type RecheckDraft = Omit<FinanceRecheckInput, "executionStatus"> & {
  executionStatus: ExecutionStatus | "";
};

function manwon(krw: number): string {
  const value = Math.round((krw / 10000) * 10) / 10;
  return `${value.toLocaleString("ko-KR")}만원`;
}

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function birthLabel(snapshot: FinanceBaselineSnapshot): string {
  const birth = snapshot.birthInput;
  const time = birth.hour === null
    ? "출생시간 모름"
    : `${String(birth.hour).padStart(2, "0")}:${String(birth.minute ?? 0).padStart(2, "0")}`;
  return `${birth.year}년 ${birth.month}월 ${birth.day}일 · ${birth.gender} · ${time}`;
}

function optionLabel(options: Array<{ value: string; label: string }>, value?: string): string {
  return options.find((item) => item.value === value)?.label ?? "미확인";
}

function paidMoney(snapshot: FinanceBaselineSnapshot, key: string): number | undefined {
  const value = snapshot.paidExtraAnswers?.[key];
  return typeof value === "number" ? value * 10000 : undefined;
}

function daysUntil(value: string): number {
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

function moneyInputValue(krw: number | undefined): string {
  if (krw === undefined) return "";
  return String(Math.round((krw / 10000) * 10) / 10);
}

export default function ManagementPage() {
  const [snapshots, setSnapshots] = useState<FinanceBaselineSnapshot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("overview");
  const [draft, setDraft] = useState<RecheckDraft | null>(null);
  const [checkResult, setCheckResult] = useState<FinanceRecheckResult | null>(null);
  const [accountConfigured, setAccountConfigured] = useState(false);
  const [accountAuthenticated, setAccountAuthenticated] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    const local = loadFinanceManagement();

    syncFinanceManagementWithAccount()
      .then((account) => {
        setAccountConfigured(account.configured);
        setAccountAuthenticated(account.authenticated);
        setAccountEmail(account.user?.email ?? null);
        setSnapshots(account.state.snapshots);
        setSyncError(false);
      })
      .catch(() => {
        // 계정 귀속이 없는 로컬 기록만 안전하게 보여준다.
        // 특정 계정 소유 기록은 인증 확인 실패 시 다른 사람에게 노출하지 않는다.
        setSnapshots(local.ownerUserId ? [] : local.snapshots);
        setSyncError(true);
      })
      .finally(() => {
        setSyncing(false);
        setLoaded(true);
      });
  }, []);

  const latest = snapshots[0] ?? null;
  const concernLabels = useMemo(() => {
    if (!latest) return [];
    return FINANCE_QUESTIONS
      .filter((item) => latest.concerns.includes(item.id))
      .map((item) => item.label);
  }, [latest]);

  function refresh() {
    setSnapshots(loadFinanceManagement().snapshots);
  }

  async function syncAccountNow() {
    setSyncing(true);
    try {
      const account = await syncFinanceManagementWithAccount();
      setAccountConfigured(account.configured);
      setAccountAuthenticated(account.authenticated);
      setAccountEmail(account.user?.email ?? null);
      setSnapshots(account.state.snapshots);
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally {
      setSyncing(false);
    }
  }

  async function signOutAccount() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      clearFinanceManagementState();
      setSnapshots([]);
      setAccountAuthenticated(false);
      setAccountEmail(null);
      setSyncError(false);
    }
  }

  function beginRecheck() {
    if (!latest) return;
    const previous = latest.checks?.[0]?.input;
    const goalPrepared =
      previous?.goalPreparedKrw ??
      latest.financeInput.goalPreparedKrw ??
      paidMoney(latest, "goalPreparedManwon");
    const debtRemaining =
      previous?.debtRemainingKrw ??
      latest.financeInput.debtRemainingKrw ??
      paidMoney(latest, "debtBalanceManwon");

    setDraft({
      executionStatus: "",
      monthlyIncomeKrw: previous?.monthlyIncomeKrw ?? latest.financeInput.monthlyIncomeKrw,
      monthlyFixedCostKrw: previous?.monthlyFixedCostKrw ?? latest.financeInput.monthlyFixedCostKrw,
      monthlyLivingCostKrw: previous?.monthlyLivingCostKrw ?? latest.financeInput.monthlyLivingCostKrw,
      monthlySavingsKrw: previous?.monthlySavingsKrw ?? latest.financeInput.monthlySavingsKrw,
      emergencyFund: previous?.emergencyFund ?? latest.financeInput.emergencyFund,
      goalPreparedKrw: goalPrepared,
      debtRemainingKrw: debtRemaining,
      difficulty: "",
    });
    setMode("check");
  }

  function setMoney(
    key: "monthlyIncomeKrw" | "monthlyFixedCostKrw" | "monthlyLivingCostKrw" | "monthlySavingsKrw" | "goalPreparedKrw" | "debtRemainingKrw",
    raw: string,
  ) {
    if (!draft) return;
    if (raw === "") {
      if (key === "goalPreparedKrw" || key === "debtRemainingKrw") {
        setDraft({ ...draft, [key]: undefined });
      }
      return;
    }
    const value = Math.max(0, Number(raw) * 10000);
    if (!Number.isFinite(value)) return;
    setDraft({ ...draft, [key]: value });
  }

  function submitRecheck() {
    if (!latest || !draft || !draft.executionStatus) return;
    const input: FinanceRecheckInput = {
      ...draft,
      executionStatus: draft.executionStatus,
    };
    const result = buildFinanceRecheckResult(latest, input);
    saveFinanceRecheck(latest.id, input, result);
    setCheckResult(result);
    refresh();
    void syncAccountNow();
    setMode("result");
  }

  if (!loaded) {
    return <main className="journey-surface min-h-screen"><div className="journey-shell py-12" /></main>;
  }

  if (!latest) {
    return (
      <main className="journey-surface min-h-screen">
        <div className="journey-shell py-12">
          <p className="section-eyebrow">내 관리페이지</p>
          <h1 className="mt-3 text-2xl font-semibold">아직 저장된 재무 방향이 없습니다.</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            사주·손금과 현실 재무질문을 완료한 뒤 맞춤 재무 방향을 저장하면 여기서 계속 관리할 수 있어요.
          </p>
          {false && (
            <Button asChild size="lg" className="mt-6 h-14 w-full rounded-full text-base">
              <Link href="/login?next=/management">로그인해서 내 기록 불러오기</Link>
            </Button>
          )}
          <Button
            asChild
            size="lg"
            variant={accountConfigured && !accountAuthenticated ? "outline" : "default"}
            className={(accountConfigured && !accountAuthenticated ? "mt-3" : "mt-6") + " h-14 w-full rounded-full text-base"}
          >
            <Link href="/diagnosis">사주부터 시작하기</Link>
          </Button>
          {syncError && (
            <p className="mt-3 text-xs leading-5 text-destructive">
              계정 확인이 잠시 되지 않았습니다. 다른 계정의 기록을 잘못 보여주지 않기 위해 저장기록을 숨겼습니다.
            </p>
          )}
        </div>
      </main>
    );
  }

  const input = latest.financeInput;
  const paid = latest.paidResult;
  const lastCheck = latest.checks?.[0] ?? null;
  const dueDays = daysUntil(latest.checkDueAt);

  if (mode === "check" && draft) {
    return (
      <main className="journey-surface min-h-screen">
        <div className="journey-shell py-8">
          <p className="section-eyebrow">변화 체크</p>
          <h1 className="mt-2 text-2xl leading-snug font-semibold">처음 정한 방향이 현실에서 어떻게 됐는지 볼게요</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            처음부터 다시 묻지 않습니다. 기존 값을 넣어두었으니 달라진 부분만 수정해주세요.
          </p>

          <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="text-sm text-muted-foreground">이번에 하기로 했던 것</p>
            <p className="mt-2 text-lg leading-8 font-semibold">{lastCheck?.result.nextAction ?? paid.check30.action}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {([
                ["done", "해봤어요"],
                ["partial", "일부 했어요"],
                ["not_done", "못 했어요"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDraft({ ...draft, executionStatus: value })}
                  className={
                    "min-h-12 rounded-xl border px-2 text-sm " +
                    (draft.executionStatus === value
                      ? "border-(--gold) bg-(--gold-soft) font-semibold"
                      : "border-border bg-background")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="section-eyebrow">지금의 숫자</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              그대로라면 수정하지 않아도 됩니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([
                ["monthlyIncomeKrw", "월 소득"],
                ["monthlyFixedCostKrw", "고정지출·상환"],
                ["monthlyLivingCostKrw", "생활비"],
                ["monthlySavingsKrw", "저축·투자"],
              ] as const).map(([key, label]) => (
                <label key={key} className="rounded-xl bg-accent p-3">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={moneyInputValue(draft[key])}
                      onChange={(event) => setMoney(key, event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
                    />
                    <span className="text-xs text-muted-foreground">만원</span>
                  </div>
                </label>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium">바로 쓸 수 있는 여유자금</span>
              <select
                value={draft.emergencyFund}
                onChange={(event) => setDraft({ ...draft, emergencyFund: event.target.value })}
                className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-3"
              >
                {EMERGENCY_FUND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {latest.focusedQuestion === "goal" && (
              <label className="mt-4 block rounded-xl bg-accent p-3">
                <span className="text-sm font-medium">현재 목표 준비금</span>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={moneyInputValue(draft.goalPreparedKrw)}
                    onChange={(event) => setMoney("goalPreparedKrw", event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
                    placeholder="현재 금액"
                  />
                  <span className="text-xs text-muted-foreground">만원</span>
                </div>
              </label>
            )}

            {input.hasDebt && draft.debtRemainingKrw !== undefined && (
              <label className="mt-4 block rounded-xl bg-accent p-3">
                <span className="text-sm font-medium">현재 남은 부채</span>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={moneyInputValue(draft.debtRemainingKrw)}
                    onChange={(event) => setMoney("debtRemainingKrw", event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
                  />
                  <span className="text-xs text-muted-foreground">만원</span>
                </div>
              </label>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <label>
              <span className="text-sm font-medium">실행하면서 가장 어려웠던 점이 있나요?</span>
              <textarea
                value={draft.difficulty ?? ""}
                onChange={(event) => setDraft({ ...draft, difficulty: event.target.value })}
                placeholder="없으면 비워두셔도 됩니다."
                className="mt-2 min-h-24 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm leading-6 outline-none"
              />
            </label>
          </section>

          <Button
            size="lg"
            disabled={!draft.executionStatus}
            onClick={submitRecheck}
            className="mt-6 h-14 w-full rounded-full text-base"
          >
            처음과 지금 비교하기
          </Button>
          <button
            type="button"
            onClick={() => setMode("overview")}
            className="mt-4 min-h-11 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            관리페이지로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  if (mode === "result" && draft && checkResult) {
    const beforeSurplus = surplusKrw(input);
    const nowSurplus = surplusKrw(draft);

    return (
      <main className="journey-surface min-h-screen">
        <div className="journey-shell py-8">
          <p className="section-eyebrow">변화 체크 결과</p>
          <h1 className="mt-2 text-2xl leading-snug font-semibold">{checkResult.headline}</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{checkResult.summary}</p>

          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <p className="section-eyebrow">처음 vs 지금</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-accent p-4">
                <p className="text-xs text-muted-foreground">처음 남는 월 금액</p>
                <p className="mt-1 text-lg font-semibold">{manwon(beforeSurplus)}</p>
              </div>
              <div className="rounded-xl bg-accent p-4">
                <p className="text-xs text-muted-foreground">지금 남는 월 금액</p>
                <p className="mt-1 text-lg font-semibold">{manwon(nowSurplus)}</p>
              </div>
              <div className="rounded-xl bg-accent p-4">
                <p className="text-xs text-muted-foreground">처음 저축·투자</p>
                <p className="mt-1 text-lg font-semibold">{manwon(input.monthlySavingsKrw)}</p>
              </div>
              <div className="rounded-xl bg-accent p-4">
                <p className="text-xs text-muted-foreground">지금 저축·투자</p>
                <p className="mt-1 text-lg font-semibold">{manwon(draft.monthlySavingsKrw)}</p>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">달라진 점</p>
            <ul className="mt-3 space-y-2">
              {checkResult.changed.map((item) => (
                <li key={item} className="flex gap-2 text-base leading-7">
                  <CheckCircle2 className="mt-1.5 size-4 shrink-0 text-(--gold)" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="section-eyebrow">유지할 것</p>
            <p className="mt-2 text-base leading-7">{checkResult.keep}</p>
          </section>

          <section className="mt-4 rounded-2xl bg-accent p-5 text-accent-foreground">
            <p className="section-eyebrow">다음 30일 한 가지</p>
            <p className="mt-2 text-lg leading-8 font-semibold">{checkResult.nextAction}</p>
          </section>

          <Button
            size="lg"
            onClick={() => {
              setMode("overview");
              setCheckResult(null);
              setDraft(null);
            }}
            className="mt-6 h-14 w-full rounded-full text-base"
          >
            관리페이지에서 이어서 보기
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-8">
        <p className="section-eyebrow">내 관리페이지</p>
        <h1 className="mt-2 text-2xl leading-snug font-semibold">
          사주에서 본 나와,
          <br />
          지금의 변화를 이어갑니다
        </h1>

        {accountConfigured && accountAuthenticated && (
          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            {accountAuthenticated ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">계정에 관리기록 저장 중</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {accountEmail ?? "로그인된 계정"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void syncAccountNow()}
                    disabled={syncing}
                    className="min-h-10 rounded-full border border-border px-3 text-xs"
                  >
                    {syncing ? "동기화 중" : "지금 동기화"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void signOutAccount()}
                  className="mt-3 min-h-10 text-xs text-muted-foreground underline underline-offset-4"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold">다른 기기에서도 이어보려면 로그인하세요</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  로그인하면 현재 관리기록을 계정에 옮겨 휴대폰이나 다른 PC에서도 이어볼 수 있습니다.
                </p>
                <Button asChild size="lg" className="mt-3 h-12 w-full rounded-full text-sm">
                  <Link href="/login?next=/management">로그인하고 관리기록 저장하기</Link>
                </Button>
              </div>
            )}
            {syncError && (
              <p className="mt-2 text-xs text-destructive">계정 동기화가 잠시 되지 않았습니다. 현재 브라우저 기록은 그대로 유지됩니다.</p>
            )}
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">내 기본정보</p>
          <p className="mt-2 text-sm text-muted-foreground">{birthLabel(latest)}</p>
          {latest.sajuSummary && <p className="mt-3 text-base leading-7">{latest.sajuSummary}</p>}
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="section-eyebrow">처음 가지고 들어온 고민</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {concernLabels.map((label) => (
              <span key={label} className="rounded-full border border-border px-3 py-1.5 text-sm">
                {label}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">이번에 먼저 본 고민</p>
          <p className="mt-1 text-base font-semibold">{financeQuestion(latest.focusedQuestion).paywallTitle}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <p className="section-eyebrow">결제 당시 내 상태 · {dateLabel(latest.createdAt)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-accent p-3">
              <p className="text-muted-foreground">월 소득</p>
              <p className="mt-1 font-semibold">{manwon(input.monthlyIncomeKrw)}</p>
            </div>
            <div className="rounded-xl bg-accent p-3">
              <p className="text-muted-foreground">고정지출·상환</p>
              <p className="mt-1 font-semibold">{manwon(input.monthlyFixedCostKrw)}</p>
            </div>
            <div className="rounded-xl bg-accent p-3">
              <p className="text-muted-foreground">생활비</p>
              <p className="mt-1 font-semibold">{manwon(input.monthlyLivingCostKrw)}</p>
            </div>
            <div className="rounded-xl bg-accent p-3">
              <p className="text-muted-foreground">저축·투자</p>
              <p className="mt-1 font-semibold">{manwon(input.monthlySavingsKrw)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            여유자금: {optionLabel(EMERGENCY_FUND_OPTIONS, input.emergencyFund)} · 부채: {input.hasDebt ? "있음" : "없음"}
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">지금의 방향</p>
          <p className="mt-3 text-xl leading-8 font-semibold">{lastCheck?.result.headline ?? paid.conclusion}</p>
          {lastCheck && <p className="mt-3 text-sm leading-6 text-muted-foreground">{lastCheck.result.summary}</p>}
        </section>

        <section className="mt-4 rounded-2xl bg-accent p-5 text-accent-foreground">
          <p className="section-eyebrow">이번 30일에 할 것 하나</p>
          <p className="mt-2 text-lg leading-8 font-semibold">{lastCheck?.result.nextAction ?? paid.check30.action}</p>
        </section>

        {lastCheck && (
          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="section-eyebrow">최근 변화 체크 · {dateLabel(lastCheck.checkedAt)}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {lastCheck.result.changed.slice(0, 3).map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-(--gold)" />
            <p className="font-semibold">다음 변화 체크</p>
          </div>
          <p className="mt-2 text-base">
            {dateLabel(latest.checkDueAt)}
            <span className="ml-2 text-sm text-muted-foreground">
              {dueDays > 0 ? `· ${dueDays}일 후` : "· 지금 확인할 때예요"}
            </span>
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {(lastCheck?.result.nextCheckpoints ?? paid.check30.checkpoints).map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-1 size-3.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button size="lg" onClick={beginRecheck} className="mt-5 h-13 w-full rounded-full text-base">
            {lastCheck ? "다시 변화 체크하기" : "30일 변화 체크하기"}
          </Button>
        </section>

        {snapshots.length > 1 && (
          <details className="mt-4 rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-base font-medium">이전 상담기록 {snapshots.length - 1}건 보기</summary>
            <div className="mt-3 space-y-2">
              {snapshots.slice(1).map((snapshot) => (
                <div key={snapshot.id} className="flex items-center justify-between rounded-xl bg-accent p-3">
                  <div>
                    <p className="text-sm font-medium">{dateLabel(snapshot.createdAt)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{financeQuestion(snapshot.focusedQuestion).label}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </details>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          현재 관리기록은 이 브라우저에만 저장됩니다. 계정 저장은 실제 결제·로그인 연결 단계에서 붙입니다.
        </p>
      </div>
    </main>
  );
}
