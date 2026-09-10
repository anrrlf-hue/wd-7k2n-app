"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_PRICE } from "@/lib/pricing";

/** 첫 유료 결제창은 극도로 단순화한다 — 개인화 제목 -> 이 결제로 알게 될
 * 3~4가지 -> 가격 -> CTA, 그게 전부다. 이전에 있던 Trust Signal Grid(기술
 * 근거·금융상품 미판매·이미지 저장 안내)는 전부 제거했다 — 사용자가 이
 * 화면에서 계속 생각해야 하는 건 자기 재물운뿐이어야 한다. */
export function PaywallOffer({
  title,
  includedItems,
  ctaText,
}: {
  title: string;
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

      <p className="relative text-sm leading-snug font-semibold">{title}</p>
      <ul className="relative mt-3 space-y-1.5 text-sm">
        {includedItems.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-5 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-(--gold)">{RECOMMENDED_PRICE.label}</span>
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
          결제 연결은 아직 준비 중이에요.
        </motion.p>
      )}
    </motion.div>
  );
}
