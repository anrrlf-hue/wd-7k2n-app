import { ReportSection } from "@/components/diagnosis/report-section";
import { buildPalmCustomerPassages, palmCustomerLimits } from "@/lib/palm-customer-reading";
import { normalizePalmFactsObservation, isPalmFactsUsable, type PalmFacts } from "@/lib/palm-facts";
import type { CompareItem } from "@/lib/triple-compare";
import type { PalmBilateralReading } from "@/lib/palm-bilateral";

export function PalmReadingSections({ facts, title = "손금에서 보이는 나의 모습", step = "2" }: { facts: PalmFacts; title?: string; step?: string }) {
  facts = normalizePalmFactsObservation(facts);
  const sections = isPalmFactsUsable(facts) ? buildPalmCustomerPassages(facts) : [];
  return <ReportSection step={step} title={title}>
    <div className="space-y-6">
      {sections.map(section => <div key={section.key}>
        <h3 className="text-base font-semibold">{section.title}</h3>
        <p className="mt-2 text-base leading-7 text-muted-foreground">{section.text}</p>
        <details className="mt-2 text-sm text-muted-foreground"><summary>사진에서 확인한 특징</summary><p className="mt-2 leading-6">{section.observation}</p></details>
      </div>)}
      {!sections.length && <p>이번 사진에서는 개인 손금 풀이에 사용할 모양을 확인하지 못했습니다. 다시 촬영하거나 다른 사진을 선택해주세요.</p>}
      <details className="text-sm text-muted-foreground"><summary>이번 사진에서 확인한 범위</summary><ul className="mt-2 space-y-2 leading-6">{palmCustomerLimits(facts).map(note => <li key={note}>{note}</li>)}</ul></details>
    </div>
  </ReportSection>;
}

export function PalmBilateralSection({ reading, handObservations = [] }: {
  reading: PalmBilateralReading | null;
  handObservations?: Array<{ label: string; facts: PalmFacts }>;
}) {
  if (!reading) return null;
  const overviews = handObservations.flatMap(({ label, facts }) => {
    const normalized = normalizePalmFactsObservation(facts);
    if (!isPalmFactsUsable(normalized)) return [];
    const overview = buildPalmCustomerPassages(normalized).find((section) => section.key === "handOverview");
    return overview ? [{ label, overview }] : [];
  });
  return (
    <ReportSection title="양손에서 보이는 특징과 해석">
      <div className="rounded-2xl border border-(--gold-soft) bg-card p-5">
        <p className="text-base leading-7 text-foreground">{reading.summary}</p>
        {overviews.length > 0 && <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <h3 className="text-sm font-semibold text-(--gold)">손별로 확인한 형태</h3>
          <div className="mt-3 space-y-3">
            {overviews.map(({ label, overview }) => <div key={label}>
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{overview.text}</p>
            </div>)}
          </div>
        </div>}
        <div className="mt-4 space-y-3">
          {reading.items.map((item) => (
            <div key={item.title} className="rounded-xl bg-accent p-4">
              <h3 className="text-sm font-semibold text-(--gold)">{item.title}</h3>
              {item.text && <p className="mt-2 text-base leading-7 text-muted-foreground">{item.text}</p>}
              {item.observation && <details className="mt-2 text-sm text-muted-foreground"><summary>사진에서 확인한 특징</summary><p className="mt-2 leading-6">{item.observation}</p></details>}
            </div>
          ))}
        </div>
        {reading.note && <details className="mt-4 text-sm text-muted-foreground"><summary>이번 사진에서 확인한 범위</summary><p className="mt-2 whitespace-pre-line leading-6">{reading.note}</p></details>}
      </div>
    </ReportSection>
  );
}

export function TripleCompareSection({ items, withPalm = true, withSelf = true }: { items: CompareItem[]; withPalm?: boolean; withSelf?: boolean }) {
  if (items.length === 0) return null;
  return (
    <ReportSection step={withPalm ? "3" : undefined} title={withPalm ? withSelf ? "사주·손금·내 답을 함께 보면" : "사주와 손금을 함께 읽으면" : withSelf ? "사주와 내 답을 함께 보면" : "사주에서 읽는 나의 모습"}>
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
