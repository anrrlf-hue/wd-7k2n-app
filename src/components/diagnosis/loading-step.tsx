"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandCompanion } from "@/components/brand-companion";

// 실제 파이프라인 4단계(사주 계산 -> 구조 분석 -> 재물/직업 흐름 분석 ->
// 개인 해석 생성)에 맞춘 문구. 딥 해석 호출이 오래 걸리면 마지막 문구에서
// 자연스럽게 반복된다. 콜드스타트 등으로 서버가 평소보다 오래 걸릴 때
// "멈춘 것 같다"는 인상을 주지 않도록 5번째 문구를 추가해둔다 — 화면
// 캐릭터는 조용히 머물고, 상태 문구만 진행 상황을 알려준다.
const STATUS_MESSAGES = [
  "사주를 계산하는 중이에요",
  "명식 구조를 분석하는 중이에요",
  "재물·직업 흐름을 분석하는 중이에요",
  "나만의 해석을 만드는 중이에요",
  "거의 다 됐어요, 조금만 더 기다려주세요",
];

export function LoadingStep() {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // 마지막 문구에 도달하면 거기서 멈춘다. 딥 해석 호출이 오래 걸려도
      // "처음부터 다시" 도는 것처럼 보이지 않게.
      setStatusIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <BrandCompanion state="analyzing" presence="transition" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={statusIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {STATUS_MESSAGES[statusIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
