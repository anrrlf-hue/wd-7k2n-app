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
                  : "한 번 더 살아나는 시기"}
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
  onAskAgain,
}: {
  focus: SajuFocus;
  question: string;
  birthInput: BirthInput;
  mbti: MbtiType | null;
  answer: RealityAnswer;
  onAskAgain: () => void;
}) {
  const [saved, setSaved] = useState(false);

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

      <TimingWindows answer={answer} />

      {answer.report && (
        <section className="mt-5 space-y-3">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">이 질문을 사주로 풀면</h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              {answer.report.questionReading}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">지금의 흐름</h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              {answer.report.currentFlow}
            </p>
          </div>

          <div className="rounded-2xl border border-(--gold-soft) bg-card p-5">
            <h2 className="font-semibold">앞으로 어떻게 나타날 수 있나요?</h2>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              {answer.report.solutionReading}
            </p>
          </div>
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">반복해서 나타나기 쉬운 흐름</h2>
        <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.repeatingPattern}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="text-sm text-muted-foreground">가장 중요하게 볼 점</p>
        <p className="mt-2 text-base leading-7 font-semibold">{answer.choose}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">조심해서 볼 점</p>
        <p className="mt-2 text-base leading-7">{answer.avoid}</p>
      </section>

      {answer.safetyNote && (
        <p className="mt-4 rounded-2xl bg-accent p-4 text-sm leading-6 text-muted-foreground">
          {answer.safetyNote}
        </p>
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
