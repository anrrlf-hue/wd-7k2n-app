"use client";

import { useState } from "react";
import { StepShell } from "@/components/diagnosis/step-shell";
import { BirthDateStep } from "@/components/diagnosis/birth-date-step";
import { BirthTimeStep } from "@/components/diagnosis/birth-time-step";
import { PersonalityStep } from "@/components/diagnosis/personality-step";
import { LoadingStep } from "@/components/diagnosis/loading-step";
import { ResultStep } from "@/components/diagnosis/result-step";
import type { FullSajuDiagnosis } from "@/lib/saju";
import type { MbtiType } from "@/lib/mbti-facts";

// 확정된 최종 퍼널: 생년월일+성별 -> 출생시간 -> MBTI+6문항 성향체크 -> 1차
// 무료 결과 -> (손금은 별도 라우트 /diagnosis/palm에서 최종 통합 리포트까지
// 이어짐). MBTI는 triple-compare.ts의 결정 방식/관계-감정 축 네 번째
// 신호로 실제로 쓰인다 — 사주 계산값을 바꾸는 용도가 아니다.
// 손금 이후 다시 여기로 돌아와 질문을 더 받는 단계(money-check/summary)는
// 없다 — 결제 뒤/후반에 추가 질문을 만들지 않는다는 원칙에 따라 완전히 제거했다.
type Step = "date" | "time" | "personality" | "loading" | "result";

const STEP_ORDER: Step[] = ["date", "time", "personality", "loading", "result"];

export default function DiagnosisPage() {
  const [step, setStep] = useState<Step>("date");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"남" | "여">("남");
  const [knowsTime, setKnowsTime] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, number>>({});
  const [mbti, setMbti] = useState<MbtiType | "모름">("모름");
  const [diagnosis, setDiagnosis] = useState<FullSajuDiagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFetchDiagnosis() {
    setStep("loading");
    setError(null);

    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = knowsTime && birthTime
      ? birthTime.split(":").map(Number)
      : [null, null];

    // 서버가 아예 응답하지 않는 경우까지 대비한 클라이언트 측 안전장치.
    // 인위적으로 로딩을 늘리는 지연은 넣지 않는다 — 실제 계산에 걸리는
    // 시간만큼만 기다린다.
    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 15000);

    try {
      const hasPersonality = Object.keys(personalityAnswers).length > 0;
      const res = await fetch("/api/saju", {
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
      });

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

      {step === "result" && diagnosis && <ResultStep diagnosis={diagnosis} />}
    </StepShell>
  );
}
