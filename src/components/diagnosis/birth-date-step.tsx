"use client";

import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepBadge } from "@/components/diagnosis/step-badge";

export function BirthDateStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Moon className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        생년월일을
        <br />
        알려주세요
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        음력이든 양력이든 실제 태어난 날짜면 돼요.
      </p>

      <div className="mystic-card mt-10 flex flex-col gap-2 p-5">
        <Label htmlFor="birthDate" className="text-(--gold)">
          생년월일
        </Label>
        <Input
          id="birthDate"
          type="date"
          value={value}
          min="1930-01-01"
          max="2020-12-31"
          onChange={(e) => onChange(e.target.value)}
          className="h-13 border-none bg-transparent p-0 text-base focus-visible:ring-0"
        />
      </div>

      <div className="mt-auto pt-10">
        <Button
          size="lg"
          disabled={!value}
          onClick={onNext}
          className="h-13 w-full rounded-full text-base"
        >
          다음
        </Button>
      </div>
    </div>
  );
}
