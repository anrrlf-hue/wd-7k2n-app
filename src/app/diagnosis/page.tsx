"use client";

import { useState } from "react";
import { StepShell } from "@/components/diagnosis/step-shell";
import { BirthDateStep } from "@/components/diagnosis/birth-date-step";
import { BirthTimeStep } from "@/components/diagnosis/birth-time-step";
import { LoadingStep } from "@/components/diagnosis/loading-step";
import { ResultStep } from "@/components/diagnosis/result-step";
import { MoneyCheckStep } from "@/components/diagnosis/money-check-step";
import { SummaryStep } from "@/components/diagnosis/summary-step";
import type { SajuDiagnosis } from "@/lib/saju";
import { scoreMoneyCheck, type MoneyCheckResult } from "@/lib/money-check";

type Step = "date" | "time" | "loading" | "result" | "money-check" | "summary";

const STEP_ORDER: Step[] = ["date", "time", "loading", "result", "money-check", "summary"];

export default function DiagnosisPage() {
  const [step, setStep] = useState<Step>("date");
  const [birthDate, setBirthDate] = useState("");
  const [knowsTime, setKnowsTime] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [diagnosis, setDiagnosis] = useState<SajuDiagnosis | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [moneyResult, setMoneyResult] = useState<MoneyCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFetchDiagnosis() {
    setStep("loading");
    setError(null);

    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = knowsTime && birthTime
      ? birthTime.split(":").map(Number)
      : [null, null];

    try {
      const [res] = await Promise.all([
        fetch("/api/saju", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month, day, hour, minute }),
        }),
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);

      if (!res.ok) throw new Error("failed");
      const data: SajuDiagnosis = await res.json();
      setDiagnosis(data);
      setStep("result");
    } catch {
      setError("진단에 실패했어요. 생년월일을 다시 확인해주세요.");
      setStep("date");
    }
  }

  function handleAnswer(id: string, score: number) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: score };
      return next;
    });
  }

  function handleFinishMoneyCheck() {
    setMoneyResult(scoreMoneyCheck(answers));
    setStep("summary");
  }

  const progress = ((STEP_ORDER.indexOf(step) + 1) / STEP_ORDER.length) * 100;

  return (
    <StepShell stepKey={step} progress={progress}>
      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {step === "date" && (
        <BirthDateStep
          value={birthDate}
          onChange={setBirthDate}
          onNext={() => setStep("time")}
        />
      )}

      {step === "time" && (
        <BirthTimeStep
          knowsTime={knowsTime}
          time={birthTime}
          onKnowsTimeChange={setKnowsTime}
          onTimeChange={setBirthTime}
          onNext={handleFetchDiagnosis}
          onBack={() => setStep("date")}
        />
      )}

      {step === "loading" && <LoadingStep />}

      {step === "result" && diagnosis && (
        <ResultStep diagnosis={diagnosis} onNext={() => setStep("money-check")} />
      )}

      {step === "money-check" && (
        <MoneyCheckStep
          answers={answers}
          onAnswer={handleAnswer}
          onNext={handleFinishMoneyCheck}
        />
      )}

      {step === "summary" && moneyResult && <SummaryStep result={moneyResult} />}
    </StepShell>
  );
}
