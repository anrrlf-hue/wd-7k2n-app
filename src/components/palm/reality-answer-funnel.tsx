"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RealityAnswer } from "@/lib/reality-answer-contract";
import type { RealityAnswerEngineResult } from "@/lib/reality-answer-engine";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import {
  SAJU_FOCUS_LABELS,
  SAJU_FOCUS_VALUES,
  parseSajuFocus,
  type SajuFocus,
} from "@/lib/saju-focus";
import { track } from "@/lib/analytics";
import { saveRealityAnswer } from "@/lib/reality-management";

type FunnelStage = "intro" | "question" | "preview" | "result";

interface RealityFunnelResume {
  stage: FunnelStage;
  focus?: SajuFocus | string | null;
  /** V1 하위호환: 과거 7개 domain 값도 parseSajuFocus가 새 5개 선택으로 흡수한다. */
  domain?: string | null;
  question: string;
  answer: RealityAnswer | null;
}

const EXAMPLES: Record<SajuFocus, string> = {
  overall: "예: 앞으로 제 흐름은 언제 크게 바뀌나요?",
  love_relationship: "예: 여자친구는 언제 생길까요?",
  work: "예: 이직이나 일의 변화는 언제쯤 들어오나요?",
  money: "예: 제 재물 흐름은 언제 좋아지나요?",
  wellbeing: "예: 생활 리듬이 크게 바뀌는 시기가 있나요?",
};

const INCLUDED = [
  "질문에 대한 직접 답",
  "가장 먼저 눈여겨볼 시기",
  "현재 흐름과 앞으로의 변화",
  "반복해서 나타나기 쉬운 패턴",
  "풀이를 볼 때 주의할 점",
];

function readResume(key: string): RealityFunnelResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as RealityFunnelResume) : null;
  } catch {
    return null;
  }
}

