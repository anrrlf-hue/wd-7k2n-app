"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StepShell } from "@/components/diagnosis/step-shell";
import { BirthDateStep } from "@/components/diagnosis/birth-date-step";
import { BirthTimeStep } from "@/components/diagnosis/birth-time-step";
import { PersonalityStep } from "@/components/diagnosis/personality-step";
import { LoadingStep } from "@/components/diagnosis/loading-step";
import { ResultStep } from "@/components/diagnosis/result-step";
import { SajuFocusStep } from "@/components/diagnosis/saju-focus-step";
import { QuestionFirstStep } from "@/components/diagnosis/question-first-step";
import { QuestionAnswerResult } from "@/components/diagnosis/question-answer-result";
import type { BirthInput, FullSajuDiagnosis } from "@/lib/saju";
import type { MbtiType } from "@/lib/mbti-facts";
import { parseSajuFocus, type SajuFocus } from "@/lib/saju-focus";
import type { RealityAnswer } from "@/lib/reality-answer-contract";
import type { RealityAnswerEngineResult } from "@/lib/reality-answer-engine";

type JourneyMode = "free" | "question";
type Step =
  | "focus"
  | "question"
  | "date"
  | "time"
  | "personality"
  | "loading"
  | "answering"
  | "result"
  | "answer"
  | "error";

const FREE_STORAGE_KEY = "saju-app:diagnosis-session:v2";
const QUESTION_STORAGE_KEY = "saju-app:question-first-session:v1";
const CLIENT_TIMEOUT_MS = 30000;

interface StoredFreeSession {
  focus?: SajuFocus;
  birthDate: string;
  gender: "남" | "여";
  knowsTime: boolean;
  birthTime: string;
  mbti: MbtiType | "모름";
  diagnosis: FullSajuDiagnosis;
}

interface StoredQuestionSession {
  focus: SajuFocus;
  question: string;
  birthDate: string;
  gender: "남" | "여";
  knowsTime: boolean;
  birthTime: string;
  mbti: MbtiType | "모름";
  answer: RealityAnswer;
}

function journeyModeFromLocation(): JourneyMode {
  if (typeof window === "undefined") return "free";
  return new URLSearchParams(window.location.search).get("mode") === "question" ? "question" : "free";
}

function birthInputFromState(input: {
  birthDate: string;
  gender: "남" | "여";
  knowsTime: boolean;
  birthTime: string;
}): BirthInput | null {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  const [hour, minute] =
    input.knowsTime && input.birthTime
      ? input.birthTime.split(":").map(Number)
      : [null, null];

  return {
    year,
    month,
    day,
    hour,
    minute,
    gender: input.gender,
  };
}

