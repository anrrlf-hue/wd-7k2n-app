"use client";

import { CalendarDays, Crown, Sparkles } from "lucide-react";
import type { PremiumReport } from "@/lib/premium-report";

export function PremiumReportView({ report }: { report: PremiumReport }) {
  const monthDomains = report.focus === "overall" ? report.domains : report.domains.filter((domain) => domain.key === report.focus);
  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)">
          <Crown className="size-4" />
          <p className="section-eyebrow">프리미엄 리포트</p>
        </div>
        <h2 className="mt-2 text-2xl leading-9 font-semibold">{report.title}</h2>
        <p className="mt-3 text-base leading-8 text-muted-foreground">{report.summary}</p>
        {report.freeSummary && <p className="mt-3 border-t border-border pt-3 text-xs leading-6 text-muted-foreground"><span className="font-semibold">무료 풀이 한 줄 · 해석 가설: </span>{report.freeSummary}</p>}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="section-eyebrow">이번 계획의 우선순위</p>
        <div className="mt-3 space-y-3">
          {report.actionPlan.map((item, index) => (
            <div key={item.title} className="rounded-2xl bg-accent p-4">
              <p className="text-xs font-semibold text-(--gold)">0{index + 1}</p>
              <h3 className="mt-1 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-3xl border border-(--gold-soft) bg-card p-5">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center gap-2 text-(--gold)">
            <Sparkles className="size-4" />
            <p className="section-eyebrow">필요할 때 더할 보완 습관</p>
          </div>
          <h3 className="mt-2 text-xl font-semibold">현재 과제에 맞는 습관 하나만 고르기</h3>
        </summary>
        <details className="mt-4 rounded-xl bg-accent p-3">
          <summary className="cursor-pointer text-sm">보완 습관을 고른 해석 근거</summary>
          {report.corePatterns.map((text) => <p key={text} className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>)}
        </details>
        <div className="mt-4 space-y-4">
          {report.balance.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border p-4">
              <h4 className="font-semibold">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.whatItMeans}</p>
              <div className="mt-3 rounded-xl bg-accent p-3">
                <p className="text-xs font-semibold text-(--gold)">이렇게 채워보세요</p>
                <p className="mt-1 text-sm leading-6">{item.howToFill}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">확인할 변화:</span> {item.goodResult}
              </p>
            </article>
          ))}
        </div>
      </details>

      <section>
        <p className="section-eyebrow">분야별 선택 근거와 2주 실험</p>
        <div className="mt-3 space-y-4">
          {report.domains.map((domain) => (
            <details key={domain.key} open={domain.key === report.focus} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer list-none">
                <p className="text-xs font-semibold text-(--gold)">{domain.label}</p>
                <h3 className="mt-1 text-lg font-semibold">{domain.headline}</h3>
                <p className="mt-2 text-xs text-muted-foreground">눌러서 자세히 보기</p>
              </summary>
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {domain.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-8 text-muted-foreground">{paragraph}</p>
                ))}
                <p className="text-sm leading-7"><strong>2주 실험: </strong>{domain.experiment}</p>
                <p className="text-sm leading-7"><strong>확인 기준: </strong>{domain.checkpoint}</p>
                <p className="text-sm leading-7"><strong>계획을 바꿀 조건: </strong>{domain.changeWhen}</p>
                <p className="text-sm leading-7 text-muted-foreground"><strong>월별 활용: </strong>{domain.timing}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {report.palm && (
        <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">양손까지 함께 반영</p>
          <h3 className="mt-2 text-xl font-semibold">타고난 나와 지금의 차이</h3>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{report.palm.summary}</p>
          <div className="mt-4 space-y-3">
            {report.palm.items.map((item) => (
              <div key={item.title} className="rounded-xl bg-accent p-4">
                <p className="text-sm font-semibold text-(--gold)">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)">
          <CalendarDays className="size-4" />
          <p className="section-eyebrow">앞으로 12개월</p>
        </div>
        <h3 className="mt-2 text-xl font-semibold">
          {report.annual.startLabel} ~ {report.annual.endLabel}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          같은 분야를 세로로 비교하세요. 실험은 작은 시도, 유지는 효과가 있던 습관 이어가기, 점검은 기록 돌아보기입니다. 좋고 나쁜 달을 뜻하지 않습니다. 아래 카드에서는 {report.focus === "overall" ? "네 분야의" : "선택한 관심 분야의"} 과제를 각 단계에 연결합니다. 실제 일정과 기록을 먼저 따르세요.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-center text-xs leading-6">
            <caption className="mb-2 text-left text-muted-foreground">분야별 12개월 행동 비교 · 성공 확률이 아닌 상대적 해석</caption>
            <thead><tr><th scope="col">월</th>{report.domains.map((domain) => <th key={domain.key} scope="col" className="px-1">{domain.label}</th>)}</tr></thead>
            <tbody>{report.annual.months.map((month) => (
              <tr key={month.label} className="border-t border-border">
                <th scope="row" className="whitespace-nowrap py-2 font-medium">{month.year}.{month.month}</th>
                {report.domains.map((domain) => <td key={domain.key}>{month.comparisons.find((item) => item.domain === domain.key)?.emphasis}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div className="mt-5 space-y-3">
          {report.annual.months.map((month, monthIndex) => (
            <details key={month.label} className="rounded-2xl border border-border p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{month.label}</p>
                    <p className="mt-1 text-xs text-(--gold)">{monthDomains.map((domain) => `${domain.label} · ${month.comparisons.find((item) => item.domain === domain.key)?.emphasis}`).join(" / ")}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">자세히</span>
                </div>
              </summary>
              <div className="mt-3 grid gap-2 border-t border-border pt-3">
                {monthDomains.map((domain) => {
                  const comparison = month.comparisons.find((item) => item.domain === domain.key)!;
                  const previous = report.annual.months[monthIndex - 1]?.comparisons.find((item) => item.domain === domain.key)?.emphasis;
                  return <div key={domain.key} className="rounded-xl bg-accent p-3">
                    <p className="text-xs font-semibold text-(--gold)">{domain.label} · {previous ? previous === comparison.emphasis ? `지난달과 같은 ${comparison.emphasis}` : `${previous} → ${comparison.emphasis}` : `첫 달 · ${comparison.emphasis}`}</p>
                    <p className="mt-1 text-sm leading-6">{domain.monthlyActions[comparison.emphasis]}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">비교 근거: {comparison.basis}</p>
                  </div>;
                })}
              </div>
            </details>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{report.annual.note}</p>
      </section>

      <p className="text-center text-xs leading-5 text-muted-foreground">{report.note}</p>
    </div>
  );
}
