"use client";
import { CalendarDays, Crown } from "lucide-react";
import type { PremiumReading, PremiumReport } from "@/lib/premium-report";

function ReadingContent({ reading }: { reading: PremiumReading }) {
  return <>
    <h3 className="mt-2 text-xl leading-8 font-semibold">{reading.headline}</h3>
    {reading.paragraphs.map(text => <p key={text} className="mt-3 text-base leading-8 text-muted-foreground">{text}</p>)}
    <div className="mt-4 rounded-2xl bg-accent p-4">
      <p className="text-sm font-semibold text-(--gold)">기회가 열리는 모습</p>
      <p className="mt-2 text-base leading-7">{reading.opportunity}</p>
    </div>
    <p className="mt-4 text-sm leading-7 text-muted-foreground"><strong className="text-foreground">마음에 둘 점 · </strong>{reading.caution}</p>
    <details className="mt-4 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-medium">풀이 근거와 짧은 참고</summary>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{reading.basis}</p>
      <p className="mt-3 text-sm leading-7">{reading.tip}</p>
    </details>
  </>;
}

export function PremiumReportView({ report }: { report: PremiumReport }) {
  return <div id="premium-report" className="mt-5 space-y-5">
    <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2 text-(--gold)"><Crown className="size-4" /><p className="section-eyebrow">프리미엄 리포트</p></div>
      <h2 className="mt-2 text-2xl leading-9 font-semibold">{report.title}</h2>
      <p className="mt-3 text-base leading-8">{report.summary}</p>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">{report.note}</p>
      <nav aria-label="리포트 목차" className="mt-4 flex flex-wrap gap-3 text-sm text-(--gold)">
        <a href="#premium-overall">총운</a>
        {report.domains.map(domain => <a key={domain.key} href={`#premium-domain-${domain.key}`}>{domain.label}</a>)}
        <a href="#premium-annual">연간·월별 흐름</a>
      </nav>
    </section>
    <section id="premium-overall" className="scroll-mt-5 rounded-3xl border border-border bg-card p-5">
      <p className="section-eyebrow">총운</p><ReadingContent reading={report.overall} />
    </section>
    {report.domains.map(domain => <section id={`premium-domain-${domain.key}`} key={domain.key} className="scroll-mt-5 rounded-3xl border border-border bg-card p-5">
      <p className="section-eyebrow">{domain.label}</p><ReadingContent reading={domain} />
    </section>)}
    <section id="premium-annual" className="scroll-mt-5 rounded-3xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2 text-(--gold)"><CalendarDays className="size-4" /><p className="section-eyebrow">앞으로 12개월</p></div>
      <h3 className="mt-2 text-xl font-semibold">{report.annual.startLabel} ~ {report.annual.endLabel}</h3>
      <p className="mt-3 text-base leading-8 text-muted-foreground">{report.annualIntroduction}</p>
      {report.annualBackground && <p className="mt-3 text-sm leading-7 text-muted-foreground">{report.annualBackground}</p>}
      <ol aria-label="12개월 흐름" className="mt-5 space-y-4">
        {report.periods.map(period => <li key={period.months[0]} className="rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold text-(--gold)">{period.label}</p>
          <h4 className="mt-2 text-lg leading-7 font-semibold">{period.headline}</h4>
          <p className="mt-3 text-base leading-8 text-muted-foreground">{period.reading}</p>
          <details className="mt-3 border-t border-border pt-3">
            <summary className="cursor-pointer text-sm font-medium">이 시기로 읽은 이유 · 관계·재물·일</summary>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{period.basis}</p>
            {period.domains.map(domain => <p key={domain.key} className="mt-3 text-sm leading-7"><strong>{domain.label} · </strong>{domain.text}</p>)}
          </details>
        </li>)}
      </ol>
    </section>
  </div>;
}
