"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_PRICE, PAYMENT_METHODS } from "@/lib/pricing";
import { REPORT_CONTENTS } from "@/lib/report-contents";
import { eunNeun } from "@/lib/korean-particle";
import type { AnalysisResult } from "@/lib/analysis-result";

function formatKrw(n: number): string {
  return `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ko-KR")}원`;
}

/** 설문 직후 분석 결과 화면 — 결제 버튼을 두지 않는다(이 화면의 유일한
 * 다음 행동은 결제 화면으로 넘어가는 것뿐, 결제 자체는 다음 화면에서).
 * 문구 순서 고정: 한 줄 결론 -> 왜 -> 생활에서의 의미 -> 지금 안 해도
 * 되는 것(이유 포함) -> 근거 숫자 -> 격차 한 방(결제 직전 임팩트). 병목
 * 후보는 1개만 보여준다. 격차 문구는 불안 조성이 아니라 순수 숫자 격차만
 * 보여준다("지금 안 하면 늦습니다" 류 표현 없음). 그 아래로 리포트 구성
 * 항목(무엇을 받는지) -> 가격·결제수단(가격은 미정이라 하드코딩하지 않고
 * pricing.ts의 설정값을 그대로 노출) -> 결제하기 순서로 이어진다. */
export function AnalysisResultCard({ result, onProceed }: { result: AnalysisResult; onProceed: () => void }) {
  return (
    <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-8">
      <p className="text-base font-semibold text-(--gold)">{result.headline}</p>
      <p className="mt-3 text-sm leading-relaxed">{result.why}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.lifeMeaning}</p>
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
        {result.notUrgent}{eunNeun(result.notUrgent)} 지금 안 해도 됩니다. {result.notUrgentReason}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">근거 숫자 — 월 잉여금 {formatKrw(result.surplusKrw)}</p>

      <div className="mystic-card mt-4 p-3.5">
        <p className="text-sm leading-relaxed font-medium text-(--gold)">{result.gapStatement}</p>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        이 문제, 구체적으로 뭐부터 손대야 할지 확인해드릴게요. 결제 후 당신에게 맞는 실행 방법을 바로 알려드립니다.
      </p>

      <ul className="mt-4 space-y-1.5 text-sm">
        {REPORT_CONTENTS.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-(--gold)">{RECOMMENDED_PRICE.label}</span>
        <span className="text-xs text-muted-foreground">{PAYMENT_METHODS.join(" · ")}</span>
      </div>

      <Button size="lg" onClick={onProceed} className="mt-4 h-13 w-full rounded-full text-base">
        결제하기
      </Button>
    </motion.div>
  );
}
