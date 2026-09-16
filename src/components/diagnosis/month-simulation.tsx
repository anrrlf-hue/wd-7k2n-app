"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getMonthSimSteps,
  computeMonthSimResult,
  computeRunningBalance,
  defaultStartingIncome,
  type MonthSimSelection,
} from "@/lib/month-simulation";
import type { WealthTypeCode } from "@/lib/wealth-type-copy";

type Stage = "intro" | "choice" | "reveal" | "summary";

function formatKrw(n: number): string {
  return `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ko-KR")}원`;
}

/** 한 달 살아보기 1회차 — 무료 결과 맨 마지막에 붙는 3분짜리 체험. 사주
 * 유형(재물 유형)이 시작 조건·선택지 세트를 정한다(month-simulation-data.ts).
 * 되돌리기 없이 한 방향으로만 진행해 3분 안에 끝나게 한다. 결과 금액은
 * 순수 산술이라 같은 선택이면 항상 같은 결과다(난수 없음).
 * 선택 하나마다 "무슨 일이 있었는지 -> 얼마가 움직였는지 -> 지금 잔액"을
 * 한 장면씩 보여주는 reveal 스테이지를 둬서(보험민원 체험과 같은 결의
 * 장면 전환), 시작 잔액과 매 선택의 결과가 화면에서 늘 보이게 한다. */
export function MonthSimulation({ wealthTypeCode }: { wealthTypeCode: WealthTypeCode }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [selections, setSelections] = useState<MonthSimSelection[]>([]);
  const [incomeInput, setIncomeInput] = useState(String(defaultStartingIncome(wealthTypeCode)));
  const [lastChoice, setLastChoice] = useState<{ prompt: string; label: string; amountKrw: number } | null>(null);
  const [requested, setRequested] = useState(false);

  const steps = getMonthSimSteps(wealthTypeCode);
  const startingIncome = Number(incomeInput) || defaultStartingIncome(wealthTypeCode);
  // selections에는 항상 "지금까지 확정된 선택"만 들어있다 — choice 단계에서는
  // 이번 스텝 선택 전 잔액, reveal 단계에서는 방금 선택이 반영된 뒤 잔액이
  // 된다(choose()가 선택을 selections에 먼저 넣고 나서 reveal로 넘어가므로).
  const currentBalance = computeRunningBalance(wealthTypeCode, selections, startingIncome);

  function choose(stepId: string, opt: { id: string; label: string; amountKrw: number }, prompt: string) {
    setSelections((prev) => [...prev, { stepId, optionId: opt.id }]);
    setLastChoice({ prompt, label: opt.label, amountKrw: opt.amountKrw });
    setStage("reveal");
  }

  function continueAfterReveal() {
    if (stepIndex + 1 >= steps.length) {
      setStage("summary");
    } else {
      setStepIndex((i) => i + 1);
      setStage("choice");
    }
  }

  return (
    <div className="mt-8">
      <p className="flex items-center gap-1.5 text-sm font-medium">한 달 살아보기</p>

      {stage === "intro" && (
        <motion.div
          initial={{ opacity: 0.5, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
        >
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            월급이 들어왔습니다. 이번 한 달, 어떻게 쓰시겠어요? 3분이면 끝나요.
          </p>
          <div className="mystic-card mt-4 p-3.5">
            <label htmlFor="month-sim-income" className="text-xs text-muted-foreground">
              이번 달 월급(원) — 직접 입력할 수 있어요
            </label>
            <Input
              id="month-sim-income"
              type="number"
              inputMode="numeric"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              className="mt-1.5 h-11 border-none bg-transparent p-0 text-base font-semibold focus-visible:ring-0"
            />
          </div>
          <Button size="lg" onClick={() => setStage("choice")} className="mt-4 h-13 w-full rounded-full text-base">
            한 달 살아보기 시작
          </Button>
        </motion.div>
      )}

      {stage === "choice" && steps[stepIndex] && (
        <motion.div
          key={steps[stepIndex].id}
          initial={{ opacity: 0.5, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {stepIndex + 1} / {steps.length}
            </span>
            <span>
              지금 잔액 <span className="font-semibold text-foreground">{formatKrw(currentBalance)}</span>
            </span>
          </div>
          <p className="mt-2 text-sm font-medium">{steps[stepIndex].prompt}</p>
          <div className="mt-3 flex flex-col gap-2">
            {steps[stepIndex].options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => choose(steps[stepIndex].id, opt, steps[stepIndex].prompt)}
                className="mystic-card p-3 text-left text-sm transition-colors hover:border-(--gold-soft)"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* exit 애니메이션을 쓰지 않는다 — step-shell.tsx와 같은 이유(탭이
       * 백그라운드로 가면 exit가 안 끝나서 다음 스테이지 위에 이 화면이
       * 그대로 남을 수 있다). initial/animate만으로 등장 연출은 유지된다. */}
      {stage === "reveal" && lastChoice && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-4">
          <p className="text-xs text-muted-foreground">{lastChoice.prompt}</p>
          <p className="mt-1.5 text-sm font-medium">{lastChoice.label}</p>
          <p
            className={`mt-2 text-lg font-semibold ${lastChoice.amountKrw < 0 ? "text-destructive" : lastChoice.amountKrw > 0 ? "text-(--gold)" : "text-muted-foreground"}`}
          >
            {lastChoice.amountKrw === 0 ? "변화 없음" : formatKrw(lastChoice.amountKrw)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            지금 잔액 <span className="font-semibold text-foreground">{formatKrw(currentBalance)}</span>
          </p>
          <Button size="lg" onClick={continueAfterReveal} className="mt-4 h-13 w-full rounded-full text-base">
            다음
          </Button>
        </motion.div>
      )}

      {stage === "summary" &&
        (() => {
          const result = computeMonthSimResult(wealthTypeCode, selections, startingIncome);
          return (
            <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-4">
              <p className="rounded-xl bg-accent p-3.5 text-sm leading-relaxed whitespace-pre-line text-accent-foreground">
                {result.closingText}
              </p>
              <Button
                size="lg"
                onClick={() => setRequested(true)}
                className="mt-4 h-13 w-full rounded-full text-base"
              >
                내 상황에 맞는 실행 순서 찾기
              </Button>
              {requested && (
                <p className="mt-2 text-center text-xs text-(--gold)">결제 연결은 아직 준비 중이에요.</p>
              )}
            </motion.div>
          );
        })()}
    </div>
  );
}
