"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SajuDiagnosis } from "@/lib/saju";

export function ResultStep({
  diagnosis,
  onNext,
}: {
  diagnosis: SajuDiagnosis;
  onNext: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  async function handleShare() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "내-돈-성향.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  }

  const { tendency } = diagnosis;

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-sm font-medium text-muted-foreground">나의 돈 성향</p>

      <div
        ref={cardRef}
        className="mt-4 rounded-2xl border border-border bg-card p-6"
      >
        <Badge variant="secondary" className="mb-3">
          {tendency.element}(五行) · {tendency.stemName}
        </Badge>
        <h2 className="text-xl font-semibold leading-snug tracking-tight">
          {tendency.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {tendency.summary}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              강점
            </p>
            <ul className="space-y-1 text-sm">
              {tendency.strengths.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              주의할 점
            </p>
            <ul className="space-y-1 text-sm">
              {tendency.watchOuts.map((s) => (
                <li key={s}>· {s}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          재미로 보는 콘텐츠예요 · 일주 {diagnosis.dayPillar}
        </p>
      </div>

      <Button
        variant="outline"
        onClick={handleShare}
        disabled={saving}
        className="mt-4 h-12 w-full rounded-full"
      >
        {saving ? "저장 중..." : "이미지로 저장하고 공유하기"}
      </Button>

      <div className="mt-auto pt-8">
        <Button
          size="lg"
          onClick={onNext}
          className="h-13 w-full rounded-full text-base"
        >
          현실 돈 고민도 체크해보기
        </Button>
      </div>
    </div>
  );
}