export default function DiagnosisPage() {
  const [mode, setMode] = useState<JourneyMode>("free");
  const [focus, setFocus] = useState<SajuFocus | null>(null);
  const [step, setStep] = useState<Step>("focus");
  const [question, setQuestion] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"남" | "여">("남");
  const [knowsTime, setKnowsTime] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [mbti, setMbti] = useState<MbtiType | "모름">("모름");
  const [diagnosis, setDiagnosis] = useState<FullSajuDiagnosis | null>(null);
  const [questionAnswer, setQuestionAnswer] = useState<RealityAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const nextMode: JourneyMode = params.get("mode") === "question" ? "question" : "free";
      const focusParam = params.get("focus");
      const urlFocus = focusParam ? parseSajuFocus(focusParam) : null;
      setMode(nextMode);

      if (nextMode === "question") {
        const raw = sessionStorage.getItem(QUESTION_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as StoredQuestionSession;
          if (saved?.answer && saved?.focus) {
            setFocus(parseSajuFocus(saved.focus));
            setQuestion(saved.question);
            setBirthDate(saved.birthDate);
            setGender(saved.gender);
            setKnowsTime(saved.knowsTime);
            setBirthTime(saved.birthTime);
            setMbti(saved.mbti);
            setQuestionAnswer(saved.answer);
            setStep("answer");
            return;
          }
        }

        if (params.get("from") === "free") {
          const freeRaw = sessionStorage.getItem(FREE_STORAGE_KEY);
          if (freeRaw) {
            const saved = JSON.parse(freeRaw) as StoredFreeSession;
            if (saved?.diagnosis) {
              const nextFocus = urlFocus ?? parseSajuFocus(String(saved.focus ?? saved.diagnosis.focus ?? "overall"));
              setFocus(nextFocus);
              setBirthDate(saved.birthDate);
              setGender(saved.gender);
              setKnowsTime(saved.knowsTime);
              setBirthTime(saved.birthTime);
              setMbti(saved.mbti);
              setStep("question");
              return;
            }
          }
        }

        setFocus(urlFocus);
        setStep("focus");
        return;
      }

      const raw = sessionStorage.getItem(FREE_STORAGE_KEY);
      if (!raw) {
        const directFreeStart = params.get("start") === "free";
        const nextFocus = urlFocus ?? (directFreeStart ? "overall" : null);
        setFocus(nextFocus);
        setStep(directFreeStart && nextFocus ? "date" : "focus");
        return;
      }

      const saved = JSON.parse(raw) as StoredFreeSession;
      if (!saved?.diagnosis) {
        setFocus(urlFocus);
        setStep("focus");
        return;
      }

      setFocus(parseSajuFocus(String(saved.focus ?? saved.diagnosis.focus ?? urlFocus ?? "overall")));
      setBirthDate(saved.birthDate);
      setGender(saved.gender);
      setKnowsTime(saved.knowsTime);
      setBirthTime(saved.birthTime);
      setMbti(saved.mbti);
      setDiagnosis(saved.diagnosis);
      setStep("result");
    } catch {
      // 세션을 읽지 못해도 새 흐름으로 진행한다.
    }
  }, []);

  function clearCurrentSession() {
    try {
      sessionStorage.removeItem(mode === "question" ? QUESTION_STORAGE_KEY : FREE_STORAGE_KEY);
    } catch {
      // 저장소 접근 실패는 현재 폼 진행을 막지 않는다.
    }
  }

  function restart() {
    clearCurrentSession();
    const params = new URLSearchParams(window.location.search);
    const focusParam = params.get("focus");
    setFocus(focusParam ? parseSajuFocus(focusParam) : null);
    setQuestion("");
    setBirthDate("");
    setKnowsTime(false);
    setBirthTime("");
    setMbti("모름");
    setDiagnosis(null);
    setQuestionAnswer(null);
    setError(null);
    setStep("focus");
  }

  function askAgain() {
    try {
      sessionStorage.removeItem(QUESTION_STORAGE_KEY);
    } catch {
      // 무시
    }
    setQuestion("");
    setQuestionAnswer(null);
    setError(null);
    setStep(focus ? "question" : "focus");
  }

  async function handleFetchDiagnosis() {
    if (!focus) {
      setStep("focus");
      return;
    }

    const birthInput = birthInputFromState({ birthDate, gender, knowsTime, birthTime });
    if (!birthInput) {
      setStep("date");
      return;
    }

    setStep("loading");
    setError(null);

    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          focus,
          mbti: mbti !== "모름" ? mbti : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("failed");
      const data: FullSajuDiagnosis = await res.json();
      setDiagnosis(data);
      setStep("result");

      try {
        const toStore: StoredFreeSession = {
          focus,
          birthDate,
          gender,
          knowsTime,
          birthTime,
          mbti,
          diagnosis: data,
        };
        sessionStorage.setItem(FREE_STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // 저장 실패는 현재 결과 표시를 막지 않는다.
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setError(
        isTimeout
          ? "서버 응답이 평소보다 오래 걸리고 있어요. 네트워크 상태를 확인하고 다시 시도해주세요."
          : "사주 계산 중 문제가 생겼어요. 다시 시도해주세요.",
      );
      setStep("error");
    } finally {
      clearTimeout(clientTimeout);
    }
  }

  async function handleFetchQuestionAnswer() {
    if (!focus) {
      setStep("focus");
      return;
    }
    if (question.trim().length < 2) {
      setError("궁금한 내용을 조금만 더 적어주세요.");
      setStep("question");
      return;
    }

    const birthInput = birthInputFromState({ birthDate, gender, knowsTime, birthTime });
    if (!birthInput) {
      setStep("date");
      return;
    }

    setStep("answering");
    setError(null);

    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    try {
      const res = await fetch("/api/reality-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          question: question.trim(),
          focusHint: focus,
          mbti: mbti !== "모름" ? mbti : undefined,
        }),
        signal: controller.signal,
      });

      const data = (await res.json()) as RealityAnswerEngineResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "사주답변을 만들지 못했습니다.");

      if (data.status === "needs_clarification") {
        setError(data.reason);
        setStep("question");
        return;
      }

      setQuestionAnswer(data.answer);
      setStep("answer");

      try {
        const toStore: StoredQuestionSession = {
          focus,
          question: question.trim(),
          birthDate,
          gender,
          knowsTime,
          birthTime,
          mbti,
          answer: data.answer,
        };
        sessionStorage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // 저장 실패는 현재 결과 표시를 막지 않는다.
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setError(
        isTimeout
          ? "답과 시기를 보는 데 평소보다 오래 걸리고 있어요. 잠시 후 다시 시도해주세요."
          : err instanceof Error
            ? err.message
            : "사주답변을 만들지 못했습니다.",
      );
      setStep("error");
    } finally {
      clearTimeout(clientTimeout);
    }
  }

  const progressLabel =
    mode === "question"
      ? step === "focus"
        ? "분야 선택 · 1 / 5"
        : step === "question"
          ? "내 질문 · 2 / 5"
          : step === "date"
            ? "출생정보 · 3 / 5"
            : step === "time"
              ? "출생정보 · 4 / 5"
              : step === "personality"
                ? "MBTI · 5 / 5 · 선택사항"
                : "답과 시기 보는 중"
      : undefined;

  const progress =
    mode === "question"
      ? step === "focus"
        ? 20
        : step === "question"
          ? 40
          : step === "date"
            ? 60
            : step === "time"
              ? 80
              : 100
      : step === "focus"
        ? 25
        : step === "date"
          ? 50
          : step === "time"
            ? 75
            : 100;

  const answerBirthInput = birthInputFromState({ birthDate, gender, knowsTime, birthTime });

  return (
    <StepShell stepKey={step} progress={progress} progressLabel={progressLabel}>
      {step === "focus" && (
        <SajuFocusStep
          value={focus}
          onChange={(value) => {
            setFocus(value);
            setError(null);
          }}
          onNext={() => setStep(mode === "question" ? "question" : "date")}
          mode={mode}
        />
      )}

      {step === "question" && focus && (
        <QuestionFirstStep
          focus={focus}
          value={question}
          error={error}
          hasBirthInfo={Boolean(birthDate)}
          onChange={(value) => {
            setQuestion(value);
            setError(null);
          }}
          onNext={() => {
            if (birthDate) {
              void handleFetchQuestionAnswer();
            } else {
              setStep("date");
            }
          }}
          onBack={() => setStep("focus")}
        />
      )}

      {step === "date" && (
        <BirthDateStep
          value={birthDate}
          onChange={setBirthDate}
          gender={gender}
          onGenderChange={setGender}
          onNext={() => setStep("time")}
          onBack={() => setStep(mode === "question" ? "question" : "focus")}
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
          mbti={mbti}
          onMbtiChange={setMbti}
          onNext={() => {
            if (mode === "question") void handleFetchQuestionAnswer();
            else void handleFetchDiagnosis();
          }}
          onBack={() => setStep("time")}
        />
      )}

      {step === "loading" && <LoadingStep />}
      {step === "answering" && <LoadingStep mode="question" />}

      {step === "error" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
          <Button
            size="lg"
            onClick={() => {
              if (mode === "question") void handleFetchQuestionAnswer();
              else void handleFetchDiagnosis();
            }}
            className="h-13 w-full max-w-xs rounded-full text-base"
          >
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

      {step === "answer" && focus && questionAnswer && answerBirthInput && (
        <QuestionAnswerResult
          focus={focus}
          question={question}
          birthInput={answerBirthInput}
          mbti={mbti === "모름" ? null : mbti}
          answer={questionAnswer}
          onAskAgain={askAgain}
        />
      )}
    </StepShell>
  );
}
