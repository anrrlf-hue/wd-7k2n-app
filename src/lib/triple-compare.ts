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
    saju: facts.dayStrengthReliable
      ? { state: facts.dayStrength === "neutral" ? "NEUTRAL" : "NOT_COMPARABLE", meaning: facts.dayStrength === "neutral" ? "사주의 강약 해석은 중립" : "사주의 강약은 결정 속도를 측정한 값이 아님" }
      : { state: "UNKNOWN", meaning: "출생시간 미상으로 사주의 강약을 확정하지 않음" },
    palm: { state: palm?.headLine.detected ? "NOT_COMPARABLE" : "UNKNOWN", meaning: palm?.headLine.detected ? "관찰된 두뇌선 모양은 전통적으로 사고방식에 연결하며, 빠르기·느리기와 비교하지 않음" : "두뇌선 관찰값 미확인" },
    self: selfSignal(check?.levels.speed, "빠르게 결정", "신중하게 결정"),
  };
  const relation: CompareItem["signals"] = {
    saju: { state: balanced ? "NEUTRAL" : "NOT_COMPARABLE", meaning: balanced ? "관련 사주 요소의 상대 비중이 같아 한쪽 성향으로 정하지 않음" : "사주의 역할·지원 해석은 실제 타인 영향 정도를 측정한 값이 아님" },
    palm: { state: palm?.heartLine.detected ? "NOT_COMPARABLE" : "UNKNOWN", meaning: palm?.heartLine.detected ? "감정선 모양의 표현 해석과 타인의 의견에 영향받는 정도는 다른 의미" : "감정선 관찰값 미확인" },
    self: selfSignal(check?.levels.autonomy, "혼자 결정", "관계·의견 영향받음"),
  };
  // Internal non-equivalence is preserved; it is not a customer failure verdict.
  const head = palm?.headLine.detected;
  const heart = palm?.heartLine.detected;
  const decisionParts = [!facts.dayStrengthReliable
    ? "출생시간이 없어 사주의 강약으로 결정 성향을 한쪽으로 단정하지 않습니다. 확인되는 다른 사주 요소와 손금의 모양을 각각 살펴봅니다."
    : facts.dayStrength === "neutral"
      ? "사주에서는 자기 기준과 주변 상황을 함께 보는 쪽으로 읽힙니다. 선택에 따라 혼자 정할 때와 의견을 더 들을 때가 나뉠 수 있습니다."
      : facts.dayStrength === "strong"
        ? "사주에서는 스스로 납득할 기준을 세우고 방향을 잡는 쪽으로 읽힙니다. 내 기준에 맞는지가 선택의 중요한 조건이 될 수 있습니다."
        : "사주에서는 상황과 주변의 지원을 충분히 살피는 쪽으로 읽힙니다. 믿을 만한 정보와 도움을 모으는 과정이 선택을 뒷받침하는 모습입니다."];
  if (head && palm?.headLine.curve) {
    const curved = palm.headLine.curve === "완만한 곡선";
    const linked = facts.dayStrengthReliable && facts.dayStrength === "strong"
      ? curved
        ? "두 관점을 함께 놓으면 중요한 기준은 지키면서 방법은 유연하게 찾는 모습으로 읽어볼 수 있습니다. 사주는 무엇을 납득해야 움직이는지를, 손금의 곡선 해석은 그 답을 어떤 방식으로 찾아가는지를 다르게 비춥니다. 기준이 분명한 것과 방법을 하나로 고집하는 것은 같은 뜻이 아닙니다."
        : "두 관점 모두 기준을 분명히 세우는 생활 장면으로 이어집니다. 다만 서로 같은 성격을 검증했다는 뜻은 아닙니다. 일관성을 지키는 힘이 상대의 다른 방법을 받아들일 여지와 어떻게 함께 놓이는지 읽어볼 수 있습니다."
      : !facts.dayStrengthReliable
        ? "출생시간이 없어 사주의 강약과 연결한 성향을 덧붙이지 않았습니다. 손금의 모양을 읽은 내용은 별도로 남기며, 부족한 사주 정보를 손금으로 대신 채우지는 않았습니다."
      : facts.dayStrength === "neutral"
        ? "사주의 강약에서는 한쪽 방향을 정하지 않았습니다. 손금의 모양에서 읽는 사고방식은 별개의 관점으로 남기고, 두 자료가 같은 성향을 확인했다고 합치지 않았습니다."
      : curved
        ? "사주의 지원을 살피는 관점과 손금의 유연한 사고 해석을 함께 놓으면, 다른 사람의 반응을 들으며 생각을 구체화하는 장면을 떠올릴 수 있습니다. 도움을 받아 방향을 찾는 것과 상대 반응에 맞춰 내 기준까지 바꾸는 것은 구분해서 읽습니다."
        : "사주에서는 선택을 뒷받침할 조건을, 손금에서는 생각을 정리하는 기준을 읽습니다. 도움을 듣더라도 자기 말로 결론을 설명할 수 있을 때 두 관점을 생활의 같은 장면에 연결해볼 수 있습니다.";
    decisionParts.push(`손금에서 확인한 두뇌선은 ${palm.headLine.length ? `길이 ${palm.headLine.length}, ` : ""}${palm.headLine.curve}입니다. ${linked}`);
  }
  if (decision.self.state === "NEUTRAL") decisionParts.push("직접 답한 결정 속도는 ‘중간’입니다. 중요한 선택과 일상적인 선택에서 속도가 어떻게 달라지는지 함께 떠올려 보세요.");
  else if (decision.self.state === "DIRECTIONAL") decisionParts.push(check?.levels.speed === "왼쪽"
    ? "직접 응답에서는 빠르게 결정하는 편을 선택했어요. 선택 전에 꼭 필요한 기준 한두 가지를 짚는 습관이 자신에게 맞는지 살펴보세요."
    : "직접 응답에서는 신중하게 결정하는 편을 선택했어요. 충분히 검토했다고 볼 기준을 정해두면 선택의 마무리를 살펴보기 좋습니다.");
  const relationParts = [balanced
    ? facts.officerStarCount + facts.resourceStarCount === 0
      ? "관계의 역할·지원과 주도성·표현을 비교할 요소가 드러난 글자에 없어, 이 기준으로 어느 쪽 성향인지 덧붙이지 않았습니다."
      : "관계에서는 약속과 역할을 이해하는 쪽과 자기 방식대로 움직이는 쪽의 비중이 나란히 놓입니다. 어느 한쪽이 관계를 결정한다고 정하지 않고 함께 읽습니다."
    : facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount
      ? facts.officerStarCount === 0
        ? "관계에서는 서로 이해하고 도움을 주고받는 쪽에 무게를 둡니다. 기대어도 된다는 느낌이 친밀함의 바탕이 되는 모습으로 읽힙니다."
        : facts.resourceStarCount === 0
          ? "관계에서는 약속과 맡은 역할을 지키는 쪽에 무게를 둡니다. 서로 기대하는 것을 이해하는 과정에서 신뢰를 느끼는 모습으로 읽힙니다."
          : "관계에서는 역할과 서로 주고받는 도움을 중요하게 읽습니다. 함께하는 사람과 기대치를 맞추는 과정이 마음을 놓는 조건이 될 수 있습니다."
      : facts.outputStarCount === 0
        ? "관계에서는 자신의 기준과 동등한 선택을 중요하게 읽습니다. 내 방식을 지키는 일과 상대의 선택도 남겨두는 일을 함께 살펴볼 수 있습니다."
        : facts.peerStarCount === 0
          ? "관계에서는 생각을 표현하고 반응을 나누는 쪽에 무게를 둡니다. 말로 전한 마음과 상대가 받아들인 마음 사이를 살피는 모습으로 읽힙니다."
          : "관계에서는 스스로 움직이고 생각을 표현하는 쪽에 무게를 둡니다. 내 방식을 살리면서도 상대와 기준을 맞추는 과정을 함께 읽습니다."];
  if (heart && palm?.heartLine.curve) relationParts.push(palm.heartLine.curve === "완만한 곡선"
    ? "손금의 감정선은 완만한 곡선으로 읽혔습니다. 전통적으로 표정과 말에 마음이 실리는 모습에 연결하면, 사주에서 중요하게 읽은 관계의 기준이 대화 속 반응을 통해 드러나는 장면을 떠올릴 수 있습니다. 상대의 반응을 잘 듣는 유연함과 그 반응을 따라 자신의 뜻이 흐려질 수 있는 긴장을 함께 봅니다."
    : "손금의 감정선은 직선에 가깝게 읽혔습니다. 전통적으로 꾸준한 행동에 마음을 담는 모습에 연결하면, 사주에서 중요하게 읽은 관계의 기준을 실제 약속으로 보여주는 장면을 떠올릴 수 있습니다. 내가 행동으로 충분히 전했다고 느끼는 마음을 상대는 말로도 듣고 싶을 수 있다는 차이를 함께 봅니다.");
  if (relation.self.state === "NEUTRAL") relationParts.push("직접 답한 의견 참고 정도는 ‘중간’입니다. 혼자 정할 일과 함께 의논할 일을 구분해 보면 나의 관계 방식이 더 구체적으로 보입니다.");
  else if (relation.self.state === "DIRECTIONAL") relationParts.push(check?.levels.autonomy === "왼쪽"
    ? "직접 응답에서는 혼자 결정하는 쪽을 선택했어요. 내 결론뿐 아니라 그 이유도 상대에게 전하고 있는지 돌아보세요."
    : "직접 응답에서는 관계와 주변 의견의 영향을 받는 쪽을 선택했어요. 들은 의견과 내가 원하는 것을 나란히 적어 보면 자신의 기준을 정리하기 좋습니다.");
  return [
    { topic: "결정하는 방식", signals: decision, kind: "비교 불가", text: decisionParts.join("\n\n") },
    { topic: "관계에서 마음을 전하는 방식", signals: relation, kind: "비교 불가", text: relationParts.join("\n\n") },
  ];
}
