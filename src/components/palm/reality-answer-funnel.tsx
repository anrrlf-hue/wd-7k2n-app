"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  REALITY_ANSWER_DOMAINS,
  REALITY_ANSWER_DOMAIN_LABELS,
  type RealityAnswer,
  type RealityAnswerDomain,
} from "@/lib/reality-answer-contract";
import type { RealityAnswerEngineResult } from "@/lib/reality-answer-engine";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import { track } from "@/lib/analytics";

type FunnelStage = "intro" | "question" | "preview" | "result";

interface RealityFunnelResume {
  stage: FunnelStage;
  domain: RealityAnswerDomain | null;
  question: string;
  answer: RealityAnswer | null;
}

const EXAMPLES: Record<RealityAnswerDomain, string> = {
  love: "예: 지금 만나는 사람과 계속 만나도 될까요?",
  career: "예: 지금 이직을 준비하는 게 맞을까요?",
  work_business: "예: 회사 그만두고 사업을 시작해도 될까요?",
  money: "예: 왜 돈이 들어와도 계속 안 모일까요?",
  relationship: "예: 사람들과 자꾸 부딪히는데 뭘 바꿔야 할까요?",
  wellbeing: "예: 요즘 너무 지치는데 생활을 어떻게 바꿔야 할까요?",
  overall: "예: 지금 뭔가 바꿔야 할 것 같은데 움직일 때인가요?",
};

