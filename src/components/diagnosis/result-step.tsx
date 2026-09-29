"use client";

import { CompanionHeading } from "@/components/brand-companion";
import { Fragment, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PalmEntryCard } from "@/components/diagnosis/palm-entry-card";
import { ReportSection, ParagraphSection, EvidenceItemCard } from "@/components/diagnosis/report-section";
import { WealthTypeSection } from "@/components/diagnosis/wealth-type-section";
import { MyeongsikSection } from "@/components/diagnosis/myeongsik-section";
import { DaeunFlowSection } from "@/components/diagnosis/daeun-flow-section";
import { ELEMENT_COLORS } from "@/lib/element-colors";
import type { FullSajuDiagnosis } from "@/lib/saju";
import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import { SAJU_FOCUS_LABELS, SAJU_FOCUS_SHORT_DESCRIPTIONS, type SajuFocus } from "@/lib/saju-focus";

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

type SectionKey =
  | "temperament"
  | "relationshipStyle"
  | "loveStyle"
  | "jobOrientation"
  | "teamStrength"
  | "soloStrength"
  | "wealthStructure"
  | "earningStyle"
  | "keepingStyle"
  | "leakPattern"
  | "bigMoneyAffinity"
  | "lifeRhythm"
  | "decisionStyle"
  | "opportunityStyle"
  | "nextMove"
  | "timingShift";

interface SectionDef {
  key: SectionKey;
  title: string;
  paragraph: ReportParagraph;
  showGuidance?: boolean;
}

function sectionMap(report: FreeSajuReport): Record<SectionKey, SectionDef> {
  return {
    temperament: { key: "temperament", title: "타고난 성향", paragraph: report.temperament },
    relationshipStyle: { key: "relationshipStyle", title: "사람과 관계를 맺는 방식", paragraph: report.relationshipStyle },
    loveStyle: { key: "loveStyle", title: "연애·결혼에서의 나", paragraph: report.loveStyle },
    jobOrientation: { key: "jobOrientation", title: "일할 때 힘이 나는 방식", paragraph: report.jobOrientation },
    teamStrength: { key: "teamStrength", title: "조직에서 강한 부분", paragraph: report.teamStrength },
    soloStrength: { key: "soloStrength", title: "혼자 움직일 때 강한 부분", paragraph: report.soloStrength },
    wealthStructure: { key: "wealthStructure", title: "돈·재물을 다루는 기본 성향", paragraph: report.wealthStructure },
    earningStyle: { key: "earningStyle", title: "돈을 만드는 방식", paragraph: report.earningStyle },
    keepingStyle: { key: "keepingStyle", title: "돈을 지키는 방식", paragraph: report.keepingStyle },
    leakPattern: { key: "leakPattern", title: "돈에서 반복하기 쉬운 패턴", paragraph: report.leakPattern, showGuidance: true },
    bigMoneyAffinity: { key: "bigMoneyAffinity", title: "큰 기회와 돈을 대하는 방식", paragraph: report.bigMoneyAffinity },
    lifeRhythm: { key: "lifeRhythm", title: "생활 리듬과 스트레스 패턴", paragraph: report.lifeRhythm },
    decisionStyle: { key: "decisionStyle", title: "의사결정 스타일", paragraph: report.decisionStyle },
    opportunityStyle: { key: "opportunityStyle", title: "기회를 잡는 방식", paragraph: report.opportunityStyle },
    nextMove: { key: "nextMove", title: "지금 무엇을 해야 하는가", paragraph: report.nextMove },
    timingShift: { key: "timingShift", title: "앞으로 큰 흐름은 어떻게 바뀌는가", paragraph: report.timingShift },
  };
}

const FOCUS_PRIORITY: Record<SajuFocus, SectionKey[]> = {
  overall: ["temperament", "relationshipStyle", "loveStyle", "jobOrientation", "wealthStructure", "lifeRhythm"],
  love: ["loveStyle", "relationshipStyle", "temperament", "decisionStyle"],
  money: ["wealthStructure", "earningStyle", "keepingStyle", "leakPattern", "bigMoneyAffinity"],
  career: ["jobOrientation", "teamStrength", "soloStrength", "decisionStyle"],
  work_business: ["jobOrientation", "soloStrength", "opportunityStyle", "decisionStyle"],
  relationship: ["relationshipStyle", "decisionStyle", "temperament"],
  wellbeing: ["lifeRhythm", "temperament", "decisionStyle"],
};

const CORE_ORDER: SectionKey[] = [
  "temperament",
  "loveStyle",
  "relationshipStyle",
  "jobOrientation",
  "wealthStructure",
  "lifeRhythm",
  "decisionStyle",
  "nextMove",
  "timingShift",
];

