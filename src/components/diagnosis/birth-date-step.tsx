"use client";

import Link from "next/link";
import { Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepBadge } from "@/components/diagnosis/step-badge";

export function BirthDateStep({
  value,
  onChange,
  gender,
  onGenderChange,
  consent,
  onConsentChange,
  onNext,
  onBack,
}: {
  value: string;
  onChange: (v: string) => void;
  gender: "남" | "여";
  onGenderChange: (v: "남" | "여") => void;
  consent: boolean;
  onConsentChange: (v: boolean) => void;
  onNext: () => void;
  onBack?: () => void;
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
        양력 생일을 입력해 주세요. 성별은 대운의 방향을 계산할 때 사용해요.
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(["남", "여"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onGenderChange(g)}
            aria-pressed={gender === g}
            className={`rounded-xl border p-3 text-sm font-medium transition-colors ${
              gender === g ? "mystic-card border-(--gold-soft)" : "border-border"
            }`}
          >
            {g}성
          </button>
        ))}
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-1 size-4"
        />
        <span className="text-sm leading-6 text-muted-foreground">
          출생정보를 서버에서 계산하고 기기에 저장하는 데 동의합니다.
          <span className="mt-2 block">입력·풀이·손금 특징은 이 탭에, 내 출생정보는 이 기기에 자동 저장됩니다.</span>
          <span className="mt-2 block">운영자가 외부 해석을 켜면 계산된 사주 정보와 입력한 MBTI·질문이 Anthropic에 전송될 수 있습니다.</span>
          <Link href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4">
            개인정보처리방침 보기
          </Link>
        </span>
      </label>

      <div className="mt-auto pt-8">
        <Button
          size="lg"
          disabled={!value || !consent}
          onClick={onNext}
          className="h-13 w-full rounded-full text-base"
        >
          다음
        </Button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            보고 싶은 사주 다시 고르기
          </button>
        )}
      </div>
    </div>
  );
}
