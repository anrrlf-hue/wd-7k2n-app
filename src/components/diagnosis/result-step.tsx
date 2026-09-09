"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { Eye, ScrollText, TrendingUp, HelpCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LockedCard } from "@/components/diagnosis/locked-card";
import { PalmEntryCard } from "@/components/diagnosis/palm-entry-card";
import { FreeBoundaryMarker } from "@/components/diagnosis/free-boundary-marker";
import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { TeaserRow } from "@/components/diagnosis/teaser-row";
import { PowerGauge } from "@/components/diagnosis/power-gauge";
import { JobSpectrum } from "@/components/diagnosis/job-spectrum";
import { FlowLine } from "@/components/diagnosis/flow-line";
import { ReportSection, EvidenceItemCard } from "@/components/diagnosis/report-section";
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

      {/* 무료 사주 V2 — 3~5분 읽기에 맞춘 문단 중심 콘텐츠, 17섹션 */}
      <div className="mt-6">
        {report ? (
          <>
            <ReportSection step="②" title="타고난 성향">
              <p>{report.temperament}</p>
            </ReportSection>
            <ReportSection step="③" title="재물운·돈복의 큰 구조">
              <p>{report.wealthStructure}</p>
            </ReportSection>
            <ReportSection step="④" title="돈을 버는 방식">
              <p>{report.earningStyle}</p>
            </ReportSection>
            <ReportSection step="⑤" title="돈을 지키는 방식">
              <p>{report.keepingStyle}</p>
            </ReportSection>
            <ReportSection step="⑥" title="돈을 놓치는 반복 패턴">
              <p className="rounded-xl bg-accent p-3.5 text-accent-foreground">{report.leakPattern}</p>
            </ReportSection>
            <ReportSection step="⑦" title="큰돈·기회와 관계된 성향">
              <p>{report.bigMoneyAffinity}</p>
            </ReportSection>
            <ReportSection step="⑧" title="직장형일까, 사업형일까">
              <p>{report.jobOrientation}</p>
            </ReportSection>
            <ReportSection step="⑨" title="조직에서 강한 부분">
              <p>{report.teamStrength}</p>
            </ReportSection>
            <ReportSection step="⑩" title="독립적으로 움직일 때 강한 부분">
              <p>{report.soloStrength}</p>
            </ReportSection>
            <ReportSection step="⑪" title="사람과 돈">
              <p>{report.peopleAndMoney}</p>
            </ReportSection>
            <ReportSection step="⑫" title="의사결정 스타일">
              <p>{report.decisionStyle}</p>
            </ReportSection>
            <ReportSection step="⑬" title="기회를 잡는 방식">
              <p>{report.opportunityStyle}</p>
            </ReportSection>

            {report.personalityComparison && (
              <ReportSection title="자기보고 성향과 비교하면">
                <p className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
                  <span>{report.personalityComparison}</span>
                </p>
              </ReportSection>
            )}

            <ReportSection step="⑭" title="나의 강점 3가지">
              <div className="space-y-2.5">
                {report.strengths.map((s, i) => (
                  <EvidenceItemCard key={s.title} index={i + 1} title={s.title} detail={s.detail} evidence={s.evidence} />
                ))}
              </div>
            </ReportSection>

            <ReportSection step="⑮" title="조심하면 좋은 점 3가지">
              <div className="space-y-2.5">
                {report.cautions.map((c, i) => (
                  <EvidenceItemCard key={c.title} index={i + 1} title={c.title} detail={c.detail} evidence={c.evidence} />
                ))}
              </div>
            </ReportSection>

            <ReportSection step="⑯" title="나와 비교해볼까요">
              <div className="space-y-2">
                {report.selfCheckQuestions.map((q) => (
                  <p key={q} className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
                    <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-(--gold)" />
                    {q}
                  </p>
                ))}
              </div>
            </ReportSection>

            <ReportSection step="⑰" title="왜 이런 결과가 나왔을까">
              <p className="text-sm text-muted-foreground">{report.evidenceExplainer}</p>
            </ReportSection>
          </>
        ) : (
          <ReportSection title="나의 강점">
            <p>{tendency.topStrength}</p>
          </ReportSection>
        )}
      </div>

      {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소 — 반드시 결제 안내보다 위 */}
      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-(--gold)" />
          여기까지 사주에서 본 성향, 손에도 같은 흐름이 있을까요?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          손금 사진 한 장이면 30초 안에 사주와 교차 비교까지 볼 수 있어요.
        </p>
        <div className="mt-3">
          <PalmEntryCard birthInput={diagnosis.birthInput} personalityInput={personalityInput} />
        </div>
      </div>

      <FreeBoundaryMarker />

      <div className="mt-5">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Eye className="size-4 text-(--gold)" />
          정확한 시기가 궁금하다면
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          지금까지는 &ldquo;어떤 사람인지&rdquo;를 봤다면, 여기부터는 &ldquo;언제&rdquo;에 대한 이야기예요.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {isDeep ? (
            <>
              <TeaserRow label="앞으로의 흐름이 바뀌는 시기" text={interp!.timing} />
              <TeaserRow label="지금 시기에 필요한 행동" text={interp!.action} />
            </>
          ) : (
            <>
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
          대운 전체 흐름과 손금 심화 비교까지 반영한 상세 리포트로 이어져요.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <LockedCard title="앞으로 3년, 정확한 시기별 흐름" cta="정확한 시기 보기" />
          <LockedCard title="사주+손금 심화 교차 리포트" cta="심화 교차 리포트 보기" />
          <LockedCard title="현실 재무 상태와 비교해보기" cta="현실 재무검증 시작하기" />
        </div>

        <PaywallOffer
          includedItems={[
            "앞으로 3년 정확한 시기별 흐름",
            "대운 전체 흐름 그래프",
            "사주+손금 심화 교차 비교",
            "현실 재무정보와 비교 검증",
            "지금 시기에 필요한 구체적 행동",
            "전체 계산 근거 원문",
          ]}
          ctaText="내 사주에서 돈이 크게 움직이는 시기 보기"
        />
      </div>

      <div className="mt-auto pt-8">
        <p className="mb-3 text-center text-xs text-muted-foreground">
          재밌게 보셨다면, 이제 진짜 내 상황도 1분만 체크해볼까요?
        </p>
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
