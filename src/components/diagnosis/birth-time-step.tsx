"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";

const BIRTH_TIME_SLOTS = [
  { label: "자시", hanja: "子時", range: "23~01시", value: "00:00" },
  { label: "축시", hanja: "丑時", range: "01~03시", value: "02:00" },
  { label: "인시", hanja: "寅時", range: "03~05시", value: "04:00" },
  { label: "묘시", hanja: "卯時", range: "05~07시", value: "06:00" },
  { label: "진시", hanja: "辰時", range: "07~09시", value: "08:00" },
  { label: "사시", hanja: "巳時", range: "09~11시", value: "10:00" },
  { label: "오시", hanja: "午時", range: "11~13시", value: "12:00" },
  { label: "미시", hanja: "未時", range: "13~15시", value: "14:00" },
  { label: "신시", hanja: "申時", range: "15~17시", value: "16:00" },
  { label: "유시", hanja: "酉時", range: "17~19시", value: "18:00" },
  { label: "술시", hanja: "戌時", range: "19~21시", value: "20:00" },
  { label: "해시", hanja: "亥時", range: "21~23시", value: "22:00" },
] as const;

export function BirthTimeStep({
  knowsTime,
  time,
  onKnowsTimeChange,
  onTimeChange,
  onNext,
  onBack,
}: {
  knowsTime: boolean;
  time: string;
  onKnowsTimeChange: (v: boolean) => void;
  onTimeChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Clock className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        태어난 시간도
        <br />
        알고 있나요?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        태어난 시간대를 골라주세요.
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        시간을 모르면 시주와 일부 세부 해석이 빠질 수 있습니다.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-2">
        {BIRTH_TIME_SLOTS.map((slot) => {
          const selected = knowsTime && time === slot.value;
          return (
            <button
              key={slot.label}
              type="button"
              onClick={() => {
                onKnowsTimeChange(true);
                onTimeChange(slot.value);
              }}
              aria-pressed={selected}
              className={`rounded-xl border p-3 text-left transition-colors ${
                selected ? "mystic-card border-(--gold-soft)" : "border-border"
              }`}
            >
              <p className="text-sm font-semibold">
                {slot.label} <span className="text-muted-foreground">{slot.hanja}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{slot.range}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          onKnowsTimeChange(false);
          onTimeChange("");
        }}
        aria-pressed={!knowsTime}
        className={`mt-3 rounded-xl border p-4 text-left transition-colors ${
          !knowsTime ? "mystic-card border-(--gold-soft)" : "border-border"
        }`}
      >
        <p className="text-sm font-medium">태어난 시간을 모르겠어요</p>
      </button>

      <div className="mt-auto flex gap-2 pt-10">
        <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
          이전
        </Button>
        <Button
          size="lg"
          disabled={knowsTime && !time}
          onClick={onNext}
          className="h-13 flex-1 rounded-full text-base"
        >
          다음
        </Button>
      </div>
    </div>
  );
}
