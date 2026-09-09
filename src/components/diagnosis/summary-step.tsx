"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { MoneyCheckResult } from "@/lib/money-check";

export function SummaryStep({ result }: { result: MoneyCheckResult }) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="text-sm font-medium text-muted-foreground">
        현실 돈 고민 간이진단 결과
      </p>
      <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight">
        {result.type}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {result.description}
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-border p-5">
        <p className="text-sm font-medium">더 자세한 유료 리포트</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          실제 재무상담사가 검토하는 현실 돈관리 리포트를 준비하고 있어요.
        </p>
        <Button variant="secondary" disabled className="mt-4 w-full rounded-full">
          곧 만나요 (준비 중)
        </Button>
      </div>

      <div className="mt-auto pt-8">
        <Button asChild variant="ghost" className="w-full">
          <Link href="/diagnosis">처음부터 다시 보기</Link>
        </Button>
      </div>
    </div>
  );
}
