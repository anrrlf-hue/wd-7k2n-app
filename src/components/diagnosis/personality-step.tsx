"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { BIG5_ITEMS } from "@/lib/big5-facts";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti-facts";

const LIKERT = [1, 2, 3, 4, 5];

/** 무료 사주 흐름 안에 있는 정식 스텝. "손금은 유료 보너스가 아니다"와 같은
 * 원칙으로, 성향정보도 결과 맨 아래 곁다리가 아니라 입력 단계 중 하나로
 * 다룬다. 완전히 건너뛸 수 있어 이탈 위험을 늘리지 않는다. */
export function PersonalityStep({
  big5Answers,
  onBig5Change,
  mbti,
  onMbtiChange,
  onNext,
  onSkip,
  onBack,
}: {
  big5Answers: Record<string, number>;
  onBig5Change: (id: string, value: number) => void;
  mbti: MbtiType | "모름";
  onMbtiChange: (v: MbtiType | "모름") => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const answeredCount = Object.keys(big5Answers).length;

  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Sparkles className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        조금 더 나답게
        <br />볼까요?
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        10문항 짧은 성향 검사예요. 사주를 맞추는 용도가 아니라, 사주와 자기 생각이 얼마나 비슷한지 비교하는 용도예요. 건너뛰어도 결과에는 영향 없어요.
      </p>

      <div className="mt-6 space-y-4">
        {BIG5_ITEMS.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3.5">
            <p className="text-sm">{item.text}</p>
            <div className="mt-2 flex gap-1.5">
              {LIKERT.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onBig5Change(item.id, v)}
                  className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
                    big5Answers[item.id] === v
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

      <div className="mt-6">
        <p className="text-sm font-medium">MBTI를 알고 있다면 선택해주세요</p>
        <select
          value={mbti}
          onChange={(e) => onMbtiChange(e.target.value as MbtiType | "모름")}
          className="mystic-card mt-2 w-full rounded-xl border border-border p-3 text-sm"
        >
          <option value="모름">모름 / 건너뛰기</option>
          {MBTI_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-10">
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
            이전
          </Button>
          <Button
            size="lg"
            disabled={answeredCount > 0 && answeredCount < BIG5_ITEMS.length}
            onClick={onNext}
            className="h-13 flex-1 rounded-full text-base"
          >
            {answeredCount === 0 ? "다음" : answeredCount < BIG5_ITEMS.length ? `${answeredCount}/${BIG5_ITEMS.length}문항 응답 중` : "다음"}
          </Button>
        </div>
        <button type="button" onClick={onSkip} className="text-center text-xs text-muted-foreground">
          이건 건너뛰고 바로 결과 볼게요
        </button>
      </div>
    </div>
  );
}