function TimingBlock({ answer, compact = false }: { answer: RealityAnswer; compact?: boolean }) {
  if (answer.timing.windows && answer.timing.windows.length > 0) {
    return (
      <section className={compact ? "mt-4 rounded-2xl bg-accent p-4" : "mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5"}>
        <p className="section-eyebrow">눈여겨볼 시기</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer.timing.now}</p>

        <div className="mt-3 space-y-3">
          {answer.timing.windows.map((window, index) => (
            <div
              key={window.label}
              className={compact ? "rounded-xl bg-card/70 p-3" : "rounded-xl bg-accent p-4"}
            >
              <p className="text-xs font-semibold text-(--gold)">
                {index === 0 ? "가장 강하게 보이는 시기" : index === 1 ? "두 번째로 눈여겨볼 시기" : "한 번 더 살아나는 시기"}
              </p>
              <p className="mt-1 text-base font-semibold">{window.label}</p>

              <div className="mt-2">
                <p className="text-xs font-medium text-foreground/70">이때는</p>
                <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                  {window.meaning ?? window.reason}
                </p>
              </div>

              {window.positive && (
                <div className="mt-2 rounded-lg bg-background/70 px-3 py-2">
                  <p className="text-xs font-semibold text-(--gold)">좋은 흐름으로 나타나면</p>
                  <p className="mt-0.5 text-sm leading-6 text-foreground/80">{window.positive}</p>
                </div>
              )}

              {window.caution && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-foreground/70">조심할 점</p>
                  <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{window.caution}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {answer.timing.basis && (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{answer.timing.basis}</p>
        )}
      </section>
    );
  }

  return (
    <section className={compact ? "mt-4 rounded-2xl bg-accent p-4" : "mt-5 rounded-2xl border border-border bg-card p-5"}>
      <p className="section-eyebrow">현재 시기 흐름</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer.timing.now}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{answer.timing.nextCheckpoint}</p>
    </section>
  );
}

export function RealityAnswerFunnel({
  birthInput,
  personalityInput,
  palmLines,
  resumeKey,
  onStart,
  onChapterChange,
  initialFocus = "overall",
  initialQuestion = null,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmLines?: OnnxPalmLines | null;
  resumeKey: string;
  onStart: () => void;
  initialFocus?: SajuFocus;
  initialQuestion?: string | null;
  onChapterChange: (chapter: 3 | 4 | 5) => void;
}) {
  const storageKey = `${resumeKey}:reality-answer:v2`;
  const stored = readResume(storageKey);
  const storedFocus = parseSajuFocus(stored?.focus ?? stored?.domain ?? initialFocus);
  const [stage, setStage] = useState<FunnelStage>(initialQuestion ? "intro" : stored?.stage ?? "intro");
  const [focus, setFocus] = useState<SajuFocus>(initialFocus ?? storedFocus);
  const [question, setQuestion] = useState(initialQuestion ?? stored?.question ?? "");
  const [answer, setAnswer] = useState<RealityAnswer | null>(initialQuestion ? null : stored?.answer ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ stage, focus, question, answer } satisfies RealityFunnelResume),
    );
  }, [storageKey, stage, focus, question, answer]);

  useEffect(() => {
    if (stage === "intro") return;
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  }, [stage]);

  const placeholder = useMemo(() => EXAMPLES[focus], [focus]);

  async function submitQuestion(questionOverride?: string) {
    const trimmed = (questionOverride ?? question).trim();
    if (trimmed.length < 2) {
      setError("궁금한 내용을 조금만 더 적어주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reality-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          question: trimmed,
          focusHint: focus,
          palmLines: palmLines ?? null,
          personalityAnswers: personalityInput?.personalityAnswers ?? undefined,
          mbti: personalityInput?.mbti ?? undefined,
        }),
      });
      const data = (await response.json()) as RealityAnswerEngineResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "사주답변을 만들지 못했습니다.");

      if (data.status === "needs_clarification") {
        setError(data.reason);
        return;
      }

      setAnswer(data.answer);
      setStage("preview");
      onChapterChange(4);
      track("reality_answer_preview_viewed", {
        focus,
        domain: data.answer.question.domain,
        source: data.source,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "사주답변을 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function startQuestion() {
    onStart();
    onChapterChange(4);
    track("reality_answer_started", { focus, fromQuestionFirst: Boolean(initialQuestion) });

    if (initialQuestion?.trim()) {
      setQuestion(initialQuestion.trim());
      void submitQuestion(initialQuestion.trim());
      return;
    }

    setStage("question");
  }

  function resetQuestion() {
    setAnswer(null);
    setError(null);
    setStage("question");
    onChapterChange(4);
  }

  return (
    <div id="reality-answer-funnel" ref={topRef} className="mt-8 scroll-mt-6">
      {stage === "intro" && (
        <div className="transition-panel">
          <p className="section-eyebrow">{initialQuestion ? "손금까지 반영한 내 질문" : "내 질문 사주풀이"}</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">
            {initialQuestion ? (
              <>
                같은 질문을 손금까지
                <br />
                함께 봅니다
              </>
            ) : (
              <>
                가장 궁금한 것을
                <br />
                직접 물어보세요
              </>
            )}
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {initialQuestion
              ? `“${initialQuestion}” 질문에 사주와 방금 본 손금 흐름을 함께 반영합니다.`
              : "질문에 대한 답과 함께, 사주 흐름에서 가장 먼저 눈여겨볼 시기를 같이 짚어드립니다."}
          </p>
          <Button size="lg" onClick={startQuestion} disabled={loading} className="mt-5 h-14 w-full rounded-full text-base">
            {loading ? "손금까지 함께 보고 있어요..." : initialQuestion ? "손금까지 반영한 답 보기" : "지금 궁금한 것 물어보기"}
          </Button>
        </div>
      )}

      {stage === "question" && (
        <div>
          <p className="section-eyebrow">내 질문</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">무엇이 가장 궁금하세요?</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            처음과 같은 5개 분야에서 고르고, 궁금한 내용을 평소 말하듯 적어주세요.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {SAJU_FOCUS_VALUES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={focus === item}
                onClick={() => {
                  setFocus(item);
                  setError(null);
                }}
                className={
                  "min-h-12 rounded-2xl border px-3 py-2 text-sm transition-colors " +
                  (focus === item
                    ? "border-(--gold) bg-(--gold-soft) font-semibold text-foreground"
                    : "border-border bg-card text-foreground/80")
                }
              >
                {SAJU_FOCUS_LABELS[item]}
              </button>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="text-sm font-medium">궁금한 내용을 적어주세요</span>
            <textarea
              value={question}
              maxLength={500}
              onChange={(event) => {
                setQuestion(event.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              className="mt-2 min-h-32 w-full resize-none rounded-2xl border border-border bg-card p-4 text-base leading-7 outline-none focus:border-(--gold)"
            />
          </label>

          {error && <p className="mt-3 text-sm leading-6 text-destructive">{error}</p>}

          <Button
            size="lg"
            disabled={loading}
            onClick={() => void submitQuestion()}
            className="mt-5 h-14 w-full rounded-full text-base"
          >
            {loading ? "답과 시기를 보고 있어요..." : "답과 시기 보기"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStage("intro");
              onChapterChange(3);
            }}
            className="mt-4 min-h-11 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            이전 결과로 돌아가기
          </button>
        </div>
      )}

      {stage === "preview" && answer && (
        <div>
          <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 내 질문 풀이</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">답과 시기를 먼저 보면</h2>

          <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="text-sm text-muted-foreground">내 질문</p>
            <p className="mt-2 text-base leading-7 font-semibold">{answer.question.raw}</p>
            <div className="mt-4 border-t border-border pt-4">
              <p className="section-eyebrow">먼저 답하면</p>
              <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
            </div>
            <TimingBlock answer={answer} compact />
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <p className="font-semibold">전체 풀이에서 이어서 보는 내용</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {INCLUDED.slice(2).map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </section>

          <Button
            size="lg"
            onClick={() => {
              const record = saveRealityAnswer({ birthInput, answer });
              setSavedRecordId(record.id);
              setStage("result");
              onChapterChange(5);
              track("reality_answer_full_preview_viewed", { focus, domain: answer.question.domain });
            }}
            className="mt-5 h-14 w-full rounded-full text-base"
          >
            <Sparkles className="size-4" />
            전체 사주풀이 보기
          </Button>

          <button
            type="button"
            onClick={resetQuestion}
            className="mt-4 min-h-11 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            질문 수정하기
          </button>
        </div>
      )}

      {stage === "result" && answer && (
        <div>
          <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 내 질문 사주풀이</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">{answer.question.raw}</h2>

          <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">먼저 답하면</p>
            <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
          </section>

          <TimingBlock answer={answer} />

          {answer.report && (
            <section className="mt-5">
              <p className="section-eyebrow">내 질문 사주풀이</p>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-lg font-semibold">이 질문을 사주로 풀면</h3>
                  <p className="mt-3 whitespace-pre-line text-base leading-8 text-muted-foreground">
                    {answer.report.questionReading}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-lg font-semibold">지금의 흐름</h3>
                  <p className="mt-3 whitespace-pre-line text-base leading-8 text-muted-foreground">
                    {answer.report.currentFlow}
                  </p>
                </div>
                <div className="rounded-2xl border border-(--gold-soft) bg-card p-5">
                  <h3 className="text-lg font-semibold">앞으로 어떻게 나타날 수 있나요?</h3>
                  <p className="mt-3 whitespace-pre-line text-base leading-8 text-muted-foreground">
                    {answer.report.solutionReading}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">반복해서 나타나기 쉬운 흐름</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.repeatingPattern}</p>
          </section>

          <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="text-sm text-muted-foreground">가장 중요하게 볼 점</p>
            <p className="mt-2 text-base leading-7 font-semibold">{answer.choose}</p>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">주의해서 볼 점</p>
            <p className="mt-2 text-base leading-7">{answer.avoid}</p>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">결과를 달라지게 할 수 있는 현실 변수</h3>
            <ul className="mt-3 space-y-2 text-base leading-7 text-muted-foreground">
              {answer.realityChecks.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </section>

          {answer.safetyNote && (
            <p className="mt-4 rounded-2xl bg-accent p-4 text-sm leading-6 text-muted-foreground">
              {answer.safetyNote}
            </p>
          )}

          {savedRecordId && (
            <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
              <p className="font-semibold">내 관리에 저장했습니다</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                질문, 받은 답, 눈여겨볼 시기와 메모를 다시 볼 수 있습니다.
              </p>
              <Button asChild size="lg" className="mt-4 h-13 w-full rounded-full text-base">
                <Link href="/management">내 관리에서 다시 보기</Link>
              </Button>
            </div>
          )}

          <Button size="lg" variant="outline" onClick={resetQuestion} className="mt-5 h-13 w-full rounded-full text-base">
            다른 질문하기
          </Button>
        </div>
      )}
    </div>
  );
}
