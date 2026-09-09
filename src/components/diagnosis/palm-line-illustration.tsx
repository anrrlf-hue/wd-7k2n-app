"use client";

// 손금(생명선/감정선/두뇌선)을 추상적인 라인 아트로 표현한 장식용 일러스트.
// 실제 손금 인식/분석과는 무관하며, 손금 업로드 유도 카드에만 사용한다.

import { motion } from "framer-motion";

const LINES = [
  "M20 78 C 30 65, 28 45, 42 30", // 생명선
  "M18 55 C 35 52, 55 50, 78 42", // 감정선
  "M18 62 C 40 66, 60 68, 80 60", // 두뇌선
];

export function PalmLineIllustration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="size-12 shrink-0 text-(--gold)"
    >
      <path
        d="M28 90 C 18 90, 14 78, 16 62 C 17 50, 15 40, 20 25 C 22 18, 30 16, 32 24 C 33 30, 32 36, 33 40 C 34 32, 34 20, 38 16 C 41 13, 47 15, 47 22 C 47 30, 45 36, 46 40 C 47 30, 49 20, 54 18 C 58 16, 63 19, 62 26 C 61 33, 58 38, 58 42 C 61 36, 66 30, 71 32 C 76 34, 76 41, 72 47 C 66 56, 60 60, 62 72 C 64 84, 56 92, 44 92 C 38 92, 32 91, 28 90 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.35"
      />
      {LINES.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          initial={{ pathLength: 0.001, opacity: 0.9 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.2 + i * 0.25, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}
