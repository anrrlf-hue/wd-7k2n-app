"use client";

import { motion } from "framer-motion";
import { Compass, Check, AlertTriangle } from "lucide-react";
import type { ConnectionDiagnosis } from "@/lib/connection-diagnosis";

/** 사주 방향 + 현실 위치를 잇는 1차 진단 화면. 일치/막힘을 억지로 만들지
 * 않는다 — connection-diagnosis.ts가 실제로 찾은 것만 보여준다(둘 다
 * 없을 수도 있고, 하나만 있을 수도 있다). */
export function ConnectionDiagnosisCard({ diagnosis }: { diagnosis: ConnectionDiagnosis }) {
  return (
    <motion.div
      initial={{ opacity: 0.4, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-6"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Compass className="size-4 text-(--gold)" />
        사주와 현실을 잇는 1차 진단
      </p>

      <p className="mt-3 text-sm leading-relaxed">{diagnosis.directionText}</p>

      {diagnosis.matchText && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-border p-3">
          <Check className="mt-0.5 size-4 shrink-0 text-(--gold)" />
          <p className="text-sm leading-relaxed">{diagnosis.matchText}</p>
        </div>
      )}

      {diagnosis.blockedText && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-border p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-(--gold)" />
          <p className="text-sm leading-relaxed">{diagnosis.blockedText}</p>
        </div>
      )}

      <p className="mt-3 rounded-xl bg-accent p-3.5 text-sm leading-relaxed text-accent-foreground">
        {diagnosis.bridgeText}
      </p>
    </motion.div>
  );
}
