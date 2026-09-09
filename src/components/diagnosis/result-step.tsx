"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { Eye, ScrollText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockedCard } from "@/components/diagnosis/locked-card";
import { PalmEntryCard } from "@/components/diagnosis/palm-entry-card";
import { PowerGauge } from "@/components/diagnosis/power-gauge";
import { JobSpectrum } from "@/components/diagnosis/job-spectrum";
import { FlowLine } from "@/components/diagnosis/flow-line";
import { ExpandableSection } from "@/components/diagnosis/expandable-section";
import { getLockedReportCards } from "@/lib/money-tendency";
import { ELEMENT_COLORS } from "@/lib/element-colors";
import type { FullSajuDiagnosis } from "@/lib/saju";

const revealVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export function ResultStep({
  diagnosis,
  onNext,
}: {
  diagnosis: FullSajuDiagnosis;
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
      link.download = "내-재물운.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  }

  const { tendency, deep, resultSource } = diagnosis;
  const isDeep = resultSource === "deep" && deep !== null;
  const interp = deep?.interpretation;

  const lockedCards = getLockedReportCards(tendency);
  const deepLockedCards = isDeep
    ? [...lockedCards, { title: "이 해석의 전체 근거 다시보기", cta: "근거 전체 보기" }]
    : lockedCards;

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-sm font-medium text-(--gold)">나의 재물운</p>

      <motion.div
        ref={cardRef}
        initial="hidden"
        animate="show"
        variants={revealVariants}
        className="mystic-ring relative mt-4 overflow-hidden rounded-2xl border border-(--gold-soft) bg-card p-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: ELEMENT_COLORS[tendency.element] }}
        />

        <motion.div variants={itemVariants} className="relative">
          <Badge
            variant="secondary"
            className="mb-3 gap-1.5 border border-(--gold-soft)"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: ELEMENT_COLORS[tendency.element] }}
            />
            {tendency.element}(五行) · {tendency.stemName}
          </Badge>
          <h2 className="text-xl leading-snug font-semibold tracking-tight text-(--gold)">
            {tendency.wealthType}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {isDeep ? interp!.summary : tendency.summary}
          </p>

          {isDeep && deep!.evidencePreview.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {deep!.evidencePreview.map((ev) => (
                <span
                  key={ev}
                  className="rounded-full bg-(--gold-soft) px-2.5 py-1 text-[10px] leading-none text-(--gold)"
                >
                  {ev}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="mt-5 grid grid-cols-3 gap-2">
          <PowerGauge title="버는 힘" label={tendency.earningPower.label} level={tendency.earningPower.level} />
          <PowerGauge title="지키는 힘" label={tendency.keepingPower.label} level={tendency.keepingPower.level} />
          <PowerGauge title="기회 잡는 힘" label={tendency.opportunityPower.label} level={tendency.opportunityPower.level} />
        </motion.div>

        <motion.div variants={itemVariants} className="mt-5 rounded-xl border border-border p-3.5">
          <p className="text-xs font-medium text-muted-foreground">직장형일까, 사업형일까</p>
          <div className="mt-2">
            <JobSpectrum jobType={tendency.jobType} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-5 rounded-xl border border-border p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5 text-(--gold)" />
            나의 재물 흐름 (등급 기준)
          </p>
          <div className="mt-2">
            <FlowLine curve={tendency.flowCurve} />
          </div>
        </motion.div>

        {isDeep ? (
          <motion.div variants={itemVariants}>
            <ExpandableSection title="돈을 버는 방식 · 지키는 방식 더 보기">
              <div>
                <p className="text-xs font-medium text-(--gold)">돈을 버는 방식</p>
                <p className="mt-1 text-muted-foreground">{interp!.earning_style}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-(--gold)">돈을 지키는 방식</p>
                <p className="mt-1 text-muted-foreground">{interp!.keeping_style}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-(--gold)">사람과 돈의 관계</p>
                <p className="mt-1 text-muted-foreground">{interp!.money_style}</p>
              </div>
            </ExpandableSection>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="mt-5 rounded-xl bg-accent p-3.5">
            <p className="text-xs font-medium text-accent-foreground">나의 강점</p>
            <p className="mt-1 text-sm leading-relaxed">{tendency.topStrength}</p>
          </motion.div>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground">
          재미로 보는 콘텐츠예요 · 일주 {diagnosis.dayPillar}
        </p>
      </motion.div>

      <Button
        variant="outline"
        onClick={handleShare}
        disabled={saving}
        className="mt-4 h-12 w-full rounded-full"
      >
        {saving ? "저장 중..." : "이미지로 저장하고 공유하기"}
      </Button>

      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Eye className="size-4 text-(--gold)" />
          조금 더 보이는 이야기
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          흐리게 보이는 부분은 아래 리포트를 열면 전체를 볼 수 있어요.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {isDeep ? (
            <>
              <TeaserRow label="돈을 놓치는 패턴" text={interp!.risk_pattern} />
              <TeaserRow label="직업·사업 성향" text={interp!.career_business} />
              <TeaserRow label="앞으로의 흐름" text={interp!.timing} />
              <TeaserRow label="지금 필요한 행동" text={interp!.action} />
            </>
          ) : (
            <>
              <TeaserRow label="돈이 새기 쉬운 패턴" text={tendency.leakPattern} />
              <TeaserRow label="직업·사업 방향 힌트" text={tendency.careerHint} />
              <TeaserRow label="앞으로의 흐름 힌트" text={tendency.flowHint} />
              <TeaserRow label="나에게 맞는 행동 힌트" text={tendency.actionHint} />
            </>
          )}
        </div>
      </div>

      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <ScrollText className="size-4 text-(--gold)" />
          더 깊은 재물 리포트
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          십성·대운까지 반영한 상세 리포트로 이어져요.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {deepLockedCards.map((card) => (
            <LockedCard key={card.title} title={card.title} cta={card.cta} />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <PalmEntryCard />
      </div>

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

function TeaserRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="blur-teaser mt-1.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}
