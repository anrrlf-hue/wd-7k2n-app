"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonCompareCard } from "@/components/diagnosis/person-compare-card";
import type { BirthInput, FullSajuDiagnosis, PersonalityInputEcho } from "@/lib/saju";
import {
  SAJU_DETAIL_FOCUS_VALUES,
  SAJU_FOCUS_LABELS,
  SAJU_FOCUS_SHORT_DESCRIPTIONS,
  type SajuDetailFocus,
} from "@/lib/saju-focus";
import type { PalmFacts } from "@/lib/palm-facts";
import type { RealityDominantHand } from "@/lib/reality-palm-context";
import { buildRealityPalmContext } from "@/lib/reality-palm-context";
import type { RealityAnswer } from "@/lib/reality-answer-contract";
import type { RealityAnswerEngineResult } from "@/lib/reality-answer-engine";
import type { QuestionEnginePlan } from "@/lib/question-engine-v0";
import { buildReadingStyleV1View } from "@/lib/reading-style-v1";
import { track } from "@/lib/analytics";

type Stage = "focus" | "loading_detail" | "detail" | "question" | "answer";
type FocusedReport = NonNullable<FullSajuDiagnosis["focusedReport"]>;

const QUESTION_EXAMPLES: Record<SajuDetailFocus, string[]> = {
  love_relationship: ["연애운은 언제 움직이나요?", "지금 관계에서 가장 조심할 점은?"],
  work: ["지금 일의 변화는 언제가 좋나요?", "사업과 직장 중 어떤 흐름을 더 봐야 하나요?"],
  money: ["돈 흐름이 좋아지는 시기는 언제인가요?", "저는 어떤 방식으로 돈을 만드는 편인가요?"],
  wellbeing: ["생활 리듬이 바뀌는 시기는 언제인가요?", "요즘 쉽게 지치는 흐름은 언제 달라지나요?"],
};

