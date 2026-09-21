"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { TrustBadges } from "@/components/palm/trust-badges";
import { REPORT_CONTENTS } from "@/lib/report-contents";
import { PAYMENT_TIMING_NOTICE, REFUND_POLICY_NOTICE } from "@/lib/payment-notices";
import { CompanionHeading } from "@/components/angel-companion";
import { JourneyScene } from "@/components/journey-scene";
import { financeQuestion, FINANCE_QUESTIONS, type FinanceQuestionId } from "@/lib/finance-question";
import type { AnalysisResult } from "@/lib/analysis-result";
import type { SurveyInput } from "@/lib/survey-input";
import type { BirthInput } from "@/lib/saju";
import { saveFinanceBaseline } from "@/lib/finance-management";
import {
  buildPaidExtraQuestions,
  buildPaidFinanceResult,
  paidQuestionsComplete,
  type PaidExtraAnswers,
} from "@/lib/paid-finance-engine";
import { Button } from "@/components/ui/button";

export function PaymentScreen({
  question,
  concerns,
  sajuSummary,
  result,
  input,
  birthInput,
  onBack,
}: {
  question: FinanceQuestionId;
  concerns: FinanceQuestionId[];
  sajuSummary: string | null;
  result: AnalysisResult;
  input: SurveyInput;
  birthInput: BirthInput;
  onBack: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"offer" | "questions" | "result">("offer");
  const [answers, setAnswers] = useState<PaidExtraAnswers>({});
  const selected = financeQuestion(question);
  const selectedConcerns = FINANCE_QUESTIONS.filter((item) => concerns.includes(item.id));
  const extraQuestions = useMemo(() => buildPaidExtraQuestions(question, input), [question, input]);
  const paidResult = useMemo(
    () => buildPaidFinanceResult(question, input, result, answers),
    [question, input, result, answers],
  );

  function startPaidResult() {
    if (extraQuestions.length > 0) setStage("questions");
    else setStage("result");
  }

  function saveAndOpenManagement() {
    saveFinanceBaseline({
      birthInput,
      sajuSummary,
      concerns,
      focusedQuestion: question,
      financeInput: input,
      paidExtraAnswers: answers,
      paidResult,
    });
    router.push("/management");
  }

  if (stage === "questions") {
    return (
      <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="section-eyebrow">조금만 더 확인할게요 · {extraQuestions.length}문항</p>
        <h2 className="mt-3 text-2xl leading-snug font-semibold">{selected.paywallTitle}</h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          이미 답한 내용은 다시 묻지 않습니다. 이 질문에 답하는 데 꼭 필요한 내용만 확인합니다.
        </p>

        <div className="mt-6 space-y-4">
          {extraQuestions.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
              <label className="text-base font-medium" htmlFor={item.id}>{item.label}</label>
              {item.helper && <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.helper}</p>}

              {item.type === "number" && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    id={item.id}
                    min={0}
                    step="0.1"
                    type="number"
                    inputMode="decimal"
                    value={typeof answers[item.id] === "number" ? answers[item.id] : ""}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [item.id]: event.target.value === "" ? "" : Number(event.target.value),
                      }))
                    }
                    className="min-h-11 flex-1 border-none bg-transparent p-0 text-xl font-semibold tabular-nums outline-none"
                    placeholder="입력"
                  />
                  {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
                </div>
              )}

              {item.type === "date" && (
                <input
                  id={item.id}
                  type="date"
                  value={typeof answers[item.id] === "string" ? answers[item.id] : ""}
                  onChange={(event) => setAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))}
                  className="mt-3 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base"
                />
              )}

              {item.type === "select" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.options?.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: option.value }))}
                      aria-pressed={answers[item.id] === option.value}
                      className={
                        "min-h-11 rounded-full border px-3 py-2 text-sm transition-colors " +
                        (answers[item.id] === option.value
                          ? "border-(--gold) bg-(--gold-soft) text-(--gold)"
                          : "border-border")
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          size="lg"
          disabled={!paidQuestionsComplete(extraQuestions, answers)}
          onClick={() => setStage("result")}
          className="mt-6 h-14 w-full rounded-full text-base"
        >
          내 재무 방향 보기
        </Button>
        <button
          type="button"
          onClick={() => setStage("offer")}
          className="mt-4 min-h-11 w-full text-sm text-muted-foreground underline underline-offset-4"
        >
          결제 화면으로 돌아가기
        </button>
      </motion.div>
    );
  }

  if (stage === "result") {
    return (
      <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="section-eyebrow">결제 후 맞춤 재무 방향 · 미리보기</p>
        <h2 className="mt-3 text-2xl leading-snug font-semibold">{paidResult.question}</h2>

        {sajuSummary && (
          <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">사주에서 본 나</p>
            <p className="mt-2 text-base leading-7">{sajuSummary}</p>
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">결론</p>
          <p className="mt-3 text-xl leading-8 font-semibold">{paidResult.conclusion}</p>
        </section>

        <section className="mt-5">
          <h3 className="text-base font-semibold">왜 이렇게 봤나요?</h3>
          <ul className="mt-3 space-y-2">
            {paidResult.reasons.map((reason) => (
              <li key={reason} className="flex gap-2 text-base leading-7">
                <CheckCircle2 className="mt-1.5 size-4 shrink-0 text-(--gold)" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h3 className="text-base font-semibold">선택 가능한 방향</h3>
          <div className="mt-3 space-y-3">
            {paidResult.directions.map((direction) => (
              <div key={direction.title} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold">{direction.title}</p>
                <p className="mt-1.5 text-base leading-7 text-muted-foreground">{direction.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-accent p-5 text-accent-foreground">
          <p className="section-eyebrow">지금 먼저 할 것</p>
          <p className="mt-2 text-xl leading-8 font-semibold">{paidResult.firstAction}</p>
        </section>

        <details className="mt-5 rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-base font-medium">조금 더 자세히 보기</summary>
          <div className="mt-3 space-y-2 text-sm leading-7 text-muted-foreground">
            {paidResult.details.map((detail) => <p key={detail}>{detail}</p>)}
          </div>
        </details>

        <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">이번 30일에 할 것 하나</p>
          <p className="mt-2 text-base leading-7 font-semibold">{paidResult.check30.action}</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">30일 후 무엇을 다시 확인하나요?</summary>
            <ul className="mt-3 space-y-1.5 text-sm leading-6 text-muted-foreground">
              {paidResult.check30.checkpoints.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </details>
        </section>

        <Button
          size="lg"
          onClick={saveAndOpenManagement}
          className="mt-6 h-14 w-full rounded-full text-base"
        >
          내 관리페이지에 저장하고 계속 보기
        </Button>

        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
          현재는 실제 결제 연동 전이라 미리보기 결과를 이 브라우저에 저장합니다.
        </p>

        <button
          type="button"
          onClick={() => setStage("offer")}
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
          사주에서 본 나와 지금의 현실을 함께 보고,
          <br />
          앞으로 무엇부터 바꿔야 하는지 보여드립니다.
        </p>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          여러 고민을 함께 놓고 우선순위를 정한 뒤, 이번에 실제로 해볼 한 가지까지 이어드립니다.
        </p>
      </div>

      <TrustBadges />

      <PaywallOffer
        title="선택한 고민을 함께 풀어가는 맞춤 재무 방향"
        includedItems={REPORT_CONTENTS}
        ctaText="내 재무 방향 자세히 보기 · 9,900원"
        onRequest={startPaidResult}
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
