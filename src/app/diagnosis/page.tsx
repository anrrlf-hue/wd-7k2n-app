"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
type Step = "date" | "time" | "personality" | "loading" | "result" | "error";

const STEP_ORDER: Step[] = ["date", "time", "personality", "loading", "result"];

// 서버 쪽 이론상 최대 처리시간: enrichSajuFacts의 oh-my-saju 서브프로세스
// 타임아웃(6초) + 그 뒤 Promise.all로 동시 실행되는 딥해석/무료리포트 각각의
// 9초 타임아웃(둘은 동시라 합산 아님) = 최대 15초. 여기에 Vercel 서버리스
// 콜드스타트(자식 프로세스 최초 spawn 등) 여유를 더해야 하므로, 클라이언트
// 타임아웃을 15초에 딱 맞추면 콜드스타트 상황에서 실제로는 성공할 요청이
// 그냥 잘려나간다 — 30초로 넉넉히 잡는다.
const CLIENT_TIMEOUT_MS = 30000;

// 새로고침하면 결과가 통째로 날아가고 처음부터 다시 해야 하는 문제 대응 —
// 완료된 진단을 세션 저장소에 남겨 같은 탭에서 새로고침해도 복원한다.
// 서버에 아무것도 저장하지 않고(고유 결과 URL 등은 범위 밖), 브라우저를
// 닫으면 사라지는 가벼운 수준으로만 처리한다.
const STORAGE_KEY = "saju-app:diagnosis-session:v1";

interface StoredSession {
  birthDate: string;
  gender: "남" | "여";
  knowsTime: boolean;
  birthTime: string;
  personalityAnswers: Record<string, number>;
  mbti: MbtiType | "모름";
  diagnosis: FullSajuDiagnosis;
}

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

  // sessionStorage(외부 시스템)에서 복원하는 마운트 1회성 동기화라 useEffect가
  // 맞는 자리다(React 공식 가이드의 "외부 시스템과 동기화" 케이스) — 서버
  // 렌더에는 sessionStorage가 없어 useState 지연 초기화로 옮기면 하이드레이션
  // 불일치가 난다. react-hooks/set-state-in-effect는 "다른 state에서 파생되는
  // state"를 잡기 위한 규칙이라 이 케이스엔 해당하지 않는다.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved: StoredSession = JSON.parse(raw);
      if (!saved?.diagnosis) return;
      /* eslint-disable react-hooks/set-state-in-effect */
      setBirthDate(saved.birthDate);
      setGender(saved.gender);
      setKnowsTime(saved.knowsTime);
      setBirthTime(saved.birthTime);
      setPersonalityAnswers(saved.personalityAnswers);
      setMbti(saved.mbti);
      setDiagnosis(saved.diagnosis);
      setStep("result");
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // 세션 저장소를 못 읽어도(프라이빗 모드 등) 그냥 처음부터 진행한다.
    }
  }, []);

  function restart() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // 저장소 접근 불가는 무시 — 어차피 폼 상태는 아래에서 초기화된다.
    }
    setBirthDate("");
    setKnowsTime(false);
    setBirthTime("");
    setPersonalityAnswers({});
    setMbti("모름");
    setDiagnosis(null);
    setStep("date");
  }

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
    const clientTimeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

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
      try {
        const toStore: StoredSession = { birthDate, gender, knowsTime, birthTime, personalityAnswers, mbti, diagnosis: data };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // 저장 실패(용량 초과, 프라이빗 모드 등)해도 이번 화면 표시엔 지장 없다.
      }
    } catch (err) {
      // 입력값(생년월일)을 다시 그리는 "date" 스텝으로 조용히 되돌리면,
      // 사용자는 자기가 입력한 값이 사라졌다고 오해하고 버튼이 안 먹힌다고
      // 생각하기 쉽다 — 전용 에러 스텝에서 같은 입력값 그대로 재시도할 수
      // 있게 한다. 타임아웃(AbortError)과 그 외 실패를 구분해 안내한다.
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setError(
        isTimeout
          ? "서버 응답이 평소보다 오래 걸리고 있어요. 네트워크 상태를 확인하고 다시 시도해주세요."
          : "진단 계산 중 문제가 생겼어요. 다시 시도해주세요.",
      );
      setStep("error");
    } finally {
      clearTimeout(clientTimeout);
    }
  }

  // "error"는 별도 갈래(재시도용)라 진행바 기준 스텝 순서에는 없다 —
  // 직전까지 진행한 위치(loading 직전, 즉 personality)만큼 채워서 보여준다.
  const progressStep = step === "error" ? "personality" : step;
  const progress = ((STEP_ORDER.indexOf(progressStep) + 1) / STEP_ORDER.length) * 100;

  return (
    <StepShell stepKey={step} progress={progress}>
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

      {step === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
          <Button size="lg" onClick={handleFetchDiagnosis} className="h-13 w-full max-w-xs rounded-full text-base">
            다시 시도하기
          </Button>
          <button
            type="button"
            onClick={restart}
            className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
          >
            처음부터 다시 입력할게요
          </button>
        </div>
      )}

      {step === "result" && diagnosis && (
        <>
          <ResultStep diagnosis={diagnosis} />
          <button
            type="button"
            onClick={restart}
            className="mt-6 w-full text-center text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
          >
            다른 생년월일로 다시 보기
          </button>
        </>
      )}
    </StepShell>
  );
}
