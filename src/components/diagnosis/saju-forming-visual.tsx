"use client";

// 사주 여덟 글자(년/월/일/시주)가 하나씩 자리를 잡아가는 느낌의
// "명식 형성" 로딩 비주얼. 실제 계산 로직과는 무관한 연출용 애니메이션.

import { motion } from "framer-motion";

const PILLARS = ["년주", "월주", "일주", "시주"];

export function SajuFormingVisual() {
  return (
    <div className="relative mx-auto h-52 w-52">
      <div
        className="absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(circle, var(--gold-soft) 0%, transparent 70%)",
        }}
      />

      <div className="animate-orbit-spin absolute inset-4 rounded-full border border-dashed border-(--border)" />

      <div className="absolute inset-10 rounded-full border border-(--gold-soft)" />

      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 place-items-center gap-2 p-6">
        {PILLARS.map((label, i) => (
          <motion.div
            key={label}
            className="flex size-16 flex-col items-center justify-center rounded-2xl border border-(--gold-soft) bg-card/80"
            initial={{ opacity: 0.25, scale: 0.85 }}
            animate={{ opacity: [0.25, 1, 0.6], scale: [0.85, 1, 0.95] }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          >
            <span className="shimmer-text text-sm font-semibold">{label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
