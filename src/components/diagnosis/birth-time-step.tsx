"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepBadge } from "@/components/diagnosis/step-badge";

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
        시간까지 입력하면 더 정확하게 볼 수 있어요. 몰라도 괜찮아요.
      </p>

      <div className="mt-10 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => onKnowsTimeChange(true)}
          className={`rounded-xl border p-4 text-left transition-colors ${
            knowsTime ? "mystic-card border-(--gold-soft)" : "border-border"
          }`}
        >
          <p className="text-sm font-medium">시간을 알아요</p>
        </button>

        {knowsTime && (
          <div className="mystic-card flex flex-col gap-2 p-5">
            <Label htmlFor="birthTime" className="text-(--gold)">
              출생 시간
            </Label>
            <Input
              id="birthTime"
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              className="h-13 border-none bg-transparent p-0 text-base focus-visible:ring-0"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => onKnowsTimeChange(false)}
          className={`rounded-xl border p-4 text-left transition-colors ${
            !knowsTime ? "mystic-card border-(--gold-soft)" : "border-border"
          }`}
        >
          <p className="text-sm font-medium">모르겠어요</p>
        </button>
      </div>

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
          내 재물운 보기
        </Button>
      </div>
    </div>
  );
}
