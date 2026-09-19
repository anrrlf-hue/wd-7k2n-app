import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityCheckFacts, PersonalityCheckLevel } from "@/lib/personality-check";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type CompareKind = "일치" | "차이" | "보완" | "중립" | "미확인" | "비교 불가";
export interface CompareSignal {
  state: "DIRECTIONAL" | "NEUTRAL" | "UNKNOWN" | "NOT_COMPARABLE";
  meaning: string;
}
export interface CompareItem {
  topic: string;
  kind: CompareKind;
  text: string;
  signals: { saju: CompareSignal; palm: CompareSignal; self: CompareSignal };
}

function selfSignal(level: PersonalityCheckLevel | undefined, left: string, right: string): CompareSignal {
  if (!level || level === "미확인") return { state: "UNKNOWN", meaning: "자기응답 미확인" };
  if (level === "중간") return { state: "NEUTRAL", meaning: "자기응답은 중간 — 어느 한쪽으로 정하지 않음" };
  return { state: "DIRECTIONAL", meaning: `직접 응답: ${level === "왼쪽" ? left : right}` };
}

/** Current signals measure different meanings. Keep them visible, but do not vote.
 * A shape observation is not a validated decision-speed/emotion-influence measurement. */
export function buildTripleCompare(facts: SajuFacts, palm: OnnxPalmLines | null, check: PersonalityCheckFacts | null): CompareItem[] {
  const balanced = facts.officerStarCount + facts.resourceStarCount === facts.peerStarCount + facts.outputStarCount;
  const decision: CompareItem["signals"] = {
    saju: { state: facts.dayStrength === "neutral" ? "NEUTRAL" : "NOT_COMPARABLE", meaning: facts.dayStrength === "neutral" ? "사주의 강약 해석은 중립" : "사주의 강약은 결정 속도를 측정한 값이 아님" },
    palm: { state: palm?.headLine.detected ? "NOT_COMPARABLE" : "UNKNOWN", meaning: palm?.headLine.detected ? "관찰된 두뇌선 모양은 전통적으로 사고방식에 연결하며, 빠르기·느리기와 비교하지 않음" : "두뇌선 관찰값 미확인" },
    self: selfSignal(check?.levels.speed, "빠르게 결정", "신중하게 결정"),
  };
  const relation: CompareItem["signals"] = {
    saju: { state: balanced ? "NEUTRAL" : "NOT_COMPARABLE", meaning: balanced ? "관련 사주 요소의 상대 비중이 같아 한쪽 성향으로 정하지 않음" : "사주의 역할·지원 해석은 실제 타인 영향 정도를 측정한 값이 아님" },
    palm: { state: palm?.heartLine.detected ? "NOT_COMPARABLE" : "UNKNOWN", meaning: palm?.heartLine.detected ? "감정선 모양의 표현 해석과 타인의 의견에 영향받는 정도는 다른 의미" : "감정선 관찰값 미확인" },
    self: selfSignal(check?.levels.autonomy, "혼자 결정", "관계·의견 영향받음"),
  };
  return [{ topic: "결정하는 방식", signals: decision }, { topic: "관계에서 감정이 작용하는 정도", signals: relation }].map(item => ({
    ...item, kind: "비교 불가", text: `${item.signals.saju.meaning}. ${item.signals.palm.meaning}. ${item.signals.self.meaning}. 같은 의미를 측정하지 않아 일치·불일치를 판정하지 않습니다.`,
  }));
}
