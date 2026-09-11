"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PalmEntryCard } from "@/components/diagnosis/palm-entry-card";
import { ReportSection, ParagraphSection, EvidenceItemCard } from "@/components/diagnosis/report-section";
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

/** report.snapshot.text(실제 계산 결과 기반 요약)의 첫 문장을 헤드라인으로,
 * 나머지를 본문으로 나눈다. 일간 하나만 보고 고정된 "OO형 재물운" 라벨을
 * 실제 분석보다 앞세우지 않기 위해(§2), 그 라벨(MoneyTendency.wealthType)은
 * report 자체가 없는 진짜 fallback 상황에서만 쓴다 — 있는 텍스트를 다시
 * 지어내지 않고 나누기만 하므로 새 판단을 추가하지 않는다. */
function splitLeadSentence(text: string): { headline: string; rest: string } {
  const match = text.match(/^(.+?[.!?요])\s+([\s\S]+)$/);
  if (!match) return { headline: text, rest: "" };
  return { headline: match[1], rest: match[2] };
}

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
  const lead = report ? splitLeadSentence(report.snapshot.text) : null;

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
            {lead ? lead.headline : tendency.wealthType}
          </h2>
          {(lead ? lead.rest : isDeep ? interp!.summary : tendency.summary) && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {lead ? lead.rest : isDeep ? interp!.summary : tendency.summary}
            </p>
          )}
        </motion.div>

        <p className="mt-6 text-[11px] text-muted-foreground">
          정답이 아니라 흐름을 보는 콘텐츠예요.
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

      {/* 1차 무료 결과 — 사용자가 실제로 궁금해하는 7가지 질문 순서로
       * 배치한다: 크게 벌 수 있는 타입인가 -> 왜 모이거나 안 모이는가 ->
       * 어떻게 벌 때 유리한가 -> 직장형/사업형 -> 지금 뭘 해야 하는가 ->
       * 어떤 선택이 기회를 놓치게 하는가 -> 언제 변화가 오는가. 나머지
       * 섹션(팀워크/기회를 잡는 방식 등)은 손금까지 끝난 뒤
       * palm-page-client.tsx의 최종 통합 리포트에서 보여준다. */}
      <div className="mt-6">
        {report ? (
          <>
            <ParagraphSection step="②" title="타고난 성향" paragraph={report.temperament} />
            <ParagraphSection step="③" title="돈을 크게 벌 수 있는 타입인가" paragraph={report.bigMoneyAffinity} />
            <ParagraphSection step="④" title="왜 돈이 잘 모이거나 안 모이는가" paragraph={report.wealthStructure} />
            <ParagraphSection step="⑤" title="돈을 지키는 방식" paragraph={report.keepingStyle} />
            <ParagraphSection step="⑥" title="돈을 놓치는 반복 패턴" paragraph={report.leakPattern} boxed />
            <ParagraphSection step="⑦" title="어떤 방식으로 벌 때 유리한가" paragraph={report.earningStyle} />
            <ParagraphSection step="⑧" title="직장형일까, 사업형일까" paragraph={report.jobOrientation} />
            <ParagraphSection step="⑨" title="지금 무엇을 해야 하는가" paragraph={report.nextMove} />
            <ReportSection step="⑩" title="어떤 선택이 돈과 기회를 놓치게 하는가">
              <div className="space-y-2.5">
                {report.cautions.map((c, i) => (
                  <EvidenceItemCard key={c.title} index={i + 1} title={c.title} detail={c.detail} evidence={c.evidence} />
                ))}
              </div>
            </ReportSection>
            <ParagraphSection step="⑪" title="앞으로 언제 큰 변화가 오는가" paragraph={report.timingShift} />
            {report.realWorldPersonalization && (
              <ParagraphSection step="⑫" title="현실에서는 이렇게 나타나요" paragraph={report.realWorldPersonalization} />
            )}
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
          손금 사진 한 장이면 사주와 교차 비교하고, 나머지 심층 리포트까지 이어서 볼 수 있어요.
        </p>
        <div className="mt-3">
          <PalmEntryCard birthInput={diagnosis.birthInput} personalityInput={personalityInput} />
        </div>
      </div>
    </div>
  );
}
