"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "@/components/diagnosis/step-badge";
import type { MoneyCheckResult } from "@/lib/money-check";

export function SummaryStep({ result }: { result: MoneyCheckResult }) {
  return (
    <div className="flex flex-1 flex-col">
      <StepBadge icon={<Sparkles className="size-5" />} />

      <p className="text-sm font-medium text-(--gold)">
        현실 돈 고민 간이진단 결과
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight">
        {result.type}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {result.description}
      </p>

      <div className="mystic-card mystic-ring mt-8 p-5">
        <p className="text-sm font-medium text-(--gold)">더 자세한 유료 리포트</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          사주 재물운 + 현실 돈 고민을 함께 반영해, 실제 재무상담사가 검토하는
          리포트를 준비하고 있어요.
        </p>
        <Button variant="secondary" disabled className="mt-4 w-full rounded-full">
          곧 만나요 (준비 중)
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        오늘 본 결과, 저장해둔 이미지로 다시 꺼내볼 수 있어요.
      </p>

      <div className="mt-auto pt-8">
        <Button asChild size="lg" className="h-13 w-full rounded-full text-base">
          <Link href="/diagnosis">다른 생년월일로 다시 보기</Link>
        </Button>
      </div>
    </div>
  );
}
