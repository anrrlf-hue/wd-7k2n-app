"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Lock, ShieldCheck, ImageDown, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_PRICE } from "@/lib/pricing";

const TRUST_SIGNALS = [
  { icon: BadgeCheck, label: "실제 명식 계산 근거 사용" },
  { icon: ShieldCheck, label: "손금은 실제 이미지 분석(ONNX) 결과 사용" },
  { icon: Lock, label: "금융상품 판매·권유 없음" },
  { icon: ImageDown, label: "결과 이미지 저장 가능" },
];

export function PaywallOffer({
  includedItems,
  ctaText,
}: {
  includedItems: string[];
  ctaText: string;
}) {
  const [requested, setRequested] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0.5, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="mystic-card mystic-ring relative mt-5 overflow-hidden p-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--gold)" }}
      />

      <p className="relative text-xs font-medium text-(--gold)">전체 리포트에 포함돼요</p>
      <ul className="relative mt-2.5 space-y-1.5 text-sm">
        {includedItems.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-5 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-(--gold)">{RECOMMENDED_PRICE.label}</span>
        <span className="text-xs text-muted-foreground">· 한 번 결제로 평생 보기</span>
      </div>

      <Button
        size="lg"
        onClick={() => setRequested(true)}
        className="relative mt-4 h-13 w-full rounded-full text-base shadow-[0_0_24px_var(--gold-soft)]"
      >
        {ctaText}
      </Button>

      {requested && (
        <motion.p
          initial={{ opacity: 0.6, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="relative mt-2 text-center text-xs text-(--gold)"
        >
          결제 연결은 준비 중이에요. 오픈하면 가장 먼저 알려드릴게요.
        </motion.p>
      )}

      <div className="relative mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
        {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1">
            <Icon className="size-3 text-(--gold)" />
            {label}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
