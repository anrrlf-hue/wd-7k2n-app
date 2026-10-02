import { ReportSection } from "@/components/diagnosis/report-section";
import { buildPalmReadingSections, buildTraditionalReadingText } from "@/lib/palm-observation-text";
import type { PalmFacts } from "@/lib/palm-facts";
import type { CompareItem } from "@/lib/triple-compare";
import type { PalmBilateralReading, PalmFutureTimeline } from "@/lib/palm-bilateral";

export function PalmReadingSections({ facts, title = "손금에서 보이는 나의 모습", step = "2" }: { facts: PalmFacts; title?: string; step?: string }) {
  const sections = buildPalmReadingSections(facts.onnxLines, facts.secondaryLines, {
    handShape: facts.handShape,
    handSide: facts.handSide,
  });
  return (
    <ReportSection step={step} title={title}>
      <div className="space-y-6">
        {sections.map((section) => {
          const highlighted =
            section.key === "overview" ||
            section.key === "fate" ||
            section.key === "sun" ||
            section.key === "wealthLine" ||
            section.key === "secondaryTogether" ||
            section.key === "coreStory" ||
            section.key === "wealth";
          const showObservation =
            section.key === "overview" ||
            section.key === "heartLine" ||
            section.key === "headLine" ||
            section.key === "lifeLine" ||
            section.key === "fate" ||
            section.key === "sun" ||
            section.key === "wealthLine" ||
            section.key === "secondaryTogether" ||
            section.key === "coreStory";

          return (
            <div
              key={section.key}
              className={highlighted ? "rounded-2xl border border-(--gold-soft) bg-card p-4" : ""}
            >
              <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
              {showObservation && (
                <p className="mt-2 text-sm leading-6 text-(--gold)">{section.observation}</p>
              )}
              <p className="mt-2 text-base leading-7 text-muted-foreground">{section.text}</p>
            </div>
          );
        })}
        {sections.length === 0 && <p>{buildTraditionalReadingText(facts)}</p>}
      </div>
    </ReportSection>
  );
}

export function PalmBilateralSection({ reading }: { reading: PalmBilateralReading | null }) {
  if (!reading) return null;
  return (
    <ReportSection title="오른손·왼손을 함께 보면">
      <div className="rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="text-base leading-7 text-foreground">{reading.summary}</p>
        <div className="mt-4 space-y-3">
          {reading.items.map((item) => (
            <div key={item.title} className="rounded-xl bg-accent p-4">
              <h3 className="text-sm font-semibold text-(--gold)">{item.title}</h3>
              <p className="mt-1 text-base leading-7 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{reading.note}</p>
      </div>
    </ReportSection>
  );
}

export function PalmFutureTimelineSection({ timeline }: { timeline: PalmFutureTimeline | null }) {
  if (!timeline) return null;
  return (
    <ReportSection title="앞으로의 손금 흐름">
      <div className="rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="text-sm leading-6 text-muted-foreground">
          현재 만 {timeline.currentAge}세 이후만 봅니다.
        </p>
        <div className="mt-4 space-y-4">
          {timeline.windows.map((window) => (
            <div key={window.ageLabel} className="rounded-xl bg-accent p-4">
              <p className="text-xs font-semibold text-(--gold)">{window.ageLabel}</p>
              <h3 className="mt-1 text-base font-semibold text-foreground">{window.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{window.palmReading}</p>
              {window.sajuReading && (
                <p className="mt-2 text-sm leading-6 text-foreground/80">
                  사주 흐름: {window.sajuReading}
                </p>
              )}
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{window.combined}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{timeline.note}</p>
      </div>
    </ReportSection>
  );
}

export function TripleCompareSection({ items, withPalm = true }: { items: CompareItem[]; withPalm?: boolean }) {
  if (items.length === 0) return null;
  return (
    <ReportSection step={withPalm ? "3" : undefined} title={withPalm ? "사주·손금·내 답을 함께 보면" : "사주와 내 답을 함께 보면"}>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.topic} className="rounded-xl border border-border p-4">
            <h3 className="text-base font-semibold">{item.topic === "관계에서 감정을 사용하는 태도" ? "관계와 의사 표현" : item.topic}</h3>
            <p className="mt-2 whitespace-pre-line text-base leading-7 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
