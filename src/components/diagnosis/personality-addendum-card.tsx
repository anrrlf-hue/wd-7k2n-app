"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BIG5_ITEMS } from "@/lib/big5-facts";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti-facts";
import type { BirthInput } from "@/lib/saju";

const LIKERT = [
  { value: 1, label: "전혀 아니다" },
  { value: 2, label: "아니다" },
  { value: 3, label: "보통" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];

type Stage = "closed" | "open" | "loading" | "done" | "error";

interface AddendumResult {
  addendum: {
    extraversionCompare: string;
    conscientiousnessCompare: string;
    mbtiNote: string;
  };
}

/** "손금은 유료 보너스가 아니다"와 같은 원칙으로, 이 성향 비교도 완전히
 * 선택 사항이다 — 건너뛰어도 무료 사주/손금 핵심 결과에는 아무 영향 없다.
 * 이탈 위험을 줄이기 위해 메인 결과 화면 맨 아래(선택 영역)에만 둔다. */
export function PersonalityAddendumCard({ birthInput }: { birthInput: BirthInput }) {
  const [stage, setStage] = useState<Stage>("closed");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [mbti, setMbti] = useState<MbtiType | "모름">("모름");
  const [result, setResult] = useState<AddendumResult | null>(null);

  const answeredCount = Object.keys(answers).length;
  const canSubmit = answeredCount === BIG5_ITEMS.length;

  async function handleSubmit() {
    setStage("loading");
    try {
      const res = await fetch("/api/saju/personality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...birthInput, big5Answers: answers, mbti }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setResult(data);
      setStage("done");
    } catch {
      setStage("error");
    }
  }

  if (stage === "closed") {
    return (
      <button
        type="button"
        onClick={() => setStage("open")}
        className="mystic-card flex w-full items-center gap-3 border-dashed p-4 text-left transition-colors hover:border-(--gold-soft)"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--gold-soft)">
          <Sparkles className="size-5 text-(--gold)" />
        </span>
        <div className="flex-1">
          <p className="text-sm leading-snug font-medium">조금 더 나답게 볼까요? (선택)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            10문항 짧은 성향 검사로 사주 결과와 비교해봐요 — 안 해도 위 결과는 그대로예요.
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-(--gold)" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0.6, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mystic-card p-5"
    >
      {stage === "open" && (
        <>
          <p className="text-sm font-medium text-(--gold)">짧은 성향 검사 (10문항)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            이 결과는 사주를 &ldquo;맞추기&rdquo; 위한 게 아니라, 사주와 자기보고가 얼마나 비슷한지/다른지 비교해서 보여줘요.
          </p>

          <div className="mt-4 space-y-4">
            {BIG5_ITEMS.map((item) => (
              <div key={item.id}>
                <p className="text-sm">{item.text}</p>
                <div className="mt-1.5 flex gap-1">
                  {LIKERT.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: l.value }))}
                      className={`flex-1 rounded-lg border py-1.5 text-[11px] transition-colors ${
                        answers[item.id] === l.value
                          ? "border-(--gold) bg-(--gold-soft) text-(--gold)"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {l.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-sm">MBTI를 알고 있다면 선택해주세요 (선택 사항)</p>
            <select
              value={mbti}
              onChange={(e) => setMbti(e.target.value as MbtiType | "모름")}
              className="mt-1.5 w-full rounded-lg border border-border bg-background p-2.5 text-sm"
            >
              <option value="모름">모름 / 건너뛰기</option>
              {MBTI_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="mt-5 h-12 w-full rounded-full text-sm"
          >
            {canSubmit ? "비교 결과 보기" : `${answeredCount}/${BIG5_ITEMS.length}문항 응답 중`}
          </Button>
        </>
      )}

      {stage === "loading" && <p className="text-sm text-muted-foreground">비교하는 중이에요...</p>}

      {stage === "error" && (
        <p className="text-sm text-destructive">비교 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.</p>
      )}

      {stage === "done" && result && (
        <div className="space-y-3 text-sm leading-relaxed">
          <p className="text-sm font-medium text-(--gold)">사주 x 자기보고 비교</p>
          <p>{result.addendum.extraversionCompare}</p>
          <p>{result.addendum.conscientiousnessCompare}</p>
          <p className="text-xs text-muted-foreground">{result.addendum.mbtiNote}</p>
        </div>
      )}
    </motion.div>
  );
}
