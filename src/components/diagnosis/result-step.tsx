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
import { PersonCompareCard } from "@/components/diagnosis/person-compare-card";
import { ReportSection } from "@/components/diagnosis/report-section";
import { WealthTypeSection } from "@/components/diagnosis/wealth-type-section";
import { MyeongsikSection } from "@/components/diagnosis/myeongsik-section";
import { DaeunFlowSection } from "@/components/diagnosis/daeun-flow-section";
import { ELEMENT_COLORS } from "@/lib/element-colors";
import type { FullSajuDiagnosis } from "@/lib/saju";
import type { FreeSajuReport } from "@/lib/free-report-schema";
import { SAJU_FOCUS_LABELS } from "@/lib/saju-focus";
import { buildFreeConsultationSections } from "@/lib/free-consultation-style-v1";

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

function ConsultationFreeReport({
  report,
  wealthType,
}: {
  report: FreeSajuReport;
  wealthType: FullSajuDiagnosis["wealthType"];
}) {
  const sections = buildFreeConsultationSections(report);

  return (
    <div className="mt-5 space-y-4">
      {sections.map((section) => {
        const highlighted = section.key === "now" || section.key === "future";
        const caution = section.key === "cautions";
        return (
          <div key={section.key}>
            <section
              className={
                "rounded-3xl border bg-card p-5 " +
                (highlighted
                  ? "border-(--gold-soft)"
                  : caution
                    ? "border-border"
                    : "border-border")
              }
            >
              {section.eyebrow && <p className="section-eyebrow">{section.eyebrow}</p>}
              <h2 className="mt-2 text-xl leading-8 font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3">
                {section.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className={
                      "text-base leading-8 " +
                      (index === 0 ? "text-foreground/90" : "text-muted-foreground")
                    }
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
            {section.key === "money" && <WealthTypeSection result={wealthType} />}
          </div>
        );
      })}
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
      <div className="rounded-3xl border border-(--gold-soft) bg-card p-5">
        <p className="section-eyebrow">{SAJU_FOCUS_LABELS[focusedReport.focus]}을 중심으로 보면</p>
        <h2 className="mt-2 text-xl leading-8 font-semibold">
          지금 궁금한 부분부터 깊게 풀어볼게요
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {focusedReport.intro}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {focusedReport.sections.map((section, index) => (
          <section
            key={section.title}
            className={
              "rounded-3xl border bg-card p-5 " +
              (index >= focusedReport.sections.length - 2 ? "border-(--gold-soft)" : "border-border")
            }
          >
            <p className="section-eyebrow">
              {index === 0 ? "먼저 보면" : index === 3 ? "지금은" : index === 4 ? "앞으로는" : "이어서 보면"}
            </p>
            <h3 className="mt-2 text-lg leading-7 font-semibold">{section.title}</h3>
            <p className="mt-3 text-base leading-8 text-muted-foreground">
              {section.paragraph.text}
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}

/** 1차 무료 결과. 본인 사주를 충분히 본 뒤에만 질문·사람 비교·손금으로
 * 자연스럽게 이어지게 한다. 사람 비교는 중간 풀이를 가로막는 별도 진단이
 * 아니라 "내 사주를 관계 속에서 이어보기" 선택지로만 노출한다. */
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
            <div className="mt-7">
              <p className="section-eyebrow">내 사주를 이어서 보면</p>
              <h2 className="mt-2 text-xl leading-8 font-semibold">
                성향부터 관계·일·돈·앞으로의 흐름까지 하나로 이어봅니다
              </h2>
              <ConsultationFreeReport report={report} wealthType={wealthType} />
            </div>
          )}

          {focusedReport && (
            <OtherAreasSummary report={report} focus={focusedReport.focus} />
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
          <p className="section-eyebrow">사주를 더 이어서 보면</p>
        </div>
        <h2 className="mt-2 text-xl leading-8 font-semibold">
          이제 가장 궁금한 것을<br />직접 물어보세요
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          방금 본 생년월일·출생시간을 다시 입력하지 않고, 같은 사주를 기준으로 질문에 대한 답과 시기를 이어서 봅니다. 사람과의 관계가 궁금하다면 아래에서 두 사람의 사주를 함께 볼 수도 있습니다.
        </p>
        <Button asChild size="lg" className="mt-5 h-14 w-full rounded-full text-base">
          <Link href={`/diagnosis?mode=question&focus=${focus}&from=free`}>
            내 질문 답과 시기 보기
          </Link>
        </Button>
      </section>

      <PersonCompareCard me={diagnosis.birthInput} />

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
