import { buildPalmContextReading } from "@/lib/palm-context-reading";
import { normalizePalmFactsObservation } from "@/lib/palm-facts";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import { palmCustomerLimits, palmPersonalLineReading, palmLineObservation } from "@/lib/palm-customer-reading";

export type DominantHand = "left" | "right";
export const PALM_READING_VERSION = "bilateral-reading-v8-life-geometry-guard";
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

function observedFor(key: "headLine" | "heartLine" | "lifeLine", line: OnnxLineDetail | null | undefined): string {
  if (key === "lifeLine" && line?.anatomicalStatus !== "supported") return "생명선은 엄지 쪽 실제 경로가 충분히 확인되지 않아 개인 관찰에서 보류했습니다.";
  return observed(line);
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
    const l = observedFor(key, left.onnxLines?.[key]), r = observedFor(key, right.onnxLines?.[key]);
    const primaryText = palmPersonalLineReading(key, current.onnxLines?.[key]);
    const other = dominantHand === "right" ? left : right;
    const otherLabel = dominantHand === "right" ? "왼손" : "오른손";
    const reading = primaryText ?? palmPersonalLineReading(key, other.onnxLines?.[key]);
    if (!reading) continue;
    const parts = [reading];
    const leftText = palmPersonalLineReading(key, left.onnxLines?.[key]), rightText = palmPersonalLineReading(key, right.onnxLines?.[key]);
    if (left.imageQuality === "good" && right.imageQuality === "good" && leftText && rightText && left.onnxLines?.[key].curve !== right.onnxLines?.[key].curve) {
      const comparison = key === "headLine"
        ? "두 사진의 두뇌선 모양이 달라 함께 읽으면, 익숙한 예에 연결하며 이해가 붙는 순간과 이유를 한 줄로 정리해야 마음이 놓이는 순간을 함께 볼 수 있습니다. 예를 떠올리는 과정과 실제로 고르는 과정에서 다른 방식이 편했을 수 있습니다."
        : key === "heartLine"
          ? "두 사진의 감정선 모양이 달라 함께 읽으면, 말로 반응을 주고받고 싶은 마음과 조용히 챙기는 행동에 남겨 둔 마음을 나란히 볼 수 있습니다. 같은 사람도 이야기하고 싶은 순간과 말없이 해 주는 것이 편한 순간을 다르게 느낄 수 있습니다."
          : "두 사진의 생명선 모양이 달라 함께 읽으면, 새로운 활동에서 얻는 즐거움과 익숙한 순서로 돌아왔을 때의 편안함을 나란히 볼 수 있습니다. 활동을 고를 때와 하루를 마칠 때 마음에 남는 것이 달랐는지 떠올릴 여지가 있습니다.";
      parts.push(comparison);
    }
    if (!primaryText) parts.push(`이 항목은 모양이 읽힌 ${otherLabel} 사진을 기준으로 봤으며 ${currentLabel}과의 비교는 아직 하지 않았습니다.`);
    items.push({ title, observation: l === r ? `양손: ${l}` : `왼손: ${l} 오른손: ${r}`, text: parts.join(" ") });
  }
  const limits = new Map<string, string[]>();
  for (const [label, facts] of [["왼손", left], ["오른손", right]] as const) for (const text of palmCustomerLimits(facts)) limits.set(text, [...(limits.get(text) ?? []), label]);
  return {
    version: PALM_READING_VERSION,
    summary: plan.passages.find(p => p.id === "head-heart-composition")?.text ?? "이번 사진에서 읽힌 선과 손의 특징을 중심으로 풀이합니다. 아직 확인하지 못한 부분은 아래에 따로 표시했습니다.",
    items,
    note: [...limits].map(([text, labels]) => labels.length === 2 ? text : `${labels[0]}: ${text}`).join("\n") + "\n두 손은 같은 시기의 사진으로, 다른 모양을 과거·현재의 변화로 단정하지 않습니다.",
  };
}
