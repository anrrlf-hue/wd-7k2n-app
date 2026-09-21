"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanionHeading } from "@/components/angel-companion";
import { eunNeun } from "@/lib/korean-particle";
import { FINANCE_QUESTIONS, type FinanceQuestionId } from "@/lib/finance-question";
import type { AnalysisResult } from "@/lib/analysis-result";

export function AnalysisResultCard({
  result,
  onProceed,
  onRevise,
}: {
  result: AnalysisResult;
  onProceed: (question: FinanceQuestionId) => void;
  onRevise: () => void;
}) {
  const [selectedQuestion, setSelectedQuestion] = useState<FinanceQuestionId | null>(null);
  const insufficient = result.bottleneck === "insufficient_data";

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <CompanionHeading state="diagnosis-reveal" presence="regular">
        <p className="section-eyebrow">현실 재무진단</p>
        <h2 className="mt-3 text-2xl leading-snug font-semibold tracking-tight">
          지금 내 삶에서
          <br />
          무엇이 중요한지 볼게요
        </h2>
      </CompanionHeading>

      <p className="mt-3 text-base leading-7 text-muted-foreground">
        사주와 손금은 나를 이해하는 데 쓰고, 아래 판단은 실제로 입력한 생활 정보만 기준으로 합니다.
      </p>

      {result.userConcern && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">내가 적은 이야기</p>
          <p className="mt-2 text-base leading-7">“{result.userConcern}”</p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="section-eyebrow">지금의 흐름</p>
        <p className="mt-2 text-base leading-7">{result.lifeMeaning}</p>
        {result.surplusKrw !== null && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">저축·투자까지 배분한 뒤 남는 금액</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {result.surplusKrw.toLocaleString("ko-KR")}원
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
              ? "현재의 우선순위"
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
        <summary className="cursor-pointer text-base font-medium">왜 이렇게 봤는지 확인하기</summary>
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
          <p className="section-eyebrow">여기서부터는 내가 궁금한 것</p>
          <h3 className="mt-2 text-xl font-semibold">지금 가장 알고 싶은 것은 무엇인가요?</h3>
          <p className="mt-2 text-base leading-7 text-muted-foreground">
            하나를 고르면, 그 질문을 중심으로 다음 결과를 이어갑니다.
          </p>

          <div className="mt-5 space-y-2.5">
            {FINANCE_QUESTIONS.map((question) => (
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
            이 질문, 내 상황에 맞게 이어보기 <ArrowRight className="size-4" />
          </Button>
        </section>
      )}

      {!insufficient && (
        <button
          type="button"
          onClick={onRevise}
          className="mt-5 min-h-11 w-full text-center text-sm text-muted-foreground underline underline-offset-4"
        >
          재무 답변 수정하기
        </button>
      )}
    </motion.div>
  );
}
