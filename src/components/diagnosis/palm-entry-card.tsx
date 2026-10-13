"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { SajuFocus } from "@/lib/saju-focus";
import { savePalmEntry } from "@/lib/palm-entry-state";

export function PalmEntryCard({
  birthInput,
  personalityInput,
  focus,
  variant = "default",
  question,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
  focus?: SajuFocus;
  variant?: "default" | "answerEnhance";
  question?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(false);

  function openPalm() {
    if (!savePalmEntry({
      birthInput,
      personalityInput: personalityInput ?? { personalityAnswers: null, mbti: null },
      focus: focus ?? "overall",
      initialQuestion: question?.trim() || null,
    })) {
      setError(true);
      return;
    }
    router.push("/diagnosis/palm");
  }

  return <>
    <button
      type="button"
      onClick={openPalm}
      className="primary-cta flex items-center gap-3 rounded-2xl p-5 transition-colors hover:border-(--gold-soft)"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-(--gold-soft)">
        <PalmLineIllustration />
      </span>
      <div className="flex-1">
        <p className="text-sm leading-snug font-medium">
          {variant === "answerEnhance"
            ? "같은 질문에 손금까지 더해볼까요?"
            : "손금에서는 어떤 내가 보일까요?"}
        </p>
        <p className="mt-1 text-xs opacity-80">
          {variant === "answerEnhance"
            ? "선택사항 · 질문은 그대로 두고, 손금에서 보이는 현재 모습을 종합답에 더합니다"
            : "오른손·왼손을 각각 보고, 공통점과 차이까지 함께 정리합니다"}
        </p>
        <span className="mt-2 inline-flex rounded-full bg-background/20 px-3 py-1 text-sm font-semibold">
          {variant === "answerEnhance" ? "손금까지 함께 보기" : "양손 손금 보기"}
        </span>
      </div>
      <ArrowRight className="size-4 shrink-0 text-current" />
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">브라우저 저장공간을 사용할 수 없어요. 설정을 확인한 뒤 다시 시도해주세요.</p>}
  </>;
}