function OrderedFreeReport({
  report,
  focus,
  wealthType,
}: {
  report: FreeSajuReport;
  focus: SajuFocus;
  wealthType: FullSajuDiagnosis["wealthType"];
}) {
  const sections = sectionMap(report);
  const priority = FOCUS_PRIORITY[focus];
  const used = new Set(priority);
  const remaining = CORE_ORDER.filter((key) => !used.has(key));

  function renderSection(key: SectionKey, index: number, prefix: string) {
    const item = sections[key];
    return (
      <Fragment key={key}>
        <ParagraphSection
          step={prefix + String(index + 1)}
          title={item.title}
          paragraph={item.paragraph}
          showGuidance={item.showGuidance}
        />
        {key === "wealthStructure" && <WealthTypeSection result={wealthType} />}
      </Fragment>
    );
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="section-eyebrow">먼저 보고 싶은 주제 · {SAJU_FOCUS_LABELS[focus]}</p>
        <h2 className="mt-2 text-xl leading-8 font-semibold">
          {focus === "overall" ? "전체 사주를 고르게 먼저 봅니다" : SAJU_FOCUS_LABELS[focus] + "부터 먼저 풀어볼게요"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {SAJU_FOCUS_SHORT_DESCRIPTIONS[focus]}. 다른 영역도 아래에서 함께 볼 수 있습니다.
        </p>
      </section>

      <div className="mt-3">
        {priority.map((key, index) => renderSection(key, index, "①-"))}
      </div>

      {remaining.length > 0 && (
        <div className="mt-7">
          <p className="section-eyebrow">전체 사주도 함께 보기</p>
          <div className="mt-3">
            {remaining.map((key, index) => renderSection(key, index, "②-"))}
          </div>
        </div>
      )}

      <ReportSection title="조심할 반복 패턴">
        <div className="space-y-2.5">
          {report.cautions.map((item, index) => (
            <EvidenceItemCard
              key={item.title}
              index={index + 1}
              title={item.title}
              detail={item.detail}
              evidence={item.evidence}
            />
          ))}
        </div>
      </ReportSection>

      {report.realWorldPersonalization && (
        <ParagraphSection title="현실에서는 이렇게 나타나요" paragraph={report.realWorldPersonalization} />
      )}
    </>
  );
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
      link.download = "내-사주풀이.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setSaving(false);
    }
  }

  const { tendency, deep, freeReport, resultSource, personalityInput, myeongsik, wealthType } = diagnosis;
  const focus = diagnosis.focus ?? "overall";
  const isDeep = resultSource === "deep" && deep !== null;
  const interp = deep?.interpretation;
  const report = freeReport?.report ?? null;
  const lead = report ? splitLeadSentence(report.snapshot.text) : null;

  return (
    <div className="result-bright flex flex-1 flex-col">
      <CompanionHeading state="saju-companion"><p className="section-eyebrow">나의 사주</p></CompanionHeading>

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
          <h2 className="text-2xl leading-snug font-semibold tracking-tight text-foreground">
            {lead ? lead.headline : tendency.stemName + "의 기본 성향"}
          </h2>
          {(lead ? lead.rest : isDeep ? interp!.summary : tendency.summary) && (
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {lead ? lead.rest : isDeep ? interp!.summary : tendency.summary}
            </p>
          )}
        </motion.div>

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          성향·관계·일·재물·생활 리듬과 현재 흐름을 함께 봅니다.
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

      {report ? (
        <OrderedFreeReport report={report} focus={focus} wealthType={wealthType} />
      ) : (
        <ReportSection title="나의 기본 성향">
          <p>{tendency.topStrength}</p>
        </ReportSection>
      )}

      <DaeunFlowSection view={myeongsik} />
      <MyeongsikSection view={myeongsik} />

      {/* 손금은 유료 보너스가 아니라 무료 핵심 구성요소이자 이 화면의 유일한
       * 다음 행동이다. 나머지 심층 섹션과 결제 선택은 손금까지 끝난 뒤
       * 최종 통합 리포트 화면에서 딱 한 번만 나온다. */}
      <div className="mt-8">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          손에도 같은 성향과 흐름이 보일까요?
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          손금은 사주와 별도로 읽고, 두 결과가 어디서 같고 다른지 이어서 살펴봅니다.
        </p>
        <div className="mt-3">
          <PalmEntryCard birthInput={diagnosis.birthInput} personalityInput={personalityInput} focus={focus} />
        </div>
      </div>
    </div>
  );
}
