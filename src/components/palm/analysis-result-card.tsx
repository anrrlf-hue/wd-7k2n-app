"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/analysis-result";

function formatKrw(n: number): string {
  return `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("ko-KR")}원`;
}

/** 설문 직후 분석 결과 화면 — 결제 버튼을 두지 않는다(이 화면의 유일한
 * 다음 행동은 결제 화면으로 넘어가는 것뿐, 결제 자체는 다음 화면에서).
 * 문구 순서 고정: 한 줄 결론 -> 왜 -> 생활에서의 의미 -> 지금 안 해도
 * 되는 것 -> 근거 숫자. 병목 후보는 1개만 보여준다. */
export function AnalysisResultCard({ result, onProceed }: { result: AnalysisResult; onProceed: () => void }) {
  return (
    <motion.div initial={{ opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-8">
      <p className="text-base font-semibold text-(--gold)">{result.headline}</p>
      <p className="mt-3 text-sm leading-relaxed">{result.why}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.lifeMeaning}</p>
      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
        지금 당장 안 해도 되는 건 {result.notUrgent}입니다.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">근거 숫자 — 월 잉여금 {formatKrw(result.surplusKrw)}</p>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        이 문제, 구체적으로 뭐부터 손대야 할지 확인해드릴게요. 결제 후 당신에게 맞는 실행 방법을 바로 알려드립니다.
      </p>
      <Button size="lg" onClick={onProceed} className="mt-4 h-13 w-full rounded-full text-base">
        결제하기
      </Button>
    </motion.div>
  );
}
