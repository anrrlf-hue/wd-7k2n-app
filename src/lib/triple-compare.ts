import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityCheckFacts, PersonalityCheckLevel } from "@/lib/personality-check";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import { buildPalmReadingSections } from "@/lib/palm-observation-text";

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
  // Internal non-equivalence is preserved; it is not a customer failure verdict.
  const readings = buildPalmReadingSections(palm);
  const head = readings.find(r => r.key === "headLine");
  const heart = readings.find(r => r.key === "heartLine");
  const decisionParts = [facts.dayStrength === "neutral"
    ? "사주에서는 자기 기준과 주변 상황을 함께 보는 편으로 나타납니다. 선택에 따라 혼자 정할 때와 의견을 더 들을 때가 나뉠 수 있습니다."
    : facts.dayStrength === "strong"
      ? "사주에서는 스스로 납득할 기준을 세우고 방향을 잡는 성향이 강하게 나타납니다. 내 기준에 맞는지가 선택의 중요한 조건이 됩니다."
      : "사주에서는 상황과 주변의 지원을 충분히 살핀 뒤 판단하는 성향이 나타납니다. 믿을 만한 정보와 도움을 모으는 과정이 중요합니다."];
  if (head) decisionParts.push(`손금에서는 ${head.observation} ${head.summary}`);
  if (decision.self.state === "NEUTRAL") decisionParts.push("직접 답한 결정 속도는 ‘중간’입니다. 중요한 선택과 일상적인 선택에서 속도가 어떻게 달라지는지 함께 떠올려 보세요.");
  else if (decision.self.state === "DIRECTIONAL") decisionParts.push(check?.levels.speed === "왼쪽"
    ? "직접 응답에서는 빠르게 결정하는 편을 선택했어요. 선택 전에 꼭 필요한 기준 한두 가지를 짚는 습관이 자신에게 맞는지 살펴보세요."
    : "직접 응답에서는 신중하게 결정하는 편을 선택했어요. 충분히 검토했다고 볼 기준을 정해두면 선택의 마무리를 살펴보기 좋습니다.");
  const relationParts = [balanced
    ? "관계에서는 약속과 역할도 중요하게 보고, 내 방식대로 움직일 공간도 필요로 하는 편입니다."
    : facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount
      ? "관계에서는 역할과 서로 주고받는 도움을 중요하게 보는 편입니다. 함께하는 사람과 기대치를 맞춰야 마음이 편합니다."
      : "관계에서는 스스로 움직이고 생각을 표현하는 쪽이 더 강합니다. 내 방식을 살리면서도 상대와 기준을 맞추는 과정이 중요합니다."];
  if (heart) relationParts.push(`손금에서는 ${heart.observation} ${heart.summary}`);
  if (relation.self.state === "NEUTRAL") relationParts.push("직접 답한 의견 참고 정도는 ‘중간’입니다. 혼자 정할 일과 함께 의논할 일을 구분해 보면 나의 관계 방식이 더 구체적으로 보입니다.");
  else if (relation.self.state === "DIRECTIONAL") relationParts.push(check?.levels.autonomy === "왼쪽"
    ? "직접 응답에서는 혼자 결정하는 쪽을 선택했어요. 내 결론뿐 아니라 그 이유도 상대에게 전하고 있는지 돌아보세요."
    : "직접 응답에서는 관계와 주변 의견의 영향을 받는 쪽을 선택했어요. 들은 의견과 내가 원하는 것을 나란히 적어 보면 자신의 기준을 정리하기 좋습니다.");
  return [
    { topic: "결정하는 방식", signals: decision, kind: "비교 불가", text: decisionParts.join("\n\n") },
    { topic: "관계에서 감정이 작용하는 정도", signals: relation, kind: "비교 불가", text: relationParts.join("\n\n") },
  ];
}
