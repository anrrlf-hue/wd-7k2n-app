"use client";

import { CalendarDays, Crown, Sparkles } from "lucide-react";
import type { PremiumReport } from "@/lib/premium-report";
import { buildPremiumAnnualPlan } from "@/lib/premium-annual-plan";

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
            <details id={`premium-domain-${domain.key}`} key={domain.key} open={domain.key === report.focus} className="scroll-mt-5 rounded-2xl border border-border bg-card p-5">
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
          같은 분야를 세로로 비교하세요. 실험은 작은 시도, 유지는 효과가 있던 습관 이어가기, 점검은 기록 돌아보기입니다. 좋고 나쁜 달을 뜻하지 않습니다. 아래에서는 {report.focus === "overall" ? "네 분야의" : "선택한 관심 분야의"} 같은 실행 제안을 한 번씩 묶었습니다. 달이 바뀌어도 실제 일정과 기록을 먼저 따르세요.
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
          {monthDomains.map((domain) => {
            const plan = buildPremiumAnnualPlan(domain, report.annual);
            return (
              <article key={domain.key} className="rounded-2xl border border-border p-4">
                <h3 className="font-semibold">{domain.label} · 연간 실행 흐름</h3>
                <p className="mt-1 text-sm text-muted-foreground">{domain.headline}</p>
                <ol aria-label={`${domain.label}의 기간별 단계`} className="mt-3 flex flex-wrap gap-2">
                  {plan.periods.map((period, index) => (
                    <li key={period.months[0].label} className="rounded-xl bg-accent px-3 py-2 text-xs leading-5">
                      <span className="font-semibold">{index + 1}. {period.emphasis}</span>
                      <span className="block text-muted-foreground">{period.label}</span>
                    </li>
                  ))}
                </ol>
                <a href={`#premium-domain-${domain.key}`} className="mt-3 inline-block text-sm text-(--gold) underline underline-offset-4">2주 실험·점검 기준·계획을 바꿀 조건 함께 보기</a>
                <div className="mt-4 space-y-3">
                  {plan.actions.map((action) => (
                    <div key={action.emphasis} className="rounded-xl bg-accent p-3">
                      <h4 className="text-sm font-semibold">{action.emphasis} · {action.months.length}개월</h4>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.periods.join(" / ")}</p>
                      <p className="mt-2 text-sm leading-6">{action.text}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">해당 월의 계산 근거</summary>
                        <ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
                          {action.months.map((month) => <li key={month.label}><strong>{month.label}:</strong> {month.basis}</li>)}
                        </ul>
                      </details>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{report.annual.note}</p>
      </section>

      <p className="text-center text-xs leading-5 text-muted-foreground">{report.note}</p>
    </div>
  );
}