function TimingSummary({ answer }: { answer: RealityAnswer }) {
  return (
    <section className="mt-4 rounded-2xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-(--gold)" />
        <h3 className="font-semibold">시기를 보면</h3>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer.timing.now}</p>
      {answer.timing.windows?.slice(0, 2).map((window) => (
        <div key={window.label} className="mt-3 rounded-xl bg-accent p-3">
          <p className="text-sm font-semibold">{window.label}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{window.meaning ?? window.reason}</p>
        </div>
      ))}
    </section>
  );
}
export function PostReadingDetailFlow({
  birthInput,
  personalityInput,
  palmFacts,
  leftPalmFacts,
  rightPalmFacts,
  dominantHand,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  palmFacts?: PalmFacts | null;
  leftPalmFacts?: PalmFacts | null;
  rightPalmFacts?: PalmFacts | null;
  dominantHand?: RealityDominantHand | null;
}) {
  const [stage, setStage] = useState<Stage>("focus");
  const [focus, setFocus] = useState<SajuDetailFocus | null>(null);
  const [focusedReport, setFocusedReport] = useState<FocusedReport | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<RealityAnswer | null>(null);
  const [questionPlan, setQuestionPlan] = useState<QuestionEnginePlan | null>(null);
  const [history, setHistory] = useState<Array<{ raw: string; domain: RealityAnswer["question"]["domain"] }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusShiftNotice, setFocusShiftNotice] = useState<string | null>(null);

  const examples = useMemo(() => (focus ? QUESTION_EXAMPLES[focus] : []), [focus]);

  async function loadDetail(nextFocus: SajuDetailFocus) {
    setFocus(nextFocus);
    setStage("loading_detail");
    setError(null);
    setFocusedReport(null);
    setAnswer(null);
    setQuestionPlan(null);
    setHistory([]);
    setFocusShiftNotice(null);

    try {
      const response = await fetch("/api/saju", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...birthInput,
          focus: nextFocus,
          mbti: personalityInput?.mbti ?? undefined,
        }),
      });
      const data = (await response.json()) as FullSajuDiagnosis & { error?: string };
      if (!response.ok || !data.focusedReport) {
        throw new Error(data.error || "세부 풀이를 만들지 못했습니다.");
      }
      setFocusedReport(data.focusedReport);
      setStage("detail");
      track("analysis_result_viewed", { mode: "detail_focus", focus: nextFocus });
    } catch (err) {
      setError(err instanceof Error ? err.message : "세부 풀이를 만들지 못했습니다.");
      setStage("focus");
    }
  }

  async function submitQuestion(raw?: string) {
    if (!focus) return;
    const trimmed = (raw ?? question).trim();
    if (!trimmed) {
      setError("궁금한 내용을 적어주세요.");
      return;
    }
    const previous = history[history.length - 1] ?? null;
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
          previousQuestion: previous?.raw ?? null,
          previousDomain: previous?.domain ?? null,
          palmLines: palmFacts?.onnxLines ?? null,
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
      if (!response.ok) throw new Error(data.error || "답을 만들지 못했습니다.");
      if (data.status === "needs_clarification") {
        setError(data.reason);
        return;
      }

      const nextPlan = data.questionPlan ?? null;
      const nextFocus = nextPlan?.focus;
      if (nextFocus && nextFocus !== "overall" && nextFocus !== focus) {
        setFocusShiftNotice(
          `질문 내용은 ${SAJU_FOCUS_LABELS[nextFocus]}에 더 가까워 그 분야 기준으로 답했습니다.`,
        );
        setFocus(nextFocus);
      } else {
        setFocusShiftNotice(null);
      }

      setAnswer(data.answer);
      setQuestionPlan(nextPlan);
      setQuestion(data.answer.question.raw);
      setHistory((prev) => [...prev, { raw: data.answer.question.raw, domain: data.answer.question.domain }].slice(-2));
      setStage("answer");
      track("question_answer_viewed", {
        kind: previous ? "followup" : "detail_question",
        focus: nextPlan?.focus ?? focus,
        domain: data.answer.question.domain,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "답을 만들지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }
  function backToFocus() {
    setStage("focus");
    setFocus(null);
    setFocusedReport(null);
    setQuestion("");
    setAnswer(null);
    setQuestionPlan(null);
    setHistory([]);
    setError(null);
    setFocusShiftNotice(null);
  }

  const style = answer ? buildReadingStyleV1View(answer, questionPlan?.nextQuestions ?? []) : null;
  const allowOneFollowUp = history.length < 2;

  return (
    <section className="mt-8 border-t border-border pt-8">
      {stage === "focus" && (
        <>
          <p className="section-eyebrow">사주·손금을 다 봤다면</p>
          <h2 className="mt-2 text-2xl leading-9 font-semibold">어떤 부분을 더 자세히 볼까요?</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            전체 사주는 앞에서 이미 봤습니다. 이제 필요한 분야 하나만 골라 깊게 보고, 그 뒤 정말 궁금한 질문만 이어갑니다.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {SAJU_DETAIL_FOCUS_VALUES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void loadDetail(item)}
                className="min-h-24 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-(--gold)"
              >
                <p className="text-sm font-semibold">{SAJU_FOCUS_LABELS[item]}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{SAJU_FOCUS_SHORT_DESCRIPTIONS[item]}</p>
              </button>
            ))}
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </>
      )}

      {stage === "loading_detail" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">선택한 분야를 자세히 풀어보고 있어요...</p>
        </div>
      )}

      {stage === "detail" && focus && focusedReport && (
        <>
          <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 상세풀이</p>
          <h2 className="mt-2 text-2xl leading-9 font-semibold">이 분야만 따로 깊게 보면</h2>
          <p className="mt-3 text-base leading-7 text-muted-foreground">{focusedReport.intro}</p>

          <div className="mt-5 space-y-3">
            {focusedReport.sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-lg font-semibold">{section.title}</h3>
                <p className="mt-2 text-base leading-8 text-muted-foreground">{section.paragraph.text}</p>
              </section>
            ))}
          </div>

          <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">더 궁금한 게 있을 때만</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              이미 본 내용을 다시 길게 반복하지 않고, 이 분야에서 남은 한 가지 질문을 답과 시기 중심으로 이어봅니다.
            </p>
            <Button
              size="lg"
              onClick={() => {
                setQuestion("");
                setError(null);
                setStage("question");
              }}
              className="mt-4 h-13 w-full rounded-full text-base"
            >
              이 분야에서 질문하기
            </Button>
          </section>

          <PersonCompareCard me={birthInput} />

          <button type="button" onClick={backToFocus} className="mt-5 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4">
            다른 분야 자세히 보기
          </button>
        </>
      )}
      {stage === "question" && focus && (
        <>
          <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 내 질문</p>
          <h2 className="mt-2 text-2xl leading-9 font-semibold">이제 정말 궁금한 것만 물어보세요</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            분야 상세풀이는 이미 봤기 때문에 같은 설명을 다시 늘리지 않습니다. 질문이 다른 분야라면 질문 내용에 맞춰 자동으로 바꿔서 답합니다.
          </p>
          <textarea
            value={question}
            maxLength={500}
            onChange={(event) => {
              setQuestion(event.target.value);
              setError(null);
            }}
            placeholder={examples[0]}
            className="mt-5 min-h-32 w-full resize-none rounded-2xl border border-border bg-card p-4 text-base leading-7 outline-none focus:border-(--gold)"
          />
          <div className="mt-3 grid gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setQuestion(example)}
                className="rounded-xl border border-border bg-accent px-3 py-2 text-left text-sm"
              >
                {example}
              </button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <Button size="lg" disabled={loading || !question.trim()} onClick={() => void submitQuestion()} className="mt-5 h-13 w-full rounded-full text-base">
            {loading ? "답을 보고 있어요..." : "답과 시기 보기"}
          </Button>
          <button type="button" onClick={() => setStage("detail")} className="mt-4 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4">
            상세풀이로 돌아가기
          </button>
        </>
      )}

      {stage === "answer" && focus && answer && (
        <>
          <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 내 질문</p>
          <h2 className="mt-2 text-2xl leading-9 font-semibold">{answer.question.raw}</h2>

          {focusShiftNotice && (
            <p className="mt-3 rounded-xl bg-accent px-4 py-3 text-sm leading-6 text-muted-foreground">
              {focusShiftNotice}
            </p>
          )}

          <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-(--gold)" />
              <p className="section-eyebrow">먼저 답하면</p>
            </div>
            <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
            {style?.currentFlow && (
              <p className="mt-3 text-base leading-7 text-muted-foreground">{style.currentFlow}</p>
            )}
          </section>

          <TimingSummary answer={answer} />

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">이 질문에서 조심해서 볼 점</p>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.avoid}</p>
          </section>

          {allowOneFollowUp && questionPlan?.nextQuestions?.length ? (
            <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
              <p className="section-eyebrow">한 번만 더 좁혀본다면</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                같은 말을 반복하지 않도록 서로 다른 질문 두 개만 남겼습니다.
              </p>
              <div className="mt-3 grid gap-2">
                {questionPlan.nextQuestions.slice(0, 2).map((item) => (
                  <button
                    key={item.question}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setQuestion(item.question);
                      void submitQuestion(item.question);
                    }}
                    className="min-h-11 rounded-xl border border-border bg-accent px-4 py-3 text-left text-sm font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="mt-5 rounded-2xl border border-border bg-card p-5">
              <p className="font-semibold">이 주제에서 볼 핵심은 여기까지입니다</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                비슷한 질문을 계속 반복하기보다 다른 분야나 사람 관계로 넘어가는 편이 더 새로운 풀이를 볼 수 있습니다.
              </p>
            </section>
          )}

          <Button type="button" variant="outline" onClick={backToFocus} className="mt-5 h-12 w-full rounded-full">
            다른 분야 자세히 보기
          </Button>

          <PersonCompareCard me={birthInput} />
        </>
      )}
    </section>
  );
}
