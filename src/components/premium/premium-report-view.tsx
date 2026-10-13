"use client";
import { CalendarDays, Crown } from "lucide-react";
import type { PremiumPeriod, PremiumReading, PremiumReport } from "@/lib/premium-report";

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
      {reading.tip && <p className="mt-3 text-sm leading-7">{reading.tip}</p>}
    </details>
  </>;
}

export function PremiumReportView({ report }: { report: PremiumReport }) {
  const highlights = report.annualHighlights?.flatMap(label => {
    const period = report.periods.find(p => p.months[0] === label);
    return period ? [period] : [];
  });
  // Shared passages stay in each stored period for complete evidence. On the
  // page, show them once and link later periods to that exact explanation.
  const firstOccurrence = new Map<string, PremiumPeriod>();
  const narratives = new Map<PremiumPeriod, { text: string[]; shared: PremiumPeriod[] }>();
  for (const period of [...(highlights ?? []), ...report.periods.filter(p => !highlights?.includes(p))]) {
    const paragraphs = period.interpretation?.passages.filter(p => p.kind === "traditional" && p.id !== "daeun-context").map(p => p.text) ?? [period.reading];
    const text: string[] = [], shared: PremiumPeriod[] = [];
    for (const paragraph of paragraphs) {
      const prior = firstOccurrence.get(paragraph);
      if (prior && period.interpretation) { if (!shared.includes(prior)) shared.push(prior); }
      else { firstOccurrence.set(paragraph, period); text.push(paragraph); }
    }
    narratives.set(period, { text, shared });
  }
  const narrative = (period: PremiumPeriod) => <>
    {narratives.get(period)?.text.map(text => <p key={text} className="mt-3 text-base leading-8 text-muted-foreground">{text}</p>)}
    {narratives.get(period)?.shared.map(prior => <a key={prior.months[0]} href={`#premium-period-${report.periods.indexOf(prior)}`} className="mt-3 block text-sm text-(--gold) underline underline-offset-4">{prior.label}과 함께 읽는 흐름</a>)}
  </>;
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
    {!!report.palmConnections?.length && <section className="rounded-3xl border border-border bg-card p-5" aria-label="손금과 사주를 연결해 읽기">
      <p className="section-eyebrow">손금과 함께 보면</p>
      <h3 className="mt-2 text-xl leading-8 font-semibold">같은 장면을 서로 다른 관점에서 읽기</h3>
      {report.palmConnections.map(item => <div key={item.topic} className="mt-4">
        <h4 className="font-semibold">{item.topic}</h4>
        <p className="mt-2 whitespace-pre-line text-base leading-8 text-muted-foreground">{item.text}</p>
      </div>)}
    </section>}
    <section id="premium-annual" className="scroll-mt-5 rounded-3xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2 text-(--gold)"><CalendarDays className="size-4" /><p className="section-eyebrow">앞으로 12개월</p></div>
      <h3 className="mt-2 text-xl font-semibold">{report.annual.startLabel} ~ {report.annual.endLabel}</h3>
      <p className="mt-3 text-base leading-8 text-muted-foreground">{report.annualIntroduction}</p>
      {report.annualBackground && <p className="mt-3 text-sm leading-7 text-muted-foreground">{report.annualBackground}</p>}
      {highlights && <div aria-label="1년의 주요 구간" className="mt-5 space-y-5">
        {highlights.map(period => <article id={`premium-period-${report.periods.indexOf(period)}`} key={period.months[0]} className="scroll-mt-5 rounded-2xl bg-accent p-4">
          <p className="text-sm text-(--gold)">{period.label}</p>
          <h4 className="mt-2 text-lg leading-7 font-semibold">{period.headline}</h4>
          {narrative(period)}
          {period.interpretation?.passages.filter(p => p.id === "daeun-context").map(p => <p key={p.id} className="mt-3 text-base leading-8 text-muted-foreground">{p.text}</p>)}
          <details className="mt-3"><summary className="cursor-pointer text-sm">이 구간을 읽은 근거</summary><p className="mt-2 text-sm leading-7 text-muted-foreground">{period.basis}</p></details>
        </article>)}
      </div>}
      <details open={!highlights} className="mt-5 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-medium">12개월 전체 흐름 펼쳐보기</summary>
      <ol aria-label="12개월 흐름" className="mt-5 space-y-4">
        {report.periods.map(period => <li id={highlights?.includes(period) ? undefined : `premium-period-${report.periods.indexOf(period)}`} key={period.months[0]} className="scroll-mt-5 rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold text-(--gold)">{period.label}</p>
          <h4 className="mt-2 text-lg leading-7 font-semibold">{period.headline}</h4>
          {highlights?.includes(period)
            ? <a href={`#premium-period-${report.periods.indexOf(period)}`} className="mt-3 inline-block text-sm text-(--gold) underline underline-offset-4">위 주요 구간의 해설로 이동</a>
            : narrative(period)}
          <details className="mt-3 border-t border-border pt-3">
            <summary className="cursor-pointer text-sm font-medium">이 시기로 읽은 이유 · 관계·재물·일</summary>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{period.basis}</p>
            {period.domains.map(domain => <p key={domain.key} className="mt-3 text-sm leading-7"><strong>{domain.label} · </strong>{domain.text}</p>)}
          </details>
        </li>)}
      </ol>
      </details>
    </section>
  </div>;
}
