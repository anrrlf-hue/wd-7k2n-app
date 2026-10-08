"use client";

import { CalendarDays, Crown, Sparkles } from "lucide-react";
import type { PremiumReport } from "@/lib/premium-report";

export function PremiumReportView({ report }: { report: PremiumReport }) {
  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)">
          <Crown className="size-4" />
          <p className="section-eyebrow">프리미엄 리포트</p>
        </div>
        <h2 className="mt-2 text-2xl leading-9 font-semibold">{report.title}</h2>
        <p className="mt-3 text-base leading-8 text-muted-foreground">{report.summary}</p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="section-eyebrow">무료 풀이보다 한 단계 더 깊게</p>
        <h3 className="mt-2 text-xl font-semibold">내가 반복하기 쉬운 핵심 패턴</h3>
        <div className="mt-4 space-y-3">
          {report.corePatterns.map((text, index) => (
            <div key={index} className="rounded-2xl bg-accent p-4">
              <p className="text-base leading-7 text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)">
          <Sparkles className="size-4" />
          <p className="section-eyebrow">부족한 부분을 채우는 법</p>
        </div>
        <h3 className="mt-2 text-xl font-semibold">좋은 운을 결과로 바꾸려면</h3>
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
                <span className="font-medium text-foreground">잘 쓰였을 때:</span> {item.goodResult}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <p className="section-eyebrow">네 영역을 모두 깊게 보면</p>
        <div className="mt-3 space-y-4">
          {report.domains.map((domain) => (
            <details key={domain.key} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer list-none">
                <p className="text-xs font-semibold text-(--gold)">{domain.label}</p>
                <h3 className="mt-1 text-lg font-semibold">{domain.headline}</h3>
                <p className="mt-2 text-xs text-muted-foreground">눌러서 자세히 보기</p>
              </summary>
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {domain.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-8 text-muted-foreground">{paragraph}</p>
                ))}
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
          한두 달만 찍지 않고 1년 전체를 월별로 봅니다.
        </p>

        <div className="mt-5 space-y-3">
          {report.annual.months.map((month) => (
            <details key={month.label} className="rounded-2xl border border-border p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{month.label}</p>
                    <p className="mt-1 text-xs text-(--gold)">{month.domainLabel} · {month.theme}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">자세히</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{month.meaning}</p>
              </summary>
              <div className="mt-3 grid gap-2 border-t border-border pt-3">
                <div className="rounded-xl bg-accent p-3">
                  <p className="text-xs font-semibold text-(--gold)">좋게 쓰려면</p>
                  <p className="mt-1 text-sm leading-6">{month.goodFor}</p>
                </div>
                <div className="rounded-xl bg-background p-3">
                  <p className="text-xs font-semibold">조심할 점</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{month.caution}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{report.annual.note}</p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <p className="section-eyebrow">좋은 결과를 만들기 위한 실행</p>
        <div className="mt-3 space-y-3">
          {report.actionPlan.map((item, index) => (
            <div key={item.title} className="rounded-2xl bg-accent p-4">
              <p className="text-xs font-semibold text-(--gold)">0{index + 1}</p>
              <h4 className="mt-1 font-semibold">{item.title}</h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs leading-5 text-muted-foreground">{report.note}</p>
    </div>
  );
}
