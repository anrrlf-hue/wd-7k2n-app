"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

// "핵심 -> 펼쳐보기 -> 잠금" 구조에서 두 번째 단계(무료지만 접혀 있는 영역).
// 탭으로 여는 상호작용이라, 배경 tab이 안 보이는 상태에서 mount될 위험이
// 낮지만(사용자가 직접 클릭해야 열림) 초기값은 그래도 0을 피해 안전하게 둔다.
export function ExpandableSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5 rounded-xl border border-border p-3.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground"
      >
        {title}
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0.5 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0.5 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-3 text-sm leading-relaxed">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
