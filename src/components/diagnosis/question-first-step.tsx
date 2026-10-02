"use client";

import { Button } from "@/components/ui/button";
import { SAJU_FOCUS_LABELS, type SajuFocus } from "@/lib/saju-focus";

const QUESTION_EXAMPLES: Record<SajuFocus, string[]> = {
  overall: [
    "앞으로 제 흐름은 언제 크게 바뀌나요?",
    "올해 가장 중요한 변화는 무엇인가요?",
  ],
  love_relationship: [
    "여자친구는 언제 생길까요?",
    "지금 만나는 사람과 관계가 어떻게 흘러갈까요?",
  ],
  work: [
    "이직이나 일의 변화는 언제쯤 들어오나요?",
    "지금 사업을 시작해도 흐름이 괜찮을까요?",
  ],
  money: [
    "제 재물 흐름은 언제 좋아지나요?",
    "돈과 관련된 기회가 언제 들어오나요?",
  ],
  wellbeing: [
    "생활 리듬이 크게 바뀌는 시기가 있나요?",
    "앞으로 컨디션 흐름은 어떻게 바뀌나요?",
  ],
};

export function QuestionFirstStep({
  focus,
  value,
  error,
  onChange,
  onNext,
  onBack,
  hasBirthInfo = false,
}: {
  focus: SajuFocus;
  value: string;
  error?: string | null;
  hasBirthInfo?: boolean;
  onChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const examples = QUESTION_EXAMPLES[focus];

  return (
    <div className="flex flex-1 flex-col">
      <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focus]} · 내 질문</p>
      <h1 className="mt-2 text-2xl leading-snug font-semibold">
        지금 가장 궁금한 것을
        <br />
        그대로 적어주세요
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {hasBirthInfo
          ? "방금 본 무료 사주의 출생정보를 그대로 이어서, 질문에 대한 답과 시기를 바로 봅니다."
          : "질문에 대한 답과 함께, 가장 먼저 눈여겨볼 시기와 그때 나타날 수 있는 흐름까지 같이 봅니다."}
      </p>

      <label className="mt-6 block">
        <span className="text-sm font-medium">내가 알고 싶은 것</span>
        <textarea
          value={value}
          maxLength={500}
          onChange={(event) => onChange(event.target.value)}
          placeholder={examples[0]}
          className="mt-2 min-h-36 w-full resize-none rounded-2xl border border-border bg-card p-4 text-base leading-7 outline-none focus:border-(--gold)"
        />
      </label>

      <div className="mt-4 rounded-2xl bg-accent p-4">
        <p className="text-xs font-semibold text-(--gold)">이렇게 물어봐도 좋아요</p>
        <div className="mt-2 space-y-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onChange(example)}
              className="block w-full text-left text-sm leading-6 text-foreground/80"
            >
              · {example}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm leading-6 text-destructive">{error}</p>}

      <div className="mt-auto flex gap-2 pt-8">
        <Button variant="outline" size="lg" onClick={onBack} className="h-13 rounded-full">
          이전
        </Button>
        <Button
          size="lg"
          disabled={value.trim().length < 1}
          onClick={onNext}
          className="h-13 flex-1 rounded-full text-base"
        >
          {hasBirthInfo ? "답과 시기 보기" : "내 정보 입력하기"}
        </Button>
      </div>
    </div>
  );
}
