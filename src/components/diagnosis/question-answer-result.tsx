"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PalmEntryCard } from "@/components/diagnosis/palm-entry-card";
import type { RealityAnswer } from "@/lib/reality-answer-contract";
import type { BirthInput } from "@/lib/saju";
import type { MbtiType } from "@/lib/mbti-facts";
import { SAJU_FOCUS_LABELS, type SajuFocus } from "@/lib/saju-focus";
import { saveRealityAnswer } from "@/lib/reality-management";
import type { QuestionEnginePlan } from "@/lib/question-engine-v0";
import { buildReadingStyleV1View } from "@/lib/reading-style-v1";

function TimingWindows({ answer }: { answer: RealityAnswer }) {
  if (!answer.timing.windows?.length) {
    return (
      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-(--gold)" />
          <h2 className="font-semibold">현재 시기 흐름</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer.timing.now}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{answer.timing.nextCheckpoint}</p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-(--gold)" />
        <h2 className="font-semibold">눈여겨볼 시기</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer.timing.now}</p>

      <div className="mt-4 space-y-3">
        {answer.timing.windows.map((window, index) => (
          <div key={window.label} className="rounded-2xl bg-accent p-4">
            <p className="text-xs font-semibold text-(--gold)">
              {index === 0
                ? "가장 강하게 보이는 시기"
                : index === 1
                  ? "두 번째로 눈여겨볼 시기"
                  : "세 번째로 눈여겨볼 시기"}
            </p>
            <p className="mt-1 text-lg font-semibold">{window.label}</p>

            <div className="mt-3">
              <p className="text-xs font-semibold text-foreground/70">이때는</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {window.meaning ?? window.reason}
              </p>
            </div>

            {window.positive && (
              <div className="mt-3 rounded-xl bg-background/70 px-3 py-3">
                <p className="text-xs font-semibold text-(--gold)">좋은 흐름으로 나타나면</p>
                <p className="mt-1 text-sm leading-6 text-foreground/80">{window.positive}</p>
              </div>
            )}

            {window.caution && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-foreground/70">조심할 점</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{window.caution}</p>
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

export function QuestionAnswerResult({
  focus,
  question,
  birthInput,
  mbti,
  answer,
  questionPlan,
  onAskAgain,
  onAskFollowUp,
}: {
  focus: SajuFocus;
  question: string;
  birthInput: BirthInput;
  mbti: MbtiType | null;
  answer: RealityAnswer;
  questionPlan?: QuestionEnginePlan | null;
  onAskAgain: () => void;
  onAskFollowUp?: (question: string, focus: SajuFocus) => void;
}) {
  const [saved, setSaved] = useState(false);
  const style = buildReadingStyleV1View(answer, questionPlan?.nextQuestions ?? []);

  function handleSave() {
    saveRealityAnswer({ birthInput, answer });
    setSaved(true);
  }

  return (
    <div className="pb-8">
      <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 내 질문</p>
      <h1 className="mt-2 text-2xl leading-snug font-semibold">{question}</h1>

      <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-(--gold)" />
          <p className="section-eyebrow">먼저 답하면</p>
        </div>
        <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
      </section>

      <section className="mt-5 space-y-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">{style.personalTitle}</h2>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {style.personalMeaning}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">{style.currentTitle}</h2>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {style.currentFlow}
          </p>
        </div>
      </section>

      <TimingWindows answer={answer} />

      <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
        <h2 className="font-semibold">{style.futureTitle}</h2>
        <p className="mt-3 text-base leading-8 text-muted-foreground">
          {style.futureMeaning}
        </p>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">{style.patternTitle}</h2>
        <p className="mt-2 text-base leading-7 text-muted-foreground">{style.pattern}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">{style.cautionTitle}</p>
        <p className="mt-2 text-base leading-7 text-muted-foreground">{style.caution}</p>
        {style.realityChecks.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground/70">현실에서 같이 볼 것</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {style.realityChecks.join(" · ")}
            </p>
          </div>
        )}
      </section>

      {answer.safetyNote && (
        <p className="mt-4 rounded-2xl bg-accent p-4 text-sm leading-6 text-muted-foreground">
          {answer.safetyNote}
        </p>
      )}

      {style.nextQuestions.length > 0 && onAskFollowUp && (
        <section className="mt-5 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <p className="section-eyebrow">{style.nextTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            방금 풀이에서 자연스럽게 이어지는 질문만 골랐습니다.
          </p>
          <div className="mt-3 grid gap-2">
            {style.nextQuestions.slice(0, 3).map((item) => (
              <button
                key={item.label + item.question}
                type="button"
                onClick={() => onAskFollowUp(item.question, item.focus)}
                className="min-h-12 rounded-xl border border-border bg-accent px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-(--gold)"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6">
        <PalmEntryCard
          birthInput={birthInput}
          personalityInput={{ personalityAnswers: null, mbti }}
          focus={focus}
          variant="answerEnhance"
          question={question}
        />
      </div>

      <div className="mt-5 grid gap-2">
        <Button type="button" onClick={handleSave} disabled={saved} className="h-13 rounded-full text-base">
          {saved ? "내 관리에 저장됨" : "이 답과 시기 저장하기"}
        </Button>
        <Button type="button" variant="outline" onClick={onAskAgain} className="h-13 rounded-full text-base">
          다른 질문하기
        </Button>
        <Button asChild variant="ghost" className="h-11 rounded-full">
          <Link href={`/diagnosis?mode=free&focus=${focus}`}>전체 사주 무료로 보기</Link>
        </Button>
      </div>
    </div>
  );
}
