import type { PremiumPeriod, PremiumReport } from "@/lib/premium-report";
import type { TenGodGroup } from "@/lib/saju-facts";

const THEMES: Record<TenGodGroup, string> = {
  비겁: "자기 판단과 동등한 몫", 식상: "표현과 결과물", 재성: "보상과 실제 쓰임",
  관성: "역할과 약속", 인성: "이해와 준비",
};
const FOCUS: Partial<Record<string, string>> = {
  관성: "맡을 범위와 지킬 약속 자체에 초점을 둡니다.",
  인성: "선택에 더 필요한 이해와 도움을 살피는 데 초점을 둡니다.",
  "관성·비겁": "맡을 역할 안에서 스스로 정할 부분과 함께 합의할 부분을 나누어 봅니다.",
  "비겁·인성": "조언을 받아들이면서도 자신의 선택 기준을 놓치지 않는 균형을 다시 살펴봅니다.",
  "비겁·식상": "자기 생각을 내는 일과 함께 정할 몫을 구분하는 데 다시 초점을 둡니다.",
};
function groups(period: PremiumPeriod): TenGodGroup[] {
  const value = period.interpretation?.evidence.find(e => e.id === "month")?.value;
  return typeof value === "string" ? value.split("·").filter((g): g is TenGodGroup => Object.hasOwn(THEMES, g)) : [];
}
const names = (values: TenGodGroup[]) => values.map(g => THEMES[g]).join(" · ");

/** A repeated passage still needs a readable month entry. Compare the actual
 * monthly symbols; never manufacture a different event to fill the calendar. */
function sharedRecap(period: PremiumPeriod, shared: PremiumPeriod[]): string {
  const current = groups(period);
  if (!current.length) return period.reading;
  const distance = (other: PremiumPeriod) => {
    const prior = groups(other);
    return current.filter(g => !prior.includes(g)).length + prior.filter(g => !current.includes(g)).length;
  };
  const closest = [...shared].sort((a, b) => distance(a) - distance(b))[0];
  const prior = closest ? groups(closest) : [];
  const common = current.filter(g => prior.includes(g));
  const added = current.filter(g => !prior.includes(g));
  const removed = prior.filter(g => !current.includes(g));
  const focus = FOCUS[[...current].sort().join("·")] ?? `이 구간에서도 ‘${period.headline}’ 관점을 이어서 읽습니다.`;
  if (!closest || !common.length) return `이 구간의 월별 주제는 ‘${names(current)}’입니다. ${focus}`;
  if (!added.length && !removed.length) return `${closest.label}과 같은 ‘${names(current)}’ 조합입니다. ${focus}`;
  const contrast = added.length && removed.length
    ? `이 구간에는 ‘${names(removed)}’ 대신 ‘${names(added)}’ 주제가 함께 놓입니다.`
    : added.length ? `여기에 ‘${names(added)}’ 주제를 함께 읽습니다.`
      : `이 구간에서는 ‘${names(removed)}’ 주제가 함께 강조되지는 않습니다.`;
  return `${closest.label}과 ‘${names(common)}’ 주제를 공유합니다. ${contrast} ${focus}`;
}

export interface PremiumPeriodPresentation {
  paragraphs: string[];
  shared: PremiumPeriod[];
  daeun: string | null;
}

/** Keep the original stored explanations intact; references lead to the one
 * complete explanation, while every non-highlight month keeps its own recap. */
export function buildPremiumPeriodPresentation(report: PremiumReport): Map<PremiumPeriod, PremiumPeriodPresentation> {
  const highlights = report.periods.filter(p => report.annualHighlights?.includes(p.months[0]));
  const firstOccurrence = new Map<string, PremiumPeriod>();
  const seenDaeun = new Set<string>();
  const result = new Map<PremiumPeriod, PremiumPeriodPresentation>();
  for (const period of [...highlights, ...report.periods.filter(p => !highlights.includes(p))]) {
    if (["connected-reading-2026-10-v12", "year-connected-reading-2026-10-v13", "natal-customer-reading-2026-10-v14"].includes(report.version)) {
      // Each month owns a coherent relationship, scene and resolution. New
      // editions no longer rely on deleting repeated sentences to seem distinct.
      result.set(period, { paragraphs: period.interpretation?.passages.map(p => p.text) ?? [period.reading], shared: [], daeun: null });
      continue;
    }
    if (["distinct-reading-2026-10-v9", "decision-reading-2026-10-v10", "lived-reading-2026-10-v11"].includes(report.version)) {
      const paragraphs: string[] = [], shared: PremiumPeriod[] = [];
      for (const passage of period.interpretation?.passages ?? []) {
        // New editions can share one sentence inside different monthly scenes.
        // Keep each scene's new meaning together and link the reused sentence.
        // Earlier saved editions retain their existing presentation.
        const units = report.version === "lived-reading-2026-10-v11"
          ? passage.text.split(/(?<=\.)\s+/) : [passage.text];
        const unique: string[] = [];
        for (const unit of units) {
          const prior = firstOccurrence.get(unit);
          if (prior) { if (prior !== period && !shared.includes(prior)) shared.push(prior); }
          else { firstOccurrence.set(unit, period); unique.push(unit); }
        }
        if (unique.length) paragraphs.push(unique.join(" "));
      }
      // The exact month symbols make the first passage unique. Still keep a
      // readable pointer if a future pair really shares every explanation.
      if (!paragraphs.length) paragraphs.push(`${period.label}의 근거는 앞선 구간과 같습니다. 아래 계산 근거와 앞선 해설을 함께 보세요.`);
      result.set(period, { paragraphs, shared, daeun: null });
      continue;
    }
    const source = period.interpretation?.passages.filter(p => (p.kind === "traditional" && p.id !== "daeun-context")
      || (["integrated-reading-2026-10-v5", "coherent-reading-2026-10-v6", "edited-reading-2026-10-v7", "evidence-reading-2026-10-v8"].includes(report.version) && p.kind === "reflection" && p.id.endsWith("scene"))).map(p => p.text) ?? [period.reading];
    const paragraphs: string[] = [], shared: PremiumPeriod[] = [];
    for (const paragraph of source) {
      const prior = firstOccurrence.get(paragraph);
      if (prior && period.interpretation) { if (!shared.includes(prior)) shared.push(prior); }
      else { firstOccurrence.set(paragraph, period); paragraphs.push(paragraph); }
    }
    if (shared.length && (!paragraphs.length || (["edited-reading-2026-10-v7", "evidence-reading-2026-10-v8"].includes(report.version) && paragraphs.every(p => p.length <= 30)))) {
      const recap = sharedRecap(period, shared);
      paragraphs.push(["edited-reading-2026-10-v7", "evidence-reading-2026-10-v8"].includes(report.version) ? `${period.label}에는 ${recap}` : recap);
    }
    const background = period.interpretation?.passages.find(p => p.id === "daeun-context")?.text;
    const daeun = highlights.includes(period) && background && !seenDaeun.has(background) ? background : null;
    if (daeun) seenDaeun.add(daeun);
    result.set(period, { paragraphs, shared, daeun });
  }
  return result;
}
