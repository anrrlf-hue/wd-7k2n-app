"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";

export function PalmEntryCard({
  birthInput,
  personalityInput,
}: {
  birthInput: BirthInput;
  personalityInput?: PersonalityInputEcho;
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
          손금에서는 어떤 내가 보일까요?
        </p>
        <p className="mt-1 text-xs opacity-80">
          사진 한 장으로 독립된 두 번째 분석
        </p>
        <span className="mt-2 inline-flex rounded-full bg-background/20 px-3 py-1 text-sm font-semibold">
          손금 사진 찍기
        </span>
      </div>
      <ArrowRight className="size-4 shrink-0 text-current" />
    </Link>
  );
}
