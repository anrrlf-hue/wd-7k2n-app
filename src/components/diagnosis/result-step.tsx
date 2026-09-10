"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { TrendingUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PalmEntryCard } from "@/components/diagnosis/palm-entry-card";
import { PowerGauge } from "@/components/diagnosis/power-gauge";
import { JobSpectrum } from "@/components/diagnosis/job-spectrum";
import { FlowLine } from "@/components/diagnosis/flow-line";
import { ReportSection } from "@/components/diagnosis/report-section";
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

/** 1차 무료 결과. 결제 제안/잠금 카드/무료 경계 표시는 이 화면에 절대
 * 두지 않는다 — 무료 콘텐츠는 손금+최종 통합 리포트까지 이어지고, 결제
 * 선택은 그 모든 무료 콘텐츠가 끝난 뒤 손금 결과 화면에서 딱 한 번만
 * 나온다. 이 화면의 유일한 다음 행동은 손금으로 넘어가는 것이다. */
export function ResultStep({
  diagnosis,
}: {
  diagnosis: FullSajuDiagnosis;
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

  const { tendency, deep, freeReport, resultSource, personalityInput } = diagnosis;
  const isDeep = resultSource === "deep" && deep !== null;
  const interp = deep?.interpretation;
  const report = freeReport?.report ?? null;

  return (
    <div className="result-bright flex flex-1 flex-col">
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
            {report ? report.snapshot : isDeep ? interp!.summary : tendency.summary}
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

      {/* 1차 무료 결과 — 손금 전에는 핵심 5~7개만 보여준다("조금 맞는 것 같은데,
       * 손금까지 보면 어떻게 나오지?"를 만드는 게 목적). 17섹션 전체는 손금까지
       * 끝난 뒤 palm-page-client.tsx의 최종 통합 리포트에서 보여준다. */}
      <div className="mt-6">
        {report ? (
          <>
            <ReportSection step="②" title="타고난 성향">
              <p>{report.temperament}</p>
            </ReportSection>
            <ReportSection step="③" title="돈을 버는 방식">
              <p>{report.earningStyle}</p>
            </ReportSection>
            <ReportSection step="④" title="돈을 지키는 방식">
              <p>{report.keepingStyle}</p>
            </ReportSection>
            <ReportSection step="⑤" title="돈을 놓치는 반복 패턴">
              <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{report.leakPattern}</p>
            </ReportSection>
            <ReportSection step="⑥" title="직장형일까, 사업형일까">
              <p>{report.jobOrientation}</p>
            </ReportSection>
            <ReportSection step="⑦" title="나와 비교해볼까요">
              <p className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
                <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
                {report.selfCheckQuestions[0]}
              </p>
            </ReportSection>
          </>
        ) : (
          <ReportSection title="나의 강점">
            <p>{tendency.topStrength}</p>
          </ReportSection>
        )}
      </div>

      {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소이자 이 화면의 유일한
       * 다음 행동이다. 나머지 심층 섹션과 결제 선택은 손금까지 끝난 뒤
       * 최종 통합 리포트 화면에서 딱 한 번만 나온다. */}
      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          손에도 같은 흐름이 있을까요?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          손금 사진 한 장이면 30초 안에 사주와 교차 비교하고, 나머지 심층 리포트까지 이어서 볼 수 있어요.
        </p>
        <div className="mt-3">
          <PalmEntryCard birthInput={diagnosis.birthInput} personalityInput={personalityInput} />
        </div>
      </div>
    </div>
  );
}
