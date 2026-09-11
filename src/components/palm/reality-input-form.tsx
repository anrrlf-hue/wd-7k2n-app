"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { REALITY_INPUT_QUESTIONS, type RealityInput } from "@/lib/reality-input";

/** 결제 직전 다리의 두 번째 단계 — 현실정보 최소 입력. 상세 재무상담
 * 신청서가 아니라 7개 단일선택 질문을 한 화면에서 탭만으로 끝낸다.
 * 정확한 금액을 타이핑하게 하지 않는다(구간 선택만). "고민 중인 선택지"는
 * 없어도 되므로 기본값(none)을 미리 채워 필수처럼 느껴지지 않게 한다. */
export function RealityInputForm({
  onSubmit,
  onBack,
}: {
  onSubmit: (input: RealityInput) => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Partial<RealityInput>>({ considering: "none" });

  const requiredKeys = REALITY_INPUT_QUESTIONS.filter((q) => q.key !== "considering").map((q) => q.key);
  const isComplete = requiredKeys.every((k) => answers[k]);

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-sm font-medium text-(--gold)">지금 위치를 짚어보겠습니다</p>
      <h2 className="mt-2 text-xl leading-snug font-semibold tracking-tight">
        사주가 보여준 방향, 지금 현실과 얼마나 맞을까요?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        정확한 금액이 아니라 구간만 골라주시면 됩니다. 30초면 끝납니다.
      </p>

      <div className="mt-6 space-y-4">
        {REALITY_INPUT_QUESTIONS.map((q) => (
          <div key={q.key} className="rounded-xl border border-border p-3.5">
            <p className="text-sm font-medium">{q.question}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: opt.value }))}
                  className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
                    answers[q.key] === opt.value
                      ? "border-(--gold) bg-(--gold-soft) text-(--gold)"
                      : "border-border text-foreground/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-8">
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
            이전
          </Button>
          <Button
            size="lg"
            disabled={!isComplete}
            onClick={() => isComplete && onSubmit(answers as RealityInput)}
            className="h-13 flex-1 rounded-full text-base"
          >
            내 위치 확인하기
          </Button>
        </div>
      </div>
    </div>
  );
}
