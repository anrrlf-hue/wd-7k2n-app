"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RealityAnswer, RealityAnswerDomain } from "@/lib/reality-answer-contract";
import type { RealityAnswerEngineResult } from "@/lib/reality-answer-engine";
import type { OnnxPalmLines, PalmFacts } from "@/lib/palm-facts";
import { buildPalmReadingSections } from "@/lib/palm-observation-text";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import {
  SAJU_FOCUS_LABELS,
  SAJU_FOCUS_VALUES,
  parseSajuFocus,
  type SajuFocus,
} from "@/lib/saju-focus";
import { track } from "@/lib/analytics";
import { saveRealityAnswer } from "@/lib/reality-management";
import { buildReadingStyleV1View } from "@/lib/reading-style-v1";
import type { QuestionEnginePlan, QuestionFollowUp } from "@/lib/question-engine-v0";
import { buildRealityPalmContext, type RealityDominantHand } from "@/lib/reality-palm-context";

type FunnelStage = "intro" | "question" | "preview" | "result";

interface RealityFunnelResume {
  stage: FunnelStage;
  focus?: SajuFocus | string | null;
  /** V1 하위호환: 과거 7개 domain 값도 parseSajuFocus가 새 5개 선택으로 흡수한다. */
  domain?: string | null;
  question: string;
  answer: RealityAnswer | null;
  questionPlan?: QuestionEnginePlan | null;
  history?: Array<{ raw: string; domain: RealityAnswerDomain }>;
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

function palmSummaryForFocus(facts: PalmFacts | null | undefined, focus: SajuFocus): string | null {
  if (!facts?.onnxLines) return null;
  const sections = buildPalmReadingSections(facts.onnxLines, facts.secondaryLines, {
    handShape: facts.handShape,
    handSide: facts.handSide,
  });
  const preferred: Record<SajuFocus, Array<(typeof sections)[number]["key"]>> = {
    overall: ["coreStory", "secondaryTogether", "overview", "together", "fate", "sun", "wealthLine", "headLine", "heartLine", "lifeLine"],
    love_relationship: ["heartLine", "together"],
    work: ["fate", "sun", "secondaryTogether", "coreStory", "headLine", "together"],
    money: ["wealthLine", "secondaryTogether", "wealth", "coreStory", "headLine", "lifeLine"],
    wellbeing: ["lifeLine", "together"],
  };

  const picked: string[] = [];
  for (const key of preferred[focus]) {
    const found = sections.find((section) => section.key === key);
    if (!found) continue;
    picked.push(found.text);
    if (focus !== "overall" || picked.length >= 2) break;
  }
  return picked.length > 0 ? picked.join(" ") : null;
}

function PalmContribution({
  facts,
  focus,
  compact = false,
}: {
  facts: PalmFacts | null | undefined;
  focus: SajuFocus;
  compact?: boolean;
}) {
  const summary = palmSummaryForFocus(facts, focus);
  if (!summary) return null;

  return (
    <section className={compact ? "mt-4 rounded-2xl bg-accent p-4" : "mt-3 rounded-2xl border border-(--gold-soft) bg-card p-5"}>
      <p className="section-eyebrow">손금을 함께 보면</p>
      <p className="mt-2 text-base leading-7 text-muted-foreground">{summary}</p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        손금은 시기를 다시 계산하지 않습니다. 사주가 흐름과 시기를 보고, 손금은 지금 드러난 판단·관계·생활 방식을 보완해서 함께 봅니다.
      </p>
    </section>
  );
}

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
                {index === 0 ? "가장 강하게 보이는 시기" : index === 1 ? "두 번째로 눈여겨볼 시기" : "세 번째로 눈여겨볼 시기"}
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
  palmFacts,
  leftPalmFacts,
  rightPalmFacts,
  dominantHand,
  resumeKey,
  onStart,
  onChapterChange,
  initialFocus = "overall",
  initialQuestion = null,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmLines?: OnnxPalmLines | null;
  palmFacts?: PalmFacts | null;
  leftPalmFacts?: PalmFacts | null;
  rightPalmFacts?: PalmFacts | null;
  dominantHand?: RealityDominantHand | null;
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
  const [questionPlan, setQuestionPlan] = useState<QuestionEnginePlan | null>(
    initialQuestion ? null : stored?.questionPlan ?? null,
  );
  const [history, setHistory] = useState<Array<{ raw: string; domain: RealityAnswerDomain }>>(
    initialQuestion ? [] : stored?.history ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ stage, focus, question, answer, questionPlan, history } satisfies RealityFunnelResume),
    );
  }, [storageKey, stage, focus, question, answer, questionPlan, history]);

  useEffect(() => {
    if (stage === "intro") return;
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  }, [stage]);

  const placeholder = useMemo(() => EXAMPLES[focus], [focus]);

  async function submitQuestion(questionOverride?: string, focusOverride?: SajuFocus) {
    const trimmed = (questionOverride ?? question).trim();
    if (trimmed.length < 1) {
      setError("궁금한 내용을 적어주세요.");
      return;
    }
    const effectiveFocus = focusOverride ?? focus;
    const previous = history.length > 0 ? history[history.length - 1] : null;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reality-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          question: trimmed,
          focusHint: effectiveFocus,
          previousQuestion: previous?.raw ?? null,
          previousDomain: previous?.domain ?? null,
          palmLines: palmFacts?.onnxLines ?? palmLines ?? null,
          palmContext: buildRealityPalmContext({
            primary: palmFacts ?? null,
            left: leftPalmFacts ?? null,
            right: rightPalmFacts ?? null,
            dominantHand: dominantHand ?? null,
          }),
          personalityAnswers: personalityInput?.personalityAnswers ?? undefined,
          mbti: personalityInput?.mbti ?? undefined,
        }),
      });
      const data = (await response.json()) as RealityAnswerEngineResult & {
        error?: string;
        questionPlan?: QuestionEnginePlan;
      };
      if (!response.ok) throw new Error(data.error || "사주답변을 만들지 못했습니다.");

      if (data.status === "needs_clarification") {
        setError(data.reason);
        return;
      }

      setAnswer(data.answer);
      if (data.questionPlan) {
        setQuestionPlan(data.questionPlan);
        setFocus(data.questionPlan.focus);
      }
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last?.raw === data.answer.question.raw && last.domain === data.answer.question.domain) return prev;
        return [...prev, { raw: data.answer.question.raw, domain: data.answer.question.domain }].slice(-8);
      });
      setQuestion(data.answer.question.raw);
      setStage("preview");
      onChapterChange(4);
      track("reality_answer_preview_viewed", {
        focus: data.questionPlan?.focus ?? effectiveFocus,
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
    setQuestionPlan(null);
    setError(null);
    setStage("question");
    onChapterChange(4);
  }

  function askFollowUp(item: QuestionFollowUp) {
    setQuestion(item.question);
    setFocus(item.focus);
    setError(null);
    void submitQuestion(item.question, item.focus);
  }

  const style = answer
    ? buildReadingStyleV1View(answer, questionPlan?.nextQuestions ?? [])
    : null;

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
              ? `“${initialQuestion}” 질문을 다시 묻지 않고 이어봅니다. 사주는 흐름과 시기를 보고, 손금은 지금 드러난 판단·관계·생활 방식을 보완해 두 결과를 한 답으로 합칩니다.`
              : "질문에 대한 답과 함께, 사주 흐름에서 가장 먼저 눈여겨볼 시기를 같이 짚어드립니다."}
          </p>
          <Button size="lg" onClick={startQuestion} disabled={loading} className="mt-5 h-14 w-full rounded-full text-base">
            {loading ? "사주와 손금을 함께 보고 있어요..." : initialQuestion ? "사주+손금 종합답 보기" : "지금 궁금한 것 물어보기"}
          </Button>
        </div>
      )}

      {stage === "question" && (
        <div>
          <p className="section-eyebrow">내 질문</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">무엇이 가장 궁금하세요?</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            길게 설명하지 않아도 됩니다. “돈”, “사업”, “동업은?”, “내년 이직?”처럼 평소 말하듯 짧게 적어도 앞의 질문과 사주 흐름을 이어서 봅니다.
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
            <PalmContribution facts={palmFacts} focus={focus} compact />
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
            {palmFacts ? "사주+손금 종합풀이 보기" : "전체 사주풀이 보기"}
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
          <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · {palmFacts ? "사주+손금 풀이" : "내 질문 사주풀이"}</p>
          <h2 className="mt-2 text-2xl leading-snug font-semibold">{answer.question.raw}</h2>

          <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">먼저 답하면</p>
            <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
          </section>

          {style && (
            <section className="mt-5 space-y-3">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-lg font-semibold">{style.personalTitle}</h3>
                <p className="mt-3 whitespace-pre-line text-base leading-8 text-muted-foreground">
                  {style.personalMeaning}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-lg font-semibold">{style.currentTitle}</h3>
                <p className="mt-3 whitespace-pre-line text-base leading-8 text-muted-foreground">
                  {style.currentFlow}
                </p>
              </div>
            </section>
          )}

          <TimingBlock answer={answer} />

          {style && (
            <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
              <h3 className="text-lg font-semibold">{style.futureTitle}</h3>
              <p className="mt-3 whitespace-pre-line text-base leading-8 text-muted-foreground">
                {style.futureMeaning}
              </p>
            </section>
          )}

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">{style?.patternTitle ?? "이런 패턴은 반복될 수 있어요"}</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.repeatingPattern}</p>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">{style?.cautionTitle ?? "여기서는 이것만 조심해서 보세요"}</p>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.avoid}</p>
            {answer.realityChecks.length > 0 && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-xs font-semibold text-foreground/70">현실에서 같이 볼 것</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {answer.realityChecks.join(" · ")}
                </p>
              </div>
            )}
          </section>

          {answer.safetyNote && (
            <p className="mt-4 rounded-2xl bg-accent p-4 text-sm leading-6 text-muted-foreground">
              {answer.safetyNote}
            </p>
          )}

          {questionPlan?.nextQuestions?.length ? (
            <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
              <p className="section-eyebrow">{style?.nextTitle ?? "이어서 무엇이 더 궁금하세요?"}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                방금 답에서 다음으로 자연스럽게 이어지는 질문만 골랐습니다.
              </p>
              <div className="mt-3 grid gap-2">
                {questionPlan.nextQuestions.slice(0, 3).map((item) => (
                  <button
                    key={item.label + item.question}
                    type="button"
                    disabled={loading}
                    onClick={() => askFollowUp(item)}
                    className="min-h-12 rounded-xl border border-border bg-accent px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-(--gold)"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

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
