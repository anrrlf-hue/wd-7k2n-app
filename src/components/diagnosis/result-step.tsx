"use client";

import { CompanionHeading } from "@/components/brand-companion";
import Link from "next/link";
import { Clock3, Hand } from "lucide-react";
import { useRef, useState } from "react";
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
import type { FreeSajuReport } from "@/lib/free-report-schema";
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

const BROAD_SECTIONS = [
  ["타고난 성향", "temperament"],
  ["연애·결혼에서의 나", "loveStyle"],
  ["사람과 관계를 맺는 방식", "relationshipStyle"],
  ["일할 때 힘이 나는 방식", "jobOrientation"],
  ["돈·재물을 다루는 기본 성향", "wealthStructure"],
  ["생활 리듬과 스트레스 패턴", "lifeRhythm"],
  ["의사결정 스타일", "decisionStyle"],
] as const;

function firstSentence(text: string): string {
  const match = text.match(/^(.+?[.!?요])(?:\s|$)/);
  return match?.[1] ?? text;
}

function OtherAreasSummary({
  report,
  focus,
}: {
  report: FreeSajuReport;
  focus: NonNullable<FullSajuDiagnosis["focusedReport"]>["focus"];
}) {
  const areas = [
    { key: "temperament", title: "타고난 성향", paragraph: report.temperament },
    { key: "love_relationship", title: "연애·인간관계", paragraph: report.relationshipStyle },
    { key: "work", title: "일·직업·사업", paragraph: report.jobOrientation },
    { key: "money", title: "돈·재물", paragraph: report.wealthStructure },
    { key: "wellbeing", title: "생활·건강", paragraph: report.lifeRhythm },
  ].filter((item) => item.key !== focus);

  return (
    <section className="mt-7">
      <p className="section-eyebrow">다른 영역은 한눈에</p>
      <div className="mt-3 grid gap-3">
        {areas.map((item) => (
          <div key={item.key} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {firstSentence(item.paragraph.text)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BroadFreeReport({
  report,
  wealthType,
}: {
  report: FreeSajuReport;
  wealthType: FullSajuDiagnosis["wealthType"];
}) {
  return (
    <div className="mt-3">
      {BROAD_SECTIONS.map(([title, key], index) => (
        <div key={key}>
          <ParagraphSection
            step={"②-" + String(index + 1)}
            title={title}
            paragraph={report[key]}
          />
          {key === "wealthStructure" && <WealthTypeSection result={wealthType} />}
        </div>
      ))}

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
    </div>
  );
}

function FocusedFreeReport({
  focusedReport,
}: {
  focusedReport: NonNullable<FullSajuDiagnosis["focusedReport"]>;
}) {
  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="section-eyebrow">집중풀이 · {SAJU_FOCUS_LABELS[focusedReport.focus]}</p>
        <h2 className="mt-2 text-xl leading-8 font-semibold">
          이 분야는 전체 사주보다 더 깊게 봅니다
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {focusedReport.intro}
        </p>
      </div>

      <div className="mt-3">
        {focusedReport.sections.map((section, index) => (
          <ParagraphSection
            key={section.title}
            step={"①-" + String(index + 1)}
            title={section.title}
            paragraph={section.paragraph}
          />
        ))}
      </div>
    </section>
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

  const { tendency, deep, freeReport, focusedReport, resultSource, personalityInput, myeongsik, wealthType } = diagnosis;
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
        <>
          {focusedReport ? (
            <FocusedFreeReport focusedReport={focusedReport} />
          ) : (
            <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
              <p className="section-eyebrow">전체 사주</p>
              <h2 className="mt-2 text-xl leading-8 font-semibold">내 사주를 넓게 한 번에 봅니다</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                성향·관계·일·재물·생활 리듬과 현재 흐름을 한쪽에 치우치지 않고 살펴봅니다.
              </p>
            </section>
          )}

          {focusedReport ? (
            <OtherAreasSummary report={report} focus={focusedReport.focus} />
          ) : (
            <div className="mt-7">
              <p className="section-eyebrow">나의 종합 사주</p>
              <BroadFreeReport report={report} wealthType={wealthType} />
            </div>
          )}
        </>
      ) : (
        <ReportSection title="나의 기본 성향">
          <p>{tendency.topStrength}</p>
        </ReportSection>
      )}

      <DaeunFlowSection view={myeongsik} />
      <MyeongsikSection view={myeongsik} />

      <section className="mt-8 rounded-3xl border border-(--gold-soft) bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)">
          <Clock3 className="size-4" />
          <p className="section-eyebrow">무료 사주 다음</p>
        </div>
        <h2 className="mt-2 text-xl leading-8 font-semibold">
          이제 가장 궁금한 것을<br />직접 물어보세요
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          방금 본 생년월일·출생시간을 다시 입력하지 않고, 같은 사주를 기준으로 질문에 대한 답과 시기를 이어서 봅니다.
        </p>
        <Button asChild size="lg" className="mt-5 h-14 w-full rounded-full text-base">
          <Link href={`/diagnosis?mode=question&focus=${focus}&from=free`}>
            내 질문 답과 시기 보기
          </Link>
        </Button>
      </section>

      <div className="mt-7">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Hand className="size-4 text-(--gold)" />
          원하면 손금까지 더해볼 수 있어요
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          손금은 필수가 아닙니다. 사주와 별도로 현재 드러난 판단·관계·생활 방식을 보고, 두 결과가 어디서 같고 다른지 이어서 살펴봅니다.
        </p>
        <div className="mt-3">
          <PalmEntryCard birthInput={diagnosis.birthInput} personalityInput={personalityInput} focus={focus} />
        </div>
      </div>
    </div>
  );
}
