import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityCheckFacts, PersonalityCheckLevel } from "@/lib/personality-check";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import type { ReadingEvidence } from "@/lib/reading-plan";

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
  evidence?: ReadingEvidence[];
}

function selfSignal(level: PersonalityCheckLevel | undefined, left: string, right: string): CompareSignal {
  if (!level || level === "미확인") return { state: "UNKNOWN", meaning: "자기응답 미확인" };
  if (level === "중간") return { state: "NEUTRAL", meaning: "자기응답은 중간 — 어느 한쪽으로 정하지 않음" };
  return { state: "DIRECTIONAL", meaning: `직접 응답: ${level === "왼쪽" ? left : right}` };
}

/** Current signals measure different meanings. Keep them visible, but do not vote.
 * A shape observation is not a validated decision-speed/emotion-influence measurement. */
export function buildTripleCompare(facts: SajuFacts, palm: OnnxPalmLines | null, check: PersonalityCheckFacts | null): CompareItem[] {
  if (!palm?.modelExecuted) palm = null;
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
  if (head && palm?.headLine.curve && palm.headLine.attributeSupport?.curve !== "not_supported") {
    const curved = palm.headLine.curve === "완만한 곡선";
    const linked = facts.dayStrengthReliable && facts.dayStrength === "strong"
      ? curved
        ? "함께 읽으면, 내가 고른 일을 다른 사람의 도움으로 더 잘 해 볼 수 있는 장면이 떠오릅니다. 가령 직접 고른 취미에서 남이 알려 준 요령을 써 보니 더 재미있어졌다면, 도움을 받아 방법을 바꾼 일이 그 취미를 고른 내 마음까지 남의 것으로 만드는 것은 아닐 수 있습니다. 선택한 이유를 지키면서 다른 사람의 경험을 받아들이는 만족을 돌아볼 수 있습니다."
        : "함께 읽으면, 스스로 이해한 방법을 다른 사람에게도 설명하고 싶은 장면이 떠오릅니다. 가령 내가 편해진 방법을 권했는데 상대는 원래 방법을 택하면, 설명이 부족했던 것인지 편하게 느끼는 지점이 다른 것인지 나눠 볼 수 있습니다. 서로 다른 방법으로도 같은 일을 잘 끝낸 경험은 내 판단과 상대의 선택이 함께 있을 여지를 남깁니다."
      : !facts.dayStrengthReliable
        ? "출생시간이 없어 사주의 강약과 연결한 성향을 덧붙이지 않았습니다. 손금의 모양을 읽은 내용은 별도로 남기며, 부족한 사주 정보를 손금으로 대신 채우지는 않았습니다."
      : facts.dayStrength === "neutral"
        ? "사주의 강약에서는 한쪽 방향을 정하지 않았습니다. 손금의 모양에서 읽는 사고방식은 별개의 관점으로 남기고, 두 자료가 같은 성향을 확인했다고 합치지 않았습니다."
      : curved
        ? "함께 읽으면, 누군가의 도움으로 처음 해 본 경험을 자기 방식으로 이어 가는 장면이 떠오릅니다. 가령 친구가 소개한 취미를 내가 다른 방식으로 즐기게 되면, 고마운 마음 옆에 친구가 권한 대로 계속해야 할 것 같은 부담이 생길 수도 있습니다. 도움에 감사하는 일과 새로 찾은 즐거움을 내 방식으로 남기는 일은 함께 갈 수 있습니다."
        : "함께 읽으면, 믿을 만한 사람의 설명을 듣고도 직접 해 봐야 마음이 놓이는 장면이 떠오릅니다. 가령 추천받은 물건을 작은 범위로 써 본 뒤에야 편한 이유를 알았다면, 추천을 못 믿었던 것과 자기 경험이 필요했던 것은 다를 수 있습니다. 상대에게 고마움을 전하면서도 직접 느낀 불편을 말할 여지가 있습니다.";
    const source = palm.headLine.sourceVariant === "enhanced" ? "보정 영상" : palm.headLine.sourceVariant === "raw" ? "원본 사진" : "사진";
    decisionParts.push(`${source}에서 확인한 두뇌선 검출 구간은 ${palm.headLine.length ? `상대 길이 ${palm.headLine.length}, ` : ""}${palm.headLine.curve}으로 분류됐습니다. 손금 전체의 길이나 실제 시작·끝점은 확인하지 않았습니다. ${linked}`);
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
  if (heart && palm?.heartLine.curve && palm.heartLine.attributeSupport?.curve !== "not_supported" && facts.officerStarCount + facts.resourceStarCount + facts.peerStarCount + facts.outputStarCount > 0) {
    const supported = facts.officerStarCount + facts.resourceStarCount > facts.peerStarCount + facts.outputStarCount;
    const lens = [facts.officerStarCount > 0 ? "약속" : null, facts.resourceStarCount > 0 ? "이해와 도움" : null, facts.peerStarCount > 0 ? "자기 선택" : null, facts.outputStarCount > 0 ? "표현" : null].filter(Boolean).join("·");
    const lived = palm.heartLine.curve === "완만한 곡선"
      ? supported
        ? "사주의 도움·약속 상징과 감정선의 곡선 구간을 함께 읽으면, 도움받은 뒤 고마운 마음을 나누고 싶은 장면이 떠오릅니다. 가령 힘든 날 이야기를 들어 준 사람에게 바로 보답할 방법을 찾느라 마음이 급해진다면, 상대는 무엇을 돌려받기보다 이야기를 들어 줘서 다행이라는 말을 듣고 싶었을 수 있습니다. 고마움을 표현하는 일과 빚진 듯 느끼는 마음을 나눠 돌아볼 수 있습니다."
        : "사주의 자기 선택·표현 상징과 감정선의 곡선 구간을 함께 읽으면, 하고 싶은 일을 먼저 말하면서 상대도 같은 마음으로 기대해 주길 바라는 장면이 떠오릅니다. 가령 상대가 조용히 준비를 돕는다면 말로 들뜬 반응은 적어도 관심은 행동으로 남아 있을 수 있습니다. 표현의 크기만으로 애정의 크기를 정하지 않고 서로의 기쁨이 어떤 모습이었는지 돌아볼 수 있습니다."
      : supported
        ? "사주의 도움·약속 상징과 직선에 가까운 감정선 구간을 함께 읽으면, 받은 도움을 기억했다가 작은 행동으로 돌려주는 장면이 떠오릅니다. 가령 상대에게 필요한 것을 챙겨 줬는데 내가 어려운 날에는 도움을 말하지 못한다면, 배려와 혼자 버티는 마음이 함께 남을 수 있습니다. 지난 도움을 같은 모양으로 갚기보다 지금 필요한 것을 말해 보는 선택도 친밀함의 일부가 될 수 있습니다."
        : "사주의 자기 선택·표현 상징과 직선에 가까운 감정선 구간을 함께 읽으면, 각자의 생활을 지키면서도 작은 일을 기억해 주는 장면이 떠오릅니다. 가령 자주 연락하지 않아도 상대가 말했던 일을 챙겼다면, 가까움을 자주 만나는 횟수만으로 판단하기 어려울 수 있습니다. 서로 편한 거리가 다를 때 자신이 기억하고 있던 마음을 짧게 말해볼 여지가 있습니다.";
    relationParts.push(lived.replace(/사주의 (도움·약속|자기 선택·표현) 상징/, `사주의 ${lens} 상징`));
  }
  if (relation.self.state === "NEUTRAL") relationParts.push("직접 답한 의견 참고 정도는 ‘중간’입니다. 혼자 정할 일과 함께 의논할 일을 구분해 보면 나의 관계 방식이 더 구체적으로 보입니다.");
  else if (relation.self.state === "DIRECTIONAL") relationParts.push(check?.levels.autonomy === "왼쪽"
    ? "직접 응답에서는 혼자 결정하는 쪽을 선택했어요. 내 결론뿐 아니라 그 이유도 상대에게 전하고 있는지 돌아보세요."
    : "직접 응답에서는 관계와 주변 의견의 영향을 받는 쪽을 선택했어요. 들은 의견과 내가 원하는 것을 나란히 적어 보면 자신의 기준을 정리하기 좋습니다.");
  return [
    { topic: "결정하는 방식", signals: decision, kind: "비교 불가", text: decisionParts.join("\n\n") },
    { topic: "관계에서 마음을 전하는 방식", signals: relation, kind: "비교 불가", text: relationParts.join("\n\n") },
  ];
}
