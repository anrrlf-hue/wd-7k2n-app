"use client";

import { Button } from "@/components/ui/button";
import {
  SAJU_FOCUS_LABELS,
  SAJU_FOCUS_SHORT_DESCRIPTIONS,
  SAJU_FOCUS_VALUES,
  type SajuFocus,
} from "@/lib/saju-focus";

export function SajuFocusStep({
  value,
  onChange,
  onNext,
  mode = "free",
}: {
  value: SajuFocus | null;
  onChange: (value: SajuFocus) => void;
  onNext: () => void;
  mode?: "free" | "question";
}) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="section-eyebrow">{mode === "question" ? "내 궁금증 답과 시기" : "무료 사주풀이"}</p>
      <h1 className="mt-2 text-2xl leading-snug font-semibold">
        {mode === "question" ? (
          <>
            무엇이 가장
            <br />
            궁금하세요?
          </>
        ) : (
          <>
            어떤 사주가
            <br />
            가장 궁금하세요?
          </>
        )}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {mode === "question"
          ? "가장 가까운 분야를 하나 고르면, 다음 화면에서 실제 궁금한 내용을 바로 물어볼 수 있어요."
          : "전체 사주는 넓게 보고, 분야를 고르면 그 주제를 5가지 관점으로 더 깊게 풀어드려요."}
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2.5">
        {SAJU_FOCUS_VALUES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={value === item}
            onClick={() => onChange(item)}
            className={
              "min-h-16 rounded-2xl border px-3 py-3 text-left transition-colors " +
              (item === "overall" ? "col-span-2 " : "") +
              (value === item
                ? "border-(--gold) bg-(--gold-soft)"
                : "border-border bg-card")
            }
          >
            <p className="text-sm font-semibold">{SAJU_FOCUS_LABELS[item]}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {SAJU_FOCUS_SHORT_DESCRIPTIONS[item]}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-8">
        <Button
          size="lg"
          disabled={!value}
          onClick={onNext}
          className="h-14 w-full rounded-full text-base"
        >
          {mode === "question" ? "궁금한 내용 적기" : "생년월일 입력하기"}
        </Button>
      </div>
    </div>
  );
}
