import { EvidenceToggle, ReportSection } from "@/components/diagnosis/report-section";
import { buildPalmReadingSections, buildRealObservationText, buildTraditionalReadingText } from "@/lib/palm-observation-text";
import type { PalmFacts } from "@/lib/palm-facts";
import type { CompareItem } from "@/lib/triple-compare";

/** Presentation only. Image acceptance and report generation remain at their existing boundaries. */
export function PalmReadingSections({ facts }: { facts: PalmFacts }) {
  const sections = buildPalmReadingSections(facts.onnxLines);
  return (
    <ReportSection step="①" title="손금에서 읽는 나의 모습">
      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.key}>
            <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{section.text}</p>
            <EvidenceToggle evidence={section.observation} />
          </div>
        ))}
        {sections.length === 0 && <p>{buildTraditionalReadingText(facts)}</p>}
        <details className="rounded-xl border border-border p-3 text-base text-muted-foreground">
          <summary className="cursor-pointer text-foreground">사진에서 확인한 선 보기</summary>
          <p className="mt-2 leading-7">{buildRealObservationText(facts)}</p>
        </details>
      </div>
    </ReportSection>
  );
}

export function TripleCompareSection({ items, withPalm = true }: { items: CompareItem[]; withPalm?: boolean }) {
  if (items.length === 0) return null;
  return (
    <ReportSection step={withPalm ? "②" : undefined} title={withPalm ? "사주·손금·내 응답을 함께 보면" : "사주와 내 응답을 함께 보면"}>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.topic} className="rounded-xl border border-border p-4">
            <h3 className="text-base font-semibold">{item.topic === "관계에서 감정이 작용하는 정도" ? "관계와 의사 표현" : item.topic}</h3>
            <p className="mt-2 whitespace-pre-line text-base leading-7 text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