const INCLUDED = [
  "지금 질문에 대한 핵심 답변",
  "왜 이 고민이 지금 커졌는지",
  "반복하기 쉬운 선택 패턴",
  "지금 피할 선택과 우선할 선택",
  "바로 실행할 행동 3가지",
  "다시 판단할 시점",
  "사주로 알 수 없어 현실에서 확인할 조건",
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

export function RealityAnswerFunnel({
  birthInput,
  personalityInput,
  palmLines,
  resumeKey,
  onStart,
  onChapterChange,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmLines?: OnnxPalmLines | null;
  resumeKey: string;
  onStart: () => void;
  onChapterChange: (chapter: 3 | 4 | 5) => void;
}) {
  const storageKey = `${resumeKey}:reality-answer`;
  const stored = readResume(storageKey);
  const [stage, setStage] = useState<FunnelStage>(stored?.stage ?? "intro");
  const [domain, setDomain] = useState<RealityAnswerDomain | null>(stored?.domain ?? null);
  const [question, setQuestion] = useState(stored?.question ?? "");
  const [answer, setAnswer] = useState<RealityAnswer | null>(stored?.answer ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ stage, domain, question, answer } satisfies RealityFunnelResume),
    );
  }, [storageKey, stage, domain, question, answer]);

  useEffect(() => {
    if (stage === "intro") return;
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  }, [stage]);

  const placeholder = useMemo(
    () => (domain ? EXAMPLES[domain] : "지금 가장 궁금한 것을 편하게 적어주세요."),
    [domain],
  );

  async function submitQuestion() {
    const trimmed = question.trim();
    if (!domain) {
      setError("먼저 가장 가까운 주제를 하나 골라주세요.");
      return;
    }
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
          domainHint: domain,
          palmLines: palmLines ?? null,
          personalityAnswers: personalityInput?.personalityAnswers ?? undefined,
          mbti: personalityInput?.mbti ?? undefined,
        }),
      });
      const data = (await response.json()) as RealityAnswerEngineResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "현실답변을 만들지 못했습니다.");

      if (data.status === "needs_clarification") {
        setError(data.reason);
        return;
      }

      setAnswer(data.answer);
      setStage("preview");
      onChapterChange(4);
      track("reality_answer_preview_viewed", {
        domain: data.answer.question.domain,
        source: data.source,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "현실답변을 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function startQuestion() {
    onStart();
    onChapterChange(4);
    setStage("question");
    track("reality_answer_started");
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
          <p className="section-eyebrow">사주풀이를 현실로</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">
            이제 가장 궁금한 것을
            <br />
            직접 물어보세요
          </h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            연애, 돈, 취업·이직, 직장·사업, 인간관계, 생활·건강처럼 지금의 고민을
            하나 고르면 사주와 현재 흐름을 바탕으로 무엇을 확인하고 어떻게 움직일지 이어서 봅니다.
          </p>
          <Button size="lg" onClick={startQuestion} className="mt-5 h-14 w-full rounded-full text-base">
            지금 궁금한 것 물어보기
          </Button>
        </div>
      )}

      {stage === "question" && (
        <div>
          <p className="section-eyebrow">내 질문</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">지금 가장 답을 얻고 싶은 것은 무엇인가요?</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            가까운 주제를 하나 고른 뒤, 실제 고민을 평소 말하듯 적어주세요.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {REALITY_ANSWER_DOMAINS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={domain === item}
                onClick={() => {
                  setDomain(item);
                  setError(null);
                }}
                className={
                  "min-h-12 rounded-2xl border px-3 py-2 text-sm transition-colors " +
                  (domain === item
                    ? "border-(--gold) bg-(--gold-soft) font-semibold text-foreground"
                    : "border-border bg-card text-foreground/80")
                }
              >
                {REALITY_ANSWER_DOMAIN_LABELS[item]}
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
            {loading ? "내 질문을 보고 있어요..." : "내 질문으로 현실답변 보기"}
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
          <p className="section-eyebrow">{REALITY_ANSWER_DOMAIN_LABELS[answer.question.domain]} · 현실답변</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">이 질문에서 먼저 볼 것은 이것입니다</h2>

          <div className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="text-sm text-muted-foreground">내 질문</p>
            <p className="mt-2 text-base leading-7 font-semibold">{answer.question.raw}</p>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">먼저 잡은 방향</p>
              <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-(--gold)" />
              <p className="font-semibold">사주 현실답변 전체 구성</p>
            </div>
            <ul className="mt-4 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                  <CheckCircle2 className="mt-1 size-4 shrink-0 text-(--gold)" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button
            size="lg"
            onClick={() => {
              setStage("result");
              onChapterChange(5);
              track("reality_answer_full_preview_viewed", { domain: answer.question.domain });
            }}
            className="mt-5 h-14 w-full rounded-full text-base"
          >
            <Sparkles className="size-4" />
            현실답변 전체 미리보기
          </Button>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            현재는 상품 검증 단계라 실제 결제 전 전체 구성을 미리 보여드립니다.
          </p>

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
          <p className="section-eyebrow">{REALITY_ANSWER_DOMAIN_LABELS[answer.question.domain]} · 사주 현실답변</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">{answer.question.raw}</h2>

          <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">핵심 답변</p>
            <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">왜 지금 이 고민이 커졌을까요?</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.whyNow}</p>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">반복하기 쉬운 패턴</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.repeatingPattern}</p>
          </section>

          <div className="mt-4 grid gap-3">
            <section className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">지금 피할 선택</p>
              <p className="mt-2 text-base leading-7 font-semibold">{answer.avoid}</p>
            </section>
            <section className="rounded-2xl border border-(--gold-soft) bg-card p-5">
              <p className="text-sm text-muted-foreground">지금 우선할 선택</p>
              <p className="mt-2 text-base leading-7 font-semibold">{answer.choose}</p>
            </section>
          </div>

          <section className="mt-6">
            <p className="section-eyebrow">현실에서 할 행동 3가지</p>
            <div className="mt-3 space-y-3">
              {answer.actions.map((item, index) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold text-(--gold)">0{index + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">{item.detail}</p>
                  <p className="mt-3 rounded-xl bg-accent px-3 py-2 text-sm leading-6">
                    완료 기준 · {item.doneWhen}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">언제 다시 판단할까요?</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.timing.now}</p>
            <p className="mt-2 text-base leading-7 font-medium">{answer.timing.nextCheckpoint}</p>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">현실에서 꼭 확인할 것</h3>
            <ul className="mt-3 space-y-2 text-base leading-7 text-muted-foreground">
              {answer.realityChecks.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </section>

          {answer.safetyNote && (
            <p className="mt-4 rounded-2xl bg-accent p-4 text-sm leading-6 text-muted-foreground">
              {answer.safetyNote}
            </p>
          )}

          <details className="mt-5 rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">이번 답변에 사용한 정보</summary>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {answer.evidence.map((item, index) => (
                <li key={`${item.source}-${item.label}-${index}`}>
                  · {item.label}: {item.detail}
                </li>
              ))}
            </ul>
          </details>

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            현재는 판매 전 상품 검증용 미리보기이며 실제 결제는 아직 연결하지 않았습니다.
          </p>

          <Button size="lg" variant="outline" onClick={resetQuestion} className="mt-5 h-13 w-full rounded-full text-base">
            다른 질문하기
          </Button>
        </div>
      )}
    </div>
  );
}
