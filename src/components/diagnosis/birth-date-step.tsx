"use client";

import Link from "next/link";
import { CalendarDays, Check, Moon, Pencil, X } from "lucide-react";
import { useState } from "react";
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
  const [draftValue, setDraftValue] = useState(value);
  const [editing, setEditing] = useState(!value);

  function confirmDate() {
    if (!draftValue) return;
    onChange(draftValue);
    setEditing(false);
  }

  function cancelDateEdit() {
    setDraftValue(value);
    setEditing(false);
  }

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

      <div className="mystic-card mt-6 flex flex-col gap-3 border-(--gold-soft) p-4 sm:mt-8 sm:p-5">
        <Label htmlFor="birthDate" className="text-base font-semibold text-(--gold)">
          생년월일
        </Label>
        {editing ? (
          <>
            <div className="relative">
              <CalendarDays
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-(--gold)"
              />
              <Input
                id="birthDate"
                type="date"
                value={draftValue}
                min="1930-01-01"
                max="2020-12-31"
                aria-describedby="birthDateHelp"
                onChange={(e) => setDraftValue(e.target.value)}
                className="h-16 w-full border border-(--gold-soft) bg-background pl-12 pr-4 text-lg font-semibold text-foreground shadow-sm outline-none focus-visible:border-(--gold) focus-visible:ring-2 focus-visible:ring-(--gold) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
            <p id="birthDateHelp" className="text-xs leading-5 text-muted-foreground">
              날짜 입력란을 누르거나 키보드로 날짜를 선택한 뒤 확정해 주세요.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!value}
                onClick={cancelDateEdit}
                className="h-12 rounded-xl border-border text-sm"
              >
                <X aria-hidden="true" className="size-4" />
                취소
              </Button>
              <Button
                type="button"
                disabled={!draftValue}
                onClick={confirmDate}
                className="h-12 rounded-xl text-sm"
              >
                <Check aria-hidden="true" className="size-4" />
                날짜 확정
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-(--gold-soft) bg-background p-4">
            <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-(--gold)" />
            <p className="min-w-0 flex-1 text-base font-semibold" aria-live="polite">
              {new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`))}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(true);
                requestAnimationFrame(() => document.getElementById("birthDate")?.focus());
              }}
              className="h-11 shrink-0 rounded-xl px-3 text-sm"
              aria-label="생년월일 수정"
            >
              <Pencil aria-hidden="true" className="size-4" />
              수정
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
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

      <label className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-card p-3 sm:mt-6 sm:p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-1 size-4"
        />
        <span className="text-sm leading-6 text-muted-foreground">
          출생정보를 서버에서 계산하고 기기에 저장하는 데 동의합니다.
          <span className="mt-1 block sm:mt-2">입력·풀이·손금 특징은 이 탭에, 내 출생정보는 이 기기에 자동 저장됩니다.</span>
          <span className="mt-1 block sm:mt-2">운영자가 외부 해석을 켜면 계산된 사주 정보와 질문이 Anthropic에 전송될 수 있습니다.</span>
          <Link href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4">
            개인정보처리방침 보기
          </Link>
        </span>
      </label>

      <div className="mt-auto pt-4 sm:pt-8">
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
