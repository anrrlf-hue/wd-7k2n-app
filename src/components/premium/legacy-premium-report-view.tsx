"use client";

import { CalendarDays, Crown } from "lucide-react";
import type { LegacyPremiumReport } from "@/lib/legacy-premium-report";
import { buildPremiumAnnualPlan } from "@/lib/premium-annual-plan";

const STAGE_LABEL = { 실험: "해볼 일", 유지: "이어갈 일", 점검: "돌아볼 일" } as const;

export function LegacyPremiumReportView({ report }: { report: LegacyPremiumReport }) {
  const mainDomains = report.domains.filter((domain) => domain.key !== "wellbeing");
  return (
    <div id="premium-report" className="mt-5 space-y-5">
      <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)"><Crown className="size-4" /><p className="section-eyebrow">프리미엄 리포트</p></div>
        <h2 className="mt-2 text-2xl leading-9 font-semibold">{report.title}</h2>
        <p className="mt-3 text-base leading-8">{report.summary}</p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">{report.note}</p>
        <nav aria-label="리포트 목차" className="mt-4 flex flex-wrap gap-3 text-sm text-(--gold)">
          <a href="#premium-overall">총운</a>
          {mainDomains.map(domain => <a key={domain.key} href={`#premium-domain-${domain.key}`}>{domain.label}</a>)}
          <a href="#premium-annual">연간·월별 흐름</a>
        </nav>
      </section>

      <section id="premium-overall" className="scroll-mt-5 rounded-3xl border border-border bg-card p-5">
        <p className="section-eyebrow">총운</p>
        <h3 className="mt-2 text-xl font-semibold">내 강점을 생활에서 쓰는 방법</h3>
        {report.corePatterns.map(text => <p key={text} className="mt-3 text-base leading-8 text-muted-foreground">{text}</p>)}
        <details className="mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium">보완하면 좋을 생활 습관</summary>
          {report.balance.map(item => <article key={item.title} className="mt-4 rounded-2xl bg-accent p-4">
            <h4 className="font-semibold">{item.title}</h4>
            <p className="mt-2 text-sm leading-7">{item.howToFill}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.whatItMeans}</p>
          </article>)}
        </details>
      </section>

      {mainDomains.map(domain => <section id={`premium-domain-${domain.key}`} key={domain.key} className="scroll-mt-5 rounded-3xl border border-border bg-card p-5">
        <p className="section-eyebrow">{domain.label}</p>
        <h3 className="mt-2 text-xl font-semibold">{domain.headline}</h3>
        <p className="mt-3 text-base leading-8 text-muted-foreground">{domain.paragraphs[0]}</p>
        <div className="mt-4 rounded-2xl bg-accent p-4"><h4 className="text-sm font-semibold text-(--gold)">이렇게 해보세요</h4><p className="mt-2 text-base leading-7">{domain.experiment}</p></div>
        <details className="mt-4 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium">이 풀이의 근거와 상황이 달라졌을 때</summary>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{domain.paragraphs[1]}</p>
          <p className="mt-3 text-sm leading-7">{domain.changeWhen}</p>
        </details>
      </section>)}

      <section id="premium-annual" className="scroll-mt-5 rounded-3xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)"><CalendarDays className="size-4" /><p className="section-eyebrow">앞으로 12개월</p></div>
        <h3 className="mt-2 text-xl font-semibold">{report.annual.startLabel} ~ {report.annual.endLabel}</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">앞의 조언을 언제 떠올려볼지 정리했습니다. 같은 분야를 세로로 비교해보세요. 좋고 나쁜 달이나 성공 확률을 뜻하지 않습니다.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-center text-xs leading-6">
            <caption className="mb-2 text-left text-muted-foreground">분야별 월간 흐름</caption>
            <thead><tr><th scope="col">월</th>{report.domains.map(domain => <th key={domain.key} scope="col" className="px-1">{domain.label}</th>)}</tr></thead>
            <tbody>{report.annual.months.map(month => <tr key={month.label} className="border-t border-border">
              <th scope="row" className="whitespace-nowrap py-2 font-medium">{month.year}.{month.month}</th>
              {report.domains.map(domain => { const emphasis = month.comparisons.find(item => item.domain === domain.key)?.emphasis; return <td key={domain.key}>{emphasis && STAGE_LABEL[emphasis]}</td>; })}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 space-y-4">
          {report.domains.map(domain => {
            const plan = buildPremiumAnnualPlan(domain, report.annual);
            return <article key={domain.key} className="rounded-2xl border border-border p-4">
              <h4 className="font-semibold">{domain.label} · 연간 흐름</h4>
              {plan.actions.map(action => <div key={action.emphasis} className="mt-4">
                <p className="text-sm font-semibold text-(--gold)">{STAGE_LABEL[action.emphasis]}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{action.periods.join(" / ")}</p>
                <p className="mt-2 text-sm leading-7">{action.text}</p>
                <details className="mt-2"><summary className="cursor-pointer text-xs text-muted-foreground">해당 월의 계산 근거</summary>
                  <ul className="mt-2 space-y-2 text-xs leading-6 text-muted-foreground">{action.months.map(month => <li key={month.label}><strong>{month.label}:</strong> {month.basis}</li>)}</ul>
                </details>
              </div>)}
            </article>;
          })}
        </div>
        {!report.annual.precision || report.annual.precision === "broad" ? <p className="mt-4 text-xs leading-6 text-muted-foreground">출생시간이 없어 시주와 대운의 세밀한 반영을 생략했습니다.</p> : null}
      </section>
    </div>
  );
}
