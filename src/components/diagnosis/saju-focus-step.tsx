"use client";

import { Button } from "@/components/ui/button";
import {
  SAJU_DETAIL_FOCUS_VALUES,
  SAJU_FOCUS_LABELS,
  SAJU_FOCUS_SHORT_DESCRIPTIONS,
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
      <p className="section-eyebrow">{mode === "question" ? "더 자세히 볼 분야" : "세부 사주풀이"}</p>
      <h1 className="mt-2 text-2xl leading-snug font-semibold">
        어떤 부분을
        <br />
        더 자세히 볼까요?
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        전체 사주는 앞에서 이미 넓게 봤습니다. 여기서는 한 분야를 골라 더 깊게 본 뒤, 필요한 질문만 이어서 물어볼 수 있어요.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2.5">
        {SAJU_DETAIL_FOCUS_VALUES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={value === item}
            onClick={() => onChange(item)}
            className={
              "min-h-16 rounded-2xl border px-3 py-3 text-left transition-colors " +
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
          자세히 보기
        </Button>
      </div>
    </div>
  );
}
