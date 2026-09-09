"use client";

// 정밀 수치 대신 1~5 등급을 5칸 게이지로 시각화한다.
// (실제 계산값이 없는 항목이므로 숫자로 위장하지 않는다.)

import { motion } from "framer-motion";

export function PowerGauge({
  title,
  label,
  level,
}: {
  title: string;
  label: string;
  level: 1 | 2 | 3 | 4 | 5;
}) {
  return (
    <div className="rounded-xl border border-border p-2.5 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <div className="mt-1.5 flex justify-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.span
            key={i}
            className="h-3 w-1.5 rounded-full"
            style={{
              backgroundColor: i <= level ? "var(--gold)" : "var(--muted)",
            }}
            initial={{ scaleY: 0.3, opacity: 0.5 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-snug font-semibold text-(--gold)">
        {label}
      </p>
    </div>
  );
}
