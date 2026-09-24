"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_PRICE } from "@/lib/pricing";
import { PAID_PRODUCT } from "@/lib/paid-product";
import { track } from "@/lib/analytics";

export function PaywallOffer({
  title,
  includedItems,
  ctaText,
  onRequest,
}: {
  title: string;
  includedItems: string[];
  ctaText: string;
  onRequest?: () => void;
}) {
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

      <p className="relative text-xs text-muted-foreground">첫 유료 파일럿 상품</p>
      <p className="relative mt-1 text-lg leading-snug font-semibold">{title}</p>
      <p className="relative mt-2 text-sm leading-6 text-muted-foreground">
        {PAID_PRODUCT.promise}
      </p>

      <ul className="relative mt-4 space-y-2 text-base">
        {includedItems.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-1 size-4 shrink-0 text-(--gold)" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="relative mt-5 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-(--gold)">{RECOMMENDED_PRICE.label}</span>
        <span className="text-sm text-muted-foreground">· 1회 상품</span>
      </div>
      <Button
        size="lg"
        onClick={() => {
          track("payment_cta_clicked", { sku: PAID_PRODUCT.sku, mode: PAID_PRODUCT.status });
          onRequest?.();
        }}
        className="relative mt-4 h-14 w-full rounded-full text-base shadow-[0_0_24px_var(--gold-soft)]"
      >
        {ctaText}
      </Button>

      <p className="relative mt-2 text-center text-sm text-muted-foreground">
        현실판정 + 선택지 2개 + 첫 행동 + 30일 재점검 1회
      </p>
    </motion.div>
  );
}
