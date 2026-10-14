import type { ReadingEvidence } from "@/lib/reading-plan";

const COUNTS: Record<string, string> = { peerStarCount: "비겁", outputStarCount: "식상", wealthStarCount: "재성", officerStarCount: "관성", resourceStarCount: "인성" };
const MONTHS: Record<string, string> = { "month-stem": "이 달 천간", "month-branch": "이 달 지지", "year-symbols": "해의 배경", "natal-anchor": "태어난 사주에서 함께 본 자리", "previous-month-symbols": "앞선 달의 배경", "previous-year-symbols": "앞선 해의 배경" };

/** Keep diagnostic IDs in evidence records, never in the customer explanation. */
export function describeReadingEvidence(evidence: ReadingEvidence[]): string {
  const descriptions: string[] = [];
  for (const entry of evidence) {
    const value = entry.value;
    if (MONTHS[entry.id] && typeof value === "string" && !/[A-Za-z{}]/.test(value)) descriptions.push(`${MONTHS[entry.id]}: ${value.replaceAll(":", " · ")}`);
    const field = entry.id.replace("saju.", "");
    if (COUNTS[field] && typeof value === "number") descriptions.push(`사주에서 ${COUNTS[field]} ${value}개`);
    if (entry.id === "saju.close" && typeof value === "string") descriptions.push(`일지의 관계 상징: ${value}`);
    if (entry.id === "saju.workplace" && typeof value === "string") descriptions.push(`월주의 일과 환경 상징: ${value}`);
    if (entry.id === "dominant") descriptions.push(`주로 쓰는 손: ${value === "left" ? "왼손" : value === "right" ? "오른손" : "선택하지 않음"}`);
    const line = /^(left|right)\.(headLine|heartLine|lifeLine)\.curve$/.exec(entry.id);
    if (line && typeof value === "string" && ["완만한 곡선", "직선에 가까움"].includes(value)) descriptions.push(`${line[1] === "left" ? "왼손" : "오른손"} ${line[2] === "headLine" ? "두뇌선" : line[2] === "heartLine" ? "감정선" : "생명선"}: 사진에서 ${value} 구간 확인`);
    if (/^(left|right)\.secondary\.fate$/.test(entry.id)) descriptions.push(`${entry.id.startsWith("left") ? "왼손" : "오른손"} 운명선: 두 방식에서 같은 후보 확인`);
  }
  return [...new Set(descriptions)].join(" / ") || "태어난 사주와 확인된 입력 범위를 바탕으로 읽은 전통적 참고 풀이입니다.";
}

/** Older saved reports remain intact; only their diagnostic display is replaced. */
export function customerReadingBasis(basis: string, evidence?: ReadingEvidence[]): string {
  return /[A-Za-z{}]|=true|=false/.test(basis) ? describeReadingEvidence(evidence ?? []) : basis;
}
