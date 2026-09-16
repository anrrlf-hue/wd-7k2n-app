"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getMonthSimSteps, computeMonthSimResult, type MonthSimSelection } from "@/lib/month-simulation";
import type { WealthTypeCode } from "@/lib/wealth-type-copy";

type Stage = "intro" | number | "summary";

/** 한 달 살아보기 1회차 — 무료 결과 맨 마지막에 붙는 3분짜리 체험. 사주
 * 유형(재물 유형)이 시작 조건·선택지 세트를 정한다(month-simulation-data.ts).
 * 되돌리기 없이 한 방향으로만 진행해 3분 안에 끝나게 한다. 결과 금액은
 * 순수 산술이라 같은 선택이면 항상 같은 결과다(난수 없음). palm-page-
 * client.tsx의 PaymentBridge와 같은 "로컬 useState 서브퍼널" 패턴을 그대로
 * 쓴다 — 새 상태관리 방식을 만들지 않는다. */
export function MonthSimulation({ wealthTypeCode }: { wealthTypeCode: WealthTypeCode }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [selections, setSelections] = useState<MonthSimSelection[]>([]);
  const [requested, setRequested] = useState(false);

  const steps = getMonthSimSteps(wealthTypeCode);

  function choose(stepId: string, optionId: string, stepIndex: number) {
    const next = [...selections, { stepId, optionId }];
    setSelections(next);
    setStage(stepIndex + 1 >= steps.length ? "summary" : stepIndex + 1);
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
          <Button size="lg" onClick={() => setStage(0)} className="mt-4 h-13 w-full rounded-full text-base">
            한 달 살아보기 시작
          </Button>
        </motion.div>
      )}

      {typeof stage === "number" && steps[stage] && (
        <motion.div
          key={steps[stage].id}
          initial={{ opacity: 0.5, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <p className="text-xs text-muted-foreground">
            {stage + 1} / {steps.length}
          </p>
          <p className="mt-1.5 text-sm font-medium">{steps[stage].prompt}</p>
          <div className="mt-3 flex flex-col gap-2">
            {steps[stage].options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => choose(steps[stage].id, opt.id, stage)}
                className="mystic-card p-3 text-left text-sm transition-colors hover:border-(--gold-soft)"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {stage === "summary" &&
        (() => {
          const result = computeMonthSimResult(wealthTypeCode, selections);
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
