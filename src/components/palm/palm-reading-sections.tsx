import { ReportSection } from "@/components/diagnosis/report-section";
import { buildPalmReadingSections, buildTraditionalReadingText } from "@/lib/palm-observation-text";
import type { PalmFacts } from "@/lib/palm-facts";
import type { CompareItem } from "@/lib/triple-compare";

export function PalmReadingSections({ facts }: { facts: PalmFacts }) {
  const sections = buildPalmReadingSections(facts.onnxLines);
  return (
    <ReportSection step="2" title="손금에서 보이는 나의 모습">
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.key} className={section.key === "wealth" ? "rounded-2xl border border-(--gold-soft) bg-card p-4" : ""}>
            <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{section.text}</p>
          </div>
        ))}
        {sections.length === 0 && <p>{buildTraditionalReadingText(facts)}</p>}
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
