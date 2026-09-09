"use client";

import { useEffect, useState } from "react";
import { StepShell } from "@/components/diagnosis/step-shell";
import { BirthDateStep } from "@/components/diagnosis/birth-date-step";
import { BirthTimeStep } from "@/components/diagnosis/birth-time-step";
import { PersonalityStep } from "@/components/diagnosis/personality-step";
import { LoadingStep } from "@/components/diagnosis/loading-step";
import { ResultStep } from "@/components/diagnosis/result-step";
import { MoneyCheckStep } from "@/components/diagnosis/money-check-step";
import { SummaryStep } from "@/components/diagnosis/summary-step";
import type { FullSajuDiagnosis } from "@/lib/saju";
import type { MbtiType } from "@/lib/mbti-facts";
import { scoreMoneyCheck, type MoneyCheckResult } from "@/lib/money-check";

type Step = "date" | "time" | "personality" | "loading" | "result" | "money-check" | "summary";

const STEP_ORDER: Step[] = ["date", "time", "personality", "loading", "result", "money-check", "summary"];

export default function DiagnosisPage() {
  const [step, setStep] = useState<Step>("date");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"남" | "여">("남");
  const [knowsTime, setKnowsTime] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, number>>({});
  const [mbti, setMbti] = useState<MbtiType | "모름">("모름");
  const [diagnosis, setDiagnosis] = useState<FullSajuDiagnosis | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [moneyResult, setMoneyResult] = useState<MoneyCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 손금 결과 화면(별도 라우트)에서 "현실 재무검증도 볼까요?"로 넘어올 때,
  // 처음부터 다시 시작하지 않고 바로 무료 재무검증 단계로 진입하게 한다.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("step") === "money-check") {
      // 마운트 시 한 번만 외부 URL 상태를 내부 상태로 동기화하는 의도적인
      // 리다이렉트 패턴 — 손금 결과 화면에서 넘어올 때만 발생한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("money-check");
    }
  }, []);

  async function handleFetchDiagnosis() {
    setStep("loading");
    setError(null);

    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = knowsTime && birthTime
      ? birthTime.split(":").map(Number)
      : [null, null];

    // 서버가 아예 응답하지 않는 경우까지 대비한 클라이언트 측 안전장치.
    // 서버 쪽 딥 해석 자체는 이미 9초 타임아웃 후 mock으로 떨어지므로,
    // 여기서는 그보다 넉넉하게 잡아 "서버가 안 죽었으면" 항상 응답을 받는다.
    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 15000);

    try {
      const hasPersonality = Object.keys(personalityAnswers).length > 0;
      const [res] = await Promise.all([
        fetch("/api/saju", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year,
            month,
            day,
            hour,
            minute,
            gender,
            personalityAnswers: hasPersonality ? personalityAnswers : undefined,
            mbti: mbti !== "모름" ? mbti : undefined,
          }),
          signal: controller.signal,
        }),
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);

      if (!res.ok) throw new Error("failed");
      const data: FullSajuDiagnosis = await res.json();
      setDiagnosis(data);
      setStep("result");
    } catch {
      setError("진단에 실패했어요. 생년월일을 다시 확인해주세요.");
      setStep("date");
    } finally {
      clearTimeout(clientTimeout);
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
          gender={gender}
          onGenderChange={setGender}
          onNext={() => setStep("time")}
        />
      )}

      {step === "time" && (
        <BirthTimeStep
          knowsTime={knowsTime}
          time={birthTime}
          onKnowsTimeChange={setKnowsTime}
          onTimeChange={setBirthTime}
          onNext={() => setStep("personality")}
          onBack={() => setStep("date")}
        />
      )}

      {step === "personality" && (
        <PersonalityStep
          personalityAnswers={personalityAnswers}
          onPersonalityChange={(id, value) => setPersonalityAnswers((prev) => ({ ...prev, [id]: value }))}
          mbti={mbti}
          onMbtiChange={setMbti}
          onNext={handleFetchDiagnosis}
          onSkip={() => {
            setPersonalityAnswers({});
            setMbti("모름");
            handleFetchDiagnosis();
          }}
          onBack={() => setStep("time")}
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
