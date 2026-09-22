"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionHeading } from "@/components/brand-companion";
import { eunNeun } from "@/lib/korean-particle";
import { FINANCE_QUESTIONS, type FinanceQuestionId } from "@/lib/finance-question";
import type { AnalysisResult } from "@/lib/analysis-result";

export function AnalysisResultCard({
  result,
  concerns,
  sajuSummary,
  onProceed,
  onRevise,
}: {
  result: AnalysisResult;
  concerns: FinanceQuestionId[];
  sajuSummary: string | null;
  onProceed: (question: FinanceQuestionId) => void;
  onRevise: () => void;
}) {
  const availableQuestions = useMemo(
    () => FINANCE_QUESTIONS.filter((question) => concerns.includes(question.id)),
    [concerns],
  );
  const [selectedQuestion, setSelectedQuestion] = useState<FinanceQuestionId | null>(
    availableQuestions.length === 1 ? availableQuestions[0].id : null,
  );
  const insufficient = result.bottleneck === "insufficient_data";

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <CompanionHeading state="diagnosis-reveal" presence="regular">
        <p className="section-eyebrow">사주에서 현실로</p>
        <h2 className="mt-3 text-2xl leading-snug font-semibold tracking-tight">
          사주에서 본 나를,
          <br />
          지금의 삶으로 이어봅니다
        </h2>
      </CompanionHeading>

      {sajuSummary && (
        <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">사주에서 본 나</p>
          <p className="mt-2 text-base leading-7">{sajuSummary}</p>
        </div>
      )}

      {result.userConcern && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">내가 추가로 적은 이야기</p>
          <p className="mt-2 text-base leading-7">“{result.userConcern}”</p>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <p className="section-eyebrow">지금의 현실</p>
        <p className="mt-2 text-base leading-7">{result.lifeMeaning}</p>
        {result.surplusKrw !== null && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">저축·투자까지 배분한 뒤 남는 금액</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {(Math.round((result.surplusKrw / 10000) * 10) / 10).toLocaleString("ko-KR")}만원
              <span className="text-sm font-normal"> / 월</span>
            </p>
          </div>
        )}
      </div>

      <section className="diagnosis-priority mt-7">
        <p className="section-eyebrow">
          {insufficient || result.bottleneck === "purpose_fund_confirmation"
            ? "먼저 확인할 부분"
            : result.bottleneck === "no_priority_bottleneck"
              ? "지금의 방향"
              : "지금 가장 먼저 볼 부분"}
        </p>
        <h3 className="mt-3 text-2xl leading-snug font-semibold">{result.headline}</h3>
        <p className="mt-4 text-base leading-7">{result.why}</p>
      </section>

      {!insufficient && (
        <div className="mt-5 rounded-2xl bg-accent p-5 text-accent-foreground">
          <h3 className="text-base font-semibold">지금은 뒤로 둬도 괜찮아요</h3>
          <p className="mt-2 text-base leading-7">
            {result.notUrgent}{eunNeun(result.notUrgent)} 지금의 1순위가 아닙니다. {result.notUrgentReason}
          </p>
        </div>
      )}

      <details className="mt-4 rounded-2xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-base font-medium">왜 이런 흐름으로 봤는지 보기</summary>
        <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
          {result.eventContext && <p>{result.eventContext}</p>}
          {result.incomeContext && <p>{result.incomeContext}</p>}
          {result.fundingContext && <p>{result.fundingContext}</p>}
          <p>{result.gapStatement}</p>
        </div>
      </details>

      {insufficient ? (
        <Button size="lg" onClick={onRevise} className="mt-6 h-14 w-full rounded-full text-base">
          답변 확인하고 다시 보기
        </Button>
      ) : (
        <section className="transition-panel mt-8">
          <p className="section-eyebrow">내가 처음 고른 고민</p>
          <h3 className="mt-2 text-xl font-semibold">
            이 중 무엇을 먼저 더 자세히 보고 싶나요?
          </h3>
          <p className="mt-2 text-base leading-7 text-muted-foreground">
            여러 고민은 함께 가져가되, 먼저 깊이 볼 하나를 골라주세요.
          </p>

          <div className="mt-5 space-y-2.5">
            {(availableQuestions.length ? availableQuestions : FINANCE_QUESTIONS).map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setSelectedQuestion(question.id)}
                aria-pressed={selectedQuestion === question.id}
                className={
                  "min-h-14 w-full rounded-2xl border p-4 text-left text-base leading-6 transition-colors " +
                  (selectedQuestion === question.id
                    ? "border-(--gold) bg-(--gold-soft) text-foreground"
                    : "border-border bg-card text-foreground/85")
                }
              >
                {question.label}
              </button>
            ))}
          </div>

          <Button
            size="lg"
            disabled={!selectedQuestion}
            onClick={() => selectedQuestion && onProceed(selectedQuestion)}
            className="mt-5 h-14 w-full rounded-full text-base"
          >
            내 고민을 더 자세히 보기 <ArrowRight className="size-4" />
          </Button>
        </section>
      )}

      {!insufficient && (
        <button
          type="button"
          onClick={onRevise}
          className="mt-5 min-h-11 w-full text-center text-sm text-muted-foreground underline underline-offset-4"
        >
          바로 전 단계로 돌아가기
        </button>
      )}
    </motion.div>
  );
}
