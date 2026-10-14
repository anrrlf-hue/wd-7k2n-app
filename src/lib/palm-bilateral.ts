import { buildPalmContextReading } from "@/lib/palm-context-reading";
import { normalizePalmFactsObservation } from "@/lib/palm-facts";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";
import { buildPalmCustomerPassages, palmCustomerLimits, palmPersonalLineReading, palmLineObservation } from "@/lib/palm-customer-reading";

export type DominantHand = "left" | "right";
export const PALM_READING_VERSION = "bilateral-reading-v4";
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
    const parts = [reading, ...plan.passages.filter(p => [`${key}-bilateral-common`, `${key}-bilateral-difference`].includes(p.id)).map(p => p.text)];
    if (!primaryText) parts.push(`이 항목은 모양이 읽힌 ${otherLabel} 사진을 기준으로 봤으며 ${currentLabel}과의 비교는 아직 하지 않았습니다.`);
    items.push({ title, observation: l === r ? `양손: ${l}` : `왼손: ${l} 오른손: ${r}`, text: parts.join(" ") });
  }
  for (const passage of buildPalmCustomerPassages(current).filter(p => !["headLine", "heartLine", "lifeLine"].includes(p.key))) {
    items.push({ title: passage.title, observation: `${currentLabel}: ${passage.observation}`, text: passage.text });
  }
  return {
    version: PALM_READING_VERSION,
    summary: plan.passages.find(p => p.id === "head-heart-composition")?.text ?? "이번 사진에서 읽힌 선과 손의 특징을 중심으로 풀이합니다. 아직 확인하지 못한 부분은 아래에 따로 표시했습니다.",
    items,
    note: [...new Set([...palmCustomerLimits(left).map(text => `왼손: ${text}`), ...palmCustomerLimits(right).map(text => `오른손: ${text}`)])].join("\n"),
  };
}
