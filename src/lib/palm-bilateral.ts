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
    const leftText = palmPersonalLineReading(key, left.onnxLines?.[key]), rightText = palmPersonalLineReading(key, right.onnxLines?.[key]);
    const bothReadable = left.imageQuality === "good" && right.imageQuality === "good" && leftText && rightText;
    let text: string;
    if (bothReadable && left.onnxLines?.[key].curve !== right.onnxLines?.[key].curve) {
      text = key === "headLine"
        ? `${reading} 두 사진의 두뇌선 모양이 달라, ${currentLabel}을 중심으로 익숙한 예에 연결해 이해하는 방식과 이유를 짧게 정리한 뒤 선택하는 방식의 차이를 함께 봅니다.`
        : key === "heartLine"
          ? `${reading} 두 사진의 감정선 모양이 달라, ${currentLabel}을 중심으로 말로 반응을 주고받는 방식과 작은 행동으로 마음을 남기는 방식의 차이를 함께 봅니다.`
          : `${reading} 두 사진의 생명선 모양이 달라, ${currentLabel}을 중심으로 새로운 활동에서 얻는 활기와 익숙한 순서로 돌아왔을 때의 편안함을 비교해 봅니다. 건강이나 수명의 판단은 아닙니다.`;
    } else if (bothReadable) {
      text = reading;
    } else {
      text = `${otherLabel} 사진을 기준으로 ${title.split(" · ")[0]}의 풀이를 읽습니다. ${currentLabel} 사진에서는 이 선을 확인하지 못했습니다. ${reading}`;
    }
    items.push({ title, observation: l === r ? `양손: ${l}` : `왼손: ${l} 오른손: ${r}`, text });
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
