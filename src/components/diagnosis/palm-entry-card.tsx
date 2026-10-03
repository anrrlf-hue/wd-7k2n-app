"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { SajuFocus } from "@/lib/saju-focus";

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
  const params = new URLSearchParams({
    year: String(birthInput.year),
    month: String(birthInput.month),
    day: String(birthInput.day),
    hour: birthInput.hour === null ? "" : String(birthInput.hour),
    minute: birthInput.minute === null ? "" : String(birthInput.minute),
    gender: birthInput.gender,
  });

  // 성향정보를 손금 페이지까지 이어가 "사주+손금+성향" 통합 비교를 만든다.
  // 압축 형식(id:value,id:value)으로만 넘기고, 손금 페이지에서 다시 검증해 채점한다.
  if (personalityInput?.personalityAnswers) {
    params.set(
      "pc",
      Object.entries(personalityInput.personalityAnswers)
        .map(([id, v]) => `${id}:${v}`)
        .join(","),
    );
  }
  if (personalityInput?.mbti) {
    params.set("mbti", personalityInput.mbti);
  }
  if (focus) {
    params.set("focus", focus);
  }
  if (question?.trim()) {
    params.set("question", question.trim());
  }

  return (
    <Link
      href={`/diagnosis/palm?${params.toString()}`}
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
    </Link>
  );
}
