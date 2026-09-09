"use client";

// 사주 여덟 글자(년/월/일/시주)가 하나씩 자리를 잡아가고, 오행이 순서대로
// 활성화되는 "명식 형성" 로딩 비주얼. 실제 계산 로직과는 무관한 연출용 애니메이션.

import { motion } from "framer-motion";
import { ELEMENT_COLORS } from "@/lib/element-colors";

const PILLARS = ["년주", "월주", "일주", "시주"];

const ELEMENT_DOTS: { element: keyof typeof ELEMENT_COLORS; angle: number }[] = [
  { element: "목", angle: -90 },
  { element: "화", angle: -18 },
  { element: "토", angle: 54 },
  { element: "금", angle: 126 },
  { element: "수", angle: 198 },
];

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

      <div className="animate-orbit-spin absolute inset-4 rounded-full border border-dashed border-(--border)">
        {ELEMENT_DOTS.map((d, i) => (
          <motion.span
            key={d.element}
            className="absolute top-1/2 left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-medium text-background"
            style={{
              transform: `rotate(${d.angle}deg) translate(4.4rem) rotate(${-d.angle}deg) translate(-50%, -50%)`,
              backgroundColor: ELEMENT_COLORS[d.element],
            }}
            initial={{ opacity: 0.35, scale: 0.85 }}
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.1, 0.85] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          >
            {d.element}
          </motion.span>
        ))}
      </div>

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
