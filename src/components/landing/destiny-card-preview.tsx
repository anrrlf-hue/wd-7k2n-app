"use client";

// 아직 입력 전이라 실제 결과는 없다. 대신 "반쯤 열린 명식 카드"처럼
// 결과 화면의 구조(등급 게이지·흐름 곡선)를 미리 보여주는 티저.
// 값은 모두 placeholder이며 실제 진단 데이터가 아니다.

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const PREVIEW_GAUGES = [
  { label: "버는 힘", level: 4 },
  { label: "지키는 힘", level: 2 },
  { label: "기회 잡는 힘", level: 5 },
];

export function DestinyCardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0.6, rotate: -3, y: 12 }}
      animate={{ opacity: 1, rotate: -1.5, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      whileTap={{ rotate: 0, scale: 1.02 }}
      className="mystic-card relative mx-auto mt-8 w-full max-w-xs overflow-hidden p-4 text-left"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -left-10 size-32 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gold)" }}
      />

      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">
          내 재물 명식 미리보기
        </p>
        <span className="flex items-center gap-1 rounded-full bg-(--gold-soft) px-2 py-0.5 text-[10px] font-medium text-(--gold)">
          <Lock className="size-2.5" />
          잠김
        </span>
      </div>

      <p className="relative mt-2 text-base leading-snug font-semibold">
        나의 재물 유형은{" "}
        <span className="blur-teaser inline-block align-middle">
          ○○형 재물운
        </span>
      </p>

      <div className="relative mt-3 grid grid-cols-3 gap-2">
        {PREVIEW_GAUGES.map((g) => (
          <div key={g.label} className="rounded-lg border border-border p-1.5 text-center">
            <p className="text-[9px] text-muted-foreground">{g.label}</p>
            <div className="mt-1 flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="h-2 w-1 rounded-full"
                  style={{ backgroundColor: i <= g.level ? "var(--gold)" : "var(--muted)" }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
        앞으로 흐름, 놓치는 패턴, 어울리는 방식까지{" "}
        <span className="blur-teaser">전부 이 안에 있어요.</span>
      </p>
    </motion.div>
  );
}
