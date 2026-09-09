"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PalmLineIllustration } from "@/components/diagnosis/palm-line-illustration";
import type { BirthInput } from "@/lib/saju";

export function PalmEntryCard({ birthInput }: { birthInput: BirthInput }) {
  const params = new URLSearchParams({
    year: String(birthInput.year),
    month: String(birthInput.month),
    day: String(birthInput.day),
    hour: birthInput.hour === null ? "" : String(birthInput.hour),
    minute: birthInput.minute === null ? "" : String(birthInput.minute),
    gender: birthInput.gender,
  });

  return (
    <Link
      href={`/diagnosis/palm?${params.toString()}`}
      className="mystic-card flex items-center gap-3 border-dashed p-4 transition-colors hover:border-(--gold-soft)"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-(--gold-soft)">
        <PalmLineIllustration />
      </span>
      <div className="flex-1">
        <p className="text-sm leading-snug font-medium">
          사주에서 보인 돈 성향, 손에도 같은 흐름이 있을까?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          손금 사진 한 장으로 사주 재물운과 교차 분석해봐요.
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-(--gold)" />
    </Link>
  );
}
