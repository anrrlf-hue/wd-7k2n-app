"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti-facts";

/**
 * 사용자 요청에 따라 별도 6문항 성향 체크는 제거하고 MBTI만 선택적으로 받는다.
 * MBTI는 사주 계산값을 바꾸지 않고, 결과 문장을 조금 더 개인화하는 보조정보로만 쓴다.
 */
export function PersonalityStep({
  mbti,
  onMbtiChange,
  onNext,
  onBack,
}: {
  mbti: MbtiType | "모름";
  onMbtiChange: (v: MbtiType | "모름") => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Sparkles className="size-5" />} />

      <h2 className="text-2xl font-semibold tracking-tight">
        MBTI를 알고 있다면
        <br />함께 볼게요
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        MBTI는 사주 계산을 바꾸지 않고, 풀이를 조금 더 나답게 표현하는 데만 참고합니다.
        모르면 그냥 넘어가도 됩니다.
      </p>

      <div className="mt-6">
        <label htmlFor="mbti" className="text-[15px] font-medium">
          내 MBTI
        </label>
        <select
          id="mbti"
          value={mbti}
          onChange={(e) => onMbtiChange(e.target.value as MbtiType | "모름")}
          className="mystic-card mt-2 w-full rounded-xl border border-border p-3.5 text-base"
        >
          <option value="모름">모름 / 건너뛰기</option>
          {MBTI_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-auto flex gap-2 pt-10">
        <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
          이전
        </Button>
        <Button size="lg" onClick={onNext} className="h-13 flex-1 rounded-full text-base">
          다음
        </Button>
      </div>
    </div>
  );
}
