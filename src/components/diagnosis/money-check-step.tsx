"use client";

import { useState } from "react";
import { MONEY_CHECK_QUESTIONS } from "@/lib/money-check";

export function MoneyCheckStep({
  answers,
  onAnswer,
  onNext,
}: {
  answers: Record<string, number>;
  onAnswer: (id: string, score: number) => void;
  onNext: () => void;
}) {
  const [index, setIndex] = useState(0);
  const question = MONEY_CHECK_QUESTIONS[index];
  const isLast = index === MONEY_CHECK_QUESTIONS.length - 1;

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-sm font-medium text-muted-foreground">
        간이 진단 · {index + 1}/{MONEY_CHECK_QUESTIONS.length}
      </p>
      <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight">
        {question.question}
      </h2>

      <div className="mt-8 flex flex-col gap-3">
        {question.options.map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => {
              onAnswer(question.id, opt.score);
              if (isLast) {
                onNext();
              } else {
                setIndex((i) => i + 1);
              }
            }}
            className={`rounded-xl border p-4 text-left text-sm transition-colors ${
              answers[question.id] === opt.score
                ? "border-primary bg-accent"
                : "border-border"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={() => setIndex((i) => i - 1)}
          className="mt-6 text-left text-sm text-muted-foreground"
        >
          ← 이전 질문
        </button>
      )}
    </div>
  );
}
