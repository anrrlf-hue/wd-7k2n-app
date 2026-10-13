import { buildPalmContextReading } from "@/lib/palm-context-reading";
import type { PalmFacts, OnnxLineDetail } from "@/lib/palm-facts";

export type DominantHand = "left" | "right";
export const PALM_READING_VERSION = "bilateral-context-v2";
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
  const parts = [line.length && `길이 ${line.length}`, line.curve, line.depthStrength && `사진에서의 선명도 ${line.depthStrength}`].filter(Boolean);
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
    ["headLine", "두뇌선 · 생각을 구체화하는 방식", "head-length-curve"],
    ["heartLine", "감정선 · 마음을 주고받는 방식", "heart-length-curve"],
    ["lifeLine", "생명선 · 확인된 범위", "lifeLine-reading"],
  ] as const) {
    const l = observed(left.onnxLines?.[key]), r = observed(right.onnxLines?.[key]);
    const parts = plan.passages.filter(p => [passageId, `${key}-standalone`, `${key}-unread`, `${key}-bilateral-difference`].includes(p.id)).map(p => p.text);
    if (!parts.length && !current.onnxLines?.[key].detected) parts.push(`${currentLabel}의 세부 모양을 충분히 읽지 못해 이 항목의 해석은 보류합니다.`);
    items.push({ title, observation: l === r ? `양손: ${l}.` : `왼손: ${l}. 오른손: ${r}.`, text: parts.join(" ") });
  }
  // Only corroborated fate candidates support an extra work reflection. Faint
  // or absent candidates are not filled with a generic success narrative.
  if (current.secondaryLines?.fate.status === "clear" && current.secondaryLines.fate.corroborated) {
    items.push({
      title: "운명선 후보 · 일에서 맡는 역할",
      observation: `${currentLabel}에서 운명선 후보를 두 분석 방식이 함께 찾았습니다.`,
      text: "전통적으로 일의 방향을 스스로 세우려는 모습에 연결합니다. 운영·기획·프로젝트 관리 같은 일을 떠올리되, 직업 이름보다 실제로 맡을 권한과 책임이 맞는지 확인하는 예시로 읽어주세요.",
    });
  }
  for (const [key, name] of [["sun", "태양선"], ["wealth", "재물선"]] as const) {
    if (current.secondaryLines?.[key].status !== "clear") continue;
    items.push({
      title: `${name} 후보 · 보조 관측`,
      observation: `${currentLabel}에서 ${name} 후보 영역의 영상 신호가 확인됐습니다. 주요 3선과는 다른 보조 분석값입니다.`,
      text: key === "sun"
        ? "전통적으로 결과를 드러내고 인정받는 이야기와 연결하는 후보입니다. 만든 것을 다른 사람에게 보이는 과정과, 그 가치를 스스로 느끼는 과정이 어떻게 다른지 떠올려볼 수 있습니다. 실제 명성이나 성공을 판정하는 근거는 아닙니다."
        : "전통적으로 주고받는 가치와 보상을 돌아보는 데 사용하는 후보입니다. 돈의 액수나 들어올 시기를 정하지 않고, 자신의 기여가 어떤 조건으로 돌아오는지를 생각하는 참고로 읽습니다.",
    });
  }
  return {
    version: PALM_READING_VERSION,
    summary: plan.passages.find(p => p.id === "head-heart-composition")?.text ?? `주로 쓰는 ${currentLabel}에서 읽힌 선을 중심으로 해석합니다. 확인하지 못한 선은 채우지 않았습니다.`,
    items,
    note: `${plan.limits[0]} ${plan.passages.find(p => p.id === "visibility")?.text ?? ""}`,
  };
}
