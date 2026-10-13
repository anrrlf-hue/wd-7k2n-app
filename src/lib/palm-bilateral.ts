import { buildPalmContextReading } from "@/lib/palm-context-reading";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";

export type DominantHand = "left" | "right";
export const PALM_READING_VERSION = "bilateral-reading-v3";
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
  if (!line?.detected) return "판독하지 못함";
  const source = line.sourceVariant === "enhanced" ? "보정 영상" : line.sourceVariant === "raw" ? "원본 사진" : "사진";
  const parts = [source, line.length && `검출 구간 ${line.length}`, line.curve && `구간 방향 ${line.curve}`, line.depthStrength && `검출 신호 ${line.depthStrength}`].filter(Boolean);
  return parts.length ? parts.join(" · ") : "선 후보 확인, 세부 모양 미확인";
}

/** Compare each observed feature once. Absence is never a low personality score.
 * The dominant-hand convention is a traditional lens, not evidence of change
 * over time: both photos were taken now, under potentially different lighting. */
export function buildPalmBilateralReading(left: PalmFacts, right: PalmFacts, dominantHand: DominantHand): PalmBilateralReading {
  const current = dominantHand === "right" ? right : left;
  const currentLabel = dominantHand === "right" ? "오른손" : "왼손";
  const plan = buildPalmContextReading(left, right, dominantHand);
  const items: PalmBilateralItem[] = [];
  for (const [key, title, passageId] of [
    ["headLine", "두뇌선 · 생각을 구체화하는 방식", "headLine-reading"],
    ["heartLine", "감정선 · 마음을 주고받는 방식", "heartLine-reading"],
    ["lifeLine", "생명선 · 생활 기반을 살펴보는 방식", "lifeLine-reading"],
  ] as const) {
    const l = observed(left.onnxLines?.[key]), r = observed(right.onnxLines?.[key]);
    const parts = plan.passages.filter(p => [passageId, `${key}-unread`, `${key}-bilateral-common`, `${key}-bilateral-difference`].includes(p.id)).map(p => p.text);
    if (!parts.length && !current.onnxLines?.[key].detected) parts.push(`${currentLabel}의 세부 모양을 충분히 읽지 못해 이 항목의 해석은 보류합니다.`);
    items.push({ title, observation: l === r ? `양손: ${l}.` : `왼손: ${l}. 오른손: ${r}.`, text: parts.join(" ") });
  }
  // Only corroborated fate candidates support an extra work reflection. Faint
  // or absent candidates are not filled with a generic success narrative.
  if (current.secondaryLines?.fate.status === "clear" && current.secondaryLines.fate.corroborated) {
    items.push({
      title: "운명선 후보 · 일에서 맡는 역할",
      observation: `${currentLabel}에서 운명선 후보를 두 분석 방식이 함께 찾았습니다.`,
      text: "맡은 일의 방향을 스스로 정하고 이어가는 모습으로 읽어볼 수 있습니다. 가령 공동 작업을 시작한다면, 무엇을 책임질지와 어디까지 스스로 결정할지를 함께 정할 때 자신의 몫이 선명해집니다.",
    });
  }
  for (const [key, name] of [["sun", "태양선"], ["wealth", "재물선"]] as const) {
    if (current.secondaryLines?.[key].status !== "clear") continue;
    items.push({
      title: `${name} 후보 · 보조 관측`,
      observation: `${currentLabel}에서 ${name} 후보 영역의 영상 신호가 확인됐습니다. 주요 3선과는 다른 보조 분석값입니다.`,
      text: key === "sun"
        ? "만든 것을 다른 사람에게 보여주고 반응을 받는 모습으로 읽어볼 수 있습니다. 스스로 만족한 부분과 상대가 알아본 장점이 같았는지 떠올려보면, 다음에 무엇을 더 잘 보여줄지 구체적으로 생각할 수 있습니다."
        : "자신의 기여와 돌아오는 조건을 함께 살피는 관점입니다. 일을 맡거나 무언가를 주고받는다면, 어디까지 해줄지와 무엇을 기대하는지를 처음부터 나누어보세요.",
    });
  }
  return {
    version: PALM_READING_VERSION,
    summary: plan.passages.find(p => p.id === "head-heart-composition")?.text ?? `주로 쓰는 ${currentLabel}에서 읽힌 선을 중심으로 해석합니다. 확인하지 못한 선은 채우지 않았습니다.`,
    items,
    note: `${plan.limits[0]} ${plan.passages.find(p => p.id === "visibility")?.text ?? ""}`.trim(),
  };
}
