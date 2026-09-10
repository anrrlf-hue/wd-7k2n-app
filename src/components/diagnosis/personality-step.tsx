"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { PERSONALITY_CHECK_ITEMS } from "@/lib/personality-check";

const LIKERT = [1, 2, 3, 4, 5];

/** 무료 사주 흐름 안에 있는 정식 스텝. "손금은 유료 보너스가 아니다"와 같은
 * 원칙으로, 성향정보도 결과 맨 아래 곁다리가 아니라 입력 단계 중 하나로
 * 다룬다. 완전히 건너뛸 수 있어 이탈 위험을 늘리지 않는다.
 * "정밀 심리검사"가 아니라 "간단 성향 체크"라고만 표기한다(6문항).
 * MBTI 입력은 제거했다 — 실제 어떤 비교·판정에도 쓰이지 않는 데이터를
 * 고객에게 묻지 않는다(§10). */
export function PersonalityStep({
  personalityAnswers,
  onPersonalityChange,
  onNext,
  onSkip,
  onBack,
}: {
  personalityAnswers: Record<string, number>;
  onPersonalityChange: (id: string, value: number) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const answeredCount = Object.keys(personalityAnswers).length;

  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Sparkles className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        조금 더 나답게
        <br />볼까요?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        간단 성향 체크 6문항이에요. 사주를 맞추는 용도가 아니라, 사주와 자기 생각이 얼마나 비슷한지 비교하는 용도예요. 건너뛰어도 결과에는 영향 없어요.
      </p>

      <div className="mt-6 space-y-4">
        {PERSONALITY_CHECK_ITEMS.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{item.leftLabel}</span>
              <span>{item.rightLabel}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {LIKERT.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onPersonalityChange(item.id, v)}
                  className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
                    personalityAnswers[item.id] === v
                      ? "border-(--gold) bg-(--gold-soft) text-(--gold)"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-10">
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
            이전
          </Button>
          <Button
            size="lg"
            disabled={answeredCount > 0 && answeredCount < PERSONALITY_CHECK_ITEMS.length}
            onClick={onNext}
            className="h-13 flex-1 rounded-full text-base"
          >
            {answeredCount === 0
              ? "다음"
              : answeredCount < PERSONALITY_CHECK_ITEMS.length
                ? `${answeredCount}/${PERSONALITY_CHECK_ITEMS.length}문항 응답 중`
                : "다음"}
          </Button>
        </div>
        <button type="button" onClick={onSkip} className="text-center text-xs text-muted-foreground">
          이건 건너뛰고 바로 결과 볼게요
        </button>
      </div>
    </div>
  );
}
