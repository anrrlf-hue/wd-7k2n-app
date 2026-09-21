"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadFinanceManagement,
  type FinanceBaselineSnapshot,
} from "@/lib/finance-management";
import { FINANCE_QUESTIONS, financeQuestion } from "@/lib/finance-question";

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

export default function ManagementPage() {
  const [snapshots, setSnapshots] = useState<FinanceBaselineSnapshot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSnapshots(loadFinanceManagement().snapshots);
    setLoaded(true);
  }, []);

  const latest = snapshots[0] ?? null;
  const concernLabels = useMemo(() => {
    if (!latest) return [];
    return FINANCE_QUESTIONS
      .filter((item) => latest.concerns.includes(item.id))
      .map((item) => item.label);
  }, [latest]);

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
          <Button asChild size="lg" className="mt-6 h-14 w-full rounded-full text-base">
            <Link href="/diagnosis">사주부터 시작하기</Link>
          </Button>
        </div>
      </main>
    );
  }

  const input = latest.financeInput;
  const paid = latest.paidResult;

  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-8">
        <p className="section-eyebrow">내 관리페이지</p>
        <h1 className="mt-2 text-2xl leading-snug font-semibold">
          사주에서 본 나와,
          <br />
          지금의 변화를 이어갑니다
        </h1>

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
            여유자금: {input.emergencyFund === "none" ? "없음" : input.emergencyFund.replace("_", "~")} · 부채: {input.hasDebt ? "있음" : "없음"}
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">지금의 방향</p>
          <p className="mt-3 text-xl leading-8 font-semibold">{paid.conclusion}</p>
        </section>

        <section className="mt-4 rounded-2xl bg-accent p-5 text-accent-foreground">
          <p className="section-eyebrow">이번 30일에 할 것 하나</p>
          <p className="mt-2 text-lg leading-8 font-semibold">{paid.check30.action}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-(--gold)" />
            <p className="font-semibold">30일 후 변화 체크</p>
          </div>
          <p className="mt-2 text-base">다음 확인일 · {dateLabel(latest.checkDueAt)}</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {paid.check30.checkpoints.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="mt-1 size-3.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-sm leading-6 text-muted-foreground">
            30일이 지나면 이 기준과 현재 상태를 비교해, 다음에 무엇을 볼지 다시 정합니다.
          </div>
        </section>

        {snapshots.length > 1 && (
          <details className="mt-4 rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-base font-medium">이전 관리기록 {snapshots.length - 1}건 보기</summary>
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
