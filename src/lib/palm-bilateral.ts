import { eulReul } from "@/lib/korean-particle";
import { buildPalmContextReading } from "@/lib/palm-context-reading";
import { normalizePalmFactsObservation } from "@/lib/palm-facts";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import { buildPalmCustomerPassages, palmCustomerLimits, palmPersonalLineReading, palmLineObservation, measuredPalmShape } from "@/lib/palm-customer-reading";

export type DominantHand = "left" | "right";
export const PALM_READING_VERSION = "bilateral-reading-v5";
export interface PalmBilateralItem {
  title: string;
  observation?: string;
  text: string;
}
export interface PalmBilateralReading {
  version?: string;
  summary: string;
  items: PalmBilateralItem[];
  note: string;
}

export function isStoredPalmReading(value: unknown): value is PalmBilateralReading {
  if (!value || typeof value !== "object") return false;
  const reading = value as PalmBilateralReading;
  return typeof reading.summary === "string" && typeof reading.note === "string"
    && Array.isArray(reading.items) && reading.items.every(item => item && typeof item.title === "string"
      && typeof item.text === "string" && (item.observation === undefined || typeof item.observation === "string"));
}

function observed(line: OnnxLineDetail | null | undefined): string {
  return palmLineObservation(line ?? undefined);
}

/** Compare each observed feature once. Absence is never a low personality score.
 * The dominant-hand convention is a traditional lens, not evidence of change
 * over time: both photos were taken now, under potentially different lighting. */
export function buildPalmBilateralReading(left: PalmFacts, right: PalmFacts, dominantHand: DominantHand): PalmBilateralReading {
  left = normalizePalmFactsObservation(left);
  right = normalizePalmFactsObservation(right);
  const current = dominantHand === "right" ? right : left;
  const currentLabel = dominantHand === "right" ? "오른손" : "왼손";
  const plan = buildPalmContextReading(left, right, dominantHand);
  const items: PalmBilateralItem[] = [];
  for (const [key, title] of [
    ["headLine", "두뇌선 · 생각과 결정"],
    ["heartLine", "감정선 · 마음을 주고받는 방식"],
    ["lifeLine", "생명선 · 생활과 활동 리듬"],
  ] as const) {
    const l = observed(left.onnxLines?.[key]), r = observed(right.onnxLines?.[key]);
    const primaryText = palmPersonalLineReading(key, current.onnxLines?.[key]);
    const other = dominantHand === "right" ? left : right;
    const otherLabel = dominantHand === "right" ? "왼손" : "오른손";
    const reading = primaryText ?? palmPersonalLineReading(key, other.onnxLines?.[key]);
    if (!reading) continue;
    const parts = [reading];
    if (!primaryText) parts.push(`이 항목은 모양이 읽힌 ${otherLabel} 사진을 기준으로 봤으며 ${currentLabel}과의 비교는 아직 하지 않았습니다.`);
    items.push({ title, observation: l === r ? `양손: ${l}` : `왼손: ${l} 오른손: ${r}`, text: parts.join(" ") });
  }
  const extras = { left: buildPalmCustomerPassages(left), right: buildPalmCustomerPassages(right) };
  for (const key of ["handShape", "fingers", "fate"]) {
    const l = extras.left.find(p => p.key === key), r = extras.right.find(p => p.key === key);
    if (l && r && l.text === r.text) {
      items.push({ title: `양손 · ${l.title}`, observation: `왼손: ${l.observation} 오른손: ${r.observation}`, text: l.text });
    } else {
      if (l) items.push({ title: `왼손 · ${l.title}`, observation: `왼손: ${l.observation}`, text: l.text });
      if (r) items.push({ title: `오른손 · ${r.title}`, observation: `오른손: ${r.observation}`, text: r.text });
      if (l && r) {
        const position = { middle: "일에서 스스로 남기고 싶은 의미", thumb_side: "생활에서 지키고 싶은 리듬", pinky_side: "함께하는 사람과 나누고 싶은 반응" };
        const lp = left.secondaryLines?.fate.candidateObservation?.position, rp = right.secondaryLines?.fate.candidateObservation?.position;
        const ls = measuredPalmShape(left), rs = measuredPalmShape(right);
        const longMiddle = (shape: PalmFacts["handShape"] | null) => shape === "rectangular" || shape === "slender";
        const relation = key === "fingers" && left.handGeometry?.indexRing !== "similar" && right.handGeometry?.indexRing !== "similar"
          ? "두 사진에서는 자기 의견을 세우는 모습과 표현한 결과의 반응을 듣는 모습을 나란히 읽어볼 수 있습니다. 가령 내 생각을 잘 보여주었다고 느껴도 남이 좋은 반응을 보이지 않을 때에는, 의견을 지킨 만족과 알아주기를 바란 마음이 다르게 남을 수 있습니다. 어떤 마음이 더 컸는지 돌아보는 참고이며 두 손을 과거와 현재로 나누지는 않습니다."
          : key === "handShape" && longMiddle(ls) !== longMiddle(rs)
            ? "두 사진의 중지 비율에서는 세부를 이해한 뒤 마음을 놓는 모습과 직접 해보고 감을 잡는 모습을 나란히 읽습니다. 가령 시작 전에는 충분히 알고 싶었지만 작은 시도를 해 본 뒤에야 질문이 구체적이 되는 장면입니다. 이해와 실행을 하나의 성격으로 고정하기보다 어떤 순서에서 마음이 편해졌는지 돌아보는 참고입니다. 사진의 손 자세도 비율에 영향을 줍니다."
            : key === "fate" && lp && rp && lp !== rp
              ? `왼손 후보에서는 ${position[lp]}${eulReul(position[lp])}, 오른손 후보에서는 ${position[rp]}${eulReul(position[rp])} 참고로 읽습니다. 가령 잘해낼 수 있는 일이더라도 그 일을 고르면서 기대했던 것과 계속하고 싶은 이유는 달라질 수 있습니다. 두 질문을 함께 놓으면 능숙함 하나로 만족을 정하기보다 자신에게 남았던 다른 의미를 돌아볼 여지가 있습니다. 다른 시점의 변화나 진로 예측으로 보지는 않습니다.`
              : null;
        if (relation) items.push({ title: `양손의 ${key === "handShape" ? "형태" : key === "fingers" ? "손가락 비율" : "운명선 후보"} 함께 보기`,
          observation: `왼손: ${l.observation} 오른손: ${r.observation}`, text: relation });
      }
    }
  }
  const limits = new Map<string, string[]>();
  for (const [label, facts] of [["왼손", left], ["오른손", right]] as const) for (const text of palmCustomerLimits(facts)) limits.set(text, [...(limits.get(text) ?? []), label]);
  return {
    version: PALM_READING_VERSION,
    summary: plan.passages.find(p => p.id === "head-heart-composition")?.text ?? "이번 사진에서 읽힌 선과 손의 특징을 중심으로 풀이합니다. 아직 확인하지 못한 부분은 아래에 따로 표시했습니다.",
    items,
    note: [...limits].map(([text, labels]) => labels.length === 2 ? text : `${labels[0]}: ${text}`).join("\n"),
  };
}
