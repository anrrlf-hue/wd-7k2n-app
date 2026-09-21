"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { TrustBadges } from "@/components/palm/trust-badges";
import { REPORT_CONTENTS } from "@/lib/report-contents";
import { PAYMENT_TIMING_NOTICE, REFUND_POLICY_NOTICE } from "@/lib/payment-notices";
import { CompanionHeading } from "@/components/angel-companion";
import { JourneyScene } from "@/components/journey-scene";
import { financeQuestion, FINANCE_QUESTIONS, type FinanceQuestionId } from "@/lib/finance-question";
import type { AnalysisResult } from "@/lib/analysis-result";

export function PaymentScreen({
  question,
  concerns,
  sajuSummary,
  result,
  onBack,
}: {
  question: FinanceQuestionId;
  concerns: FinanceQuestionId[];
  sajuSummary: string | null;
  result: AnalysisResult;
  onBack: () => void;
}) {
  const [showPaidPreview, setShowPaidPreview] = useState(false);
  const selected = financeQuestion(question);
  const selectedConcerns = FINANCE_QUESTIONS.filter((item) => concerns.includes(item.id));

  if (showPaidPreview) {
    return (
      <motion.div
        initial={{ opacity: 0.5, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="section-eyebrow">결제 후 맞춤 재무 방향 · 미리보기</p>
        <h2 className="mt-3 text-2xl leading-snug font-semibold">{selected.paywallTitle}</h2>

        {sajuSummary && (
          <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">사주에서 본 나</p>
            <p className="mt-2 text-base leading-7">{sajuSummary}</p>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">지금 가장 중요한 방향</p>
          <h3 className="mt-3 text-xl leading-snug font-semibold">{result.headline}</h3>
          <p className="mt-3 text-base leading-7">{result.why}</p>
        </div>

        <div className="mt-5 rounded-2xl bg-accent p-5 text-accent-foreground">
          <p className="text-sm font-semibold">지금 가장 먼저 할 것</p>
          <p className="mt-2 text-base leading-7">{result.immediateDirection}</p>
        </div>

        <details className="mt-4 rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-medium">왜 이 방향인지 보기</summary>
          <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
            {result.eventContext && <p>{result.eventContext}</p>}
            {result.incomeContext && <p>{result.incomeContext}</p>}
            {result.fundingContext && <p>{result.fundingContext}</p>}
            <p>{result.gapStatement}</p>
          </div>
        </details>

        <div className="mt-5 rounded-2xl border border-border bg-card p-5">
          <p className="text-base font-semibold">이 다음에는</p>
          <p className="mt-2 text-base leading-7 text-muted-foreground">
            처음 선택한 다른 고민까지 함께 엮어서, 무엇부터 풀어야 하는지와 30일 실행계획을 이어서 보여드립니다.
            더 필요한 내용이 있으면 최대 3가지만 추가로 확인합니다.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          현재는 실제 결제 연동 전이라 결제 후 화면을 미리보기로 보여주고 있습니다.
        </p>

        <button
          type="button"
          onClick={() => setShowPaidPreview(false)}
          className="mt-6 min-h-11 w-full text-sm text-muted-foreground underline underline-offset-4"
        >
          결제 화면 다시 보기
        </button>
      </motion.div>
    );
  }

  return (
    <div>
      <JourneyScene scene="reality" compact />

      <div className="mt-6">
        <CompanionHeading state="report-handoff" presence="regular">
          <p className="section-eyebrow">사주풀이에서 끝나지 않고 현실로 이어집니다</p>
          <h2 className="mt-3 text-2xl leading-snug font-semibold">{selected.paywallTitle}</h2>
        </CompanionHeading>
      </div>

      {selectedConcerns.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium">내가 처음 선택한 고민</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedConcerns.map((item) => (
              <span key={item.id} className="rounded-full border border-border px-3 py-1.5 text-sm">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="text-xl leading-8 font-semibold">
          막연했던 돈 걱정을,
          <br />
          내가 지금 무엇을 해야 하는지 보이는 계획으로 바꿔드립니다.
        </p>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          사주에서 본 성향과 지금의 생활을 함께 놓고, 선택한 고민들이 어떻게 연결되어 있는지 살펴본 뒤
          지금 내게 필요한 방향을 잡아드립니다.
        </p>
      </div>

      <TrustBadges />

      <PaywallOffer
        title="선택한 고민을 함께 풀어가는 맞춤 재무 방향"
        includedItems={REPORT_CONTENTS}
        ctaText="내 재무 방향 자세히 보기 · 9,900원"
        onRequest={() => setShowPaidPreview(true)}
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">{PAYMENT_TIMING_NOTICE}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{REFUND_POLICY_NOTICE}</p>

      <button
        type="button"
        onClick={onBack}
        className="mt-6 min-h-11 w-full text-sm text-muted-foreground underline underline-offset-4"
      >
        바로 전 단계로 돌아가기
      </button>
    </div>
  );
}
