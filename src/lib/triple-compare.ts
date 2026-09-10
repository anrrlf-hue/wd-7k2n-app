// 사주 × 손금 × 자기응답을 한 번에 비교하는 통합 섹션. 이전에는 이 비교를
// free-report-mock.ts의 개별 주제 문단(재물구조/의사결정/사람과 돈/기회)
// 안에 조용히 섞어 넣었다 — "손금은 사주와 독립된 두 번째 분석이어야
// 한다"는 이번 요구에 따라 그 방식을 버리고, 손금 자체 해석이 끝난 뒤
// 딱 한 번 나오는 별도 통합 비교 섹션으로 옮겼다.
//
// 일치/차이/보완 세 가지를 모두 허용한다(사주 결과를 손금/자기응답에
// 맞춰 억지로 고치지 않는다):
//  - 일치: 사주 신호와 실제 관측/응답이 같은 방향
//  - 차이: 사주 신호와 실제 관측/응답이 다른 방향 (틀렸다고 말하지 않고
//    사용자가 스스로 경험을 떠올려보게 하는 문장으로 맺는다)
//  - 보완: 손금과 자기응답이 둘 다 있는 축에서, 셋이 단순히 하나로 합치되지
//    않고 서로 다른 각도의 정보를 더할 때 — 단순 이분법(일치/차이)로 억지로
//    구겨넣지 않는다
//
// 손금 데이터도 자기응답도 없는 축은 아예 비교 항목에 넣지 않는다(관련
// 데이터가 없으면 억지로 비교를 만들지 않는다).

import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type CompareKind = "일치" | "차이" | "보완";

export interface CompareItem {
  topic: string;
  kind: CompareKind;
  text: string;
}

function money(facts: SajuFacts, palm: OnnxPalmLines | null, check: PersonalityCheckFacts | null): CompareItem | null {
  const palmSignal = palm?.heartLine.detected ?? null;
  const selfSignal = check ? check.levels.spendAwareness === "왼쪽" && check.levels.savingConsistency === "왼쪽" : null;
  if (palmSignal === null && selfSignal === null) return null;

  const sajuAware = facts.wealthStarCount >= 2;

  if (palmSignal !== null && selfSignal !== null) {
    const allAgree = sajuAware === selfSignal && (palmSignal ? sajuAware : true);
    if (allAgree) {
      return {
        topic: "돈을 대하는 방식",
        kind: "일치",
        text: "타고난 재물 구조, 손에 보이는 감정선, 본인이 답한 돈 관리 습관이 비슷한 결을 가리켜요. 세 방향에서 같은 신호가 겹치는 경우라 꽤 뚜렷한 패턴이에요.",
      };
    }
    return {
      topic: "돈을 대하는 방식",
      kind: "보완",
      text: "타고난 재물 구조와 손에 보이는 감정선, 본인이 답한 돈 관리 습관이 완전히 같은 그림은 아니에요. 감정선은 돈이 걸린 상황에서 감정·관계가 함께 작용한다는 걸 보여주고, 자기응답은 실제 지출·저축 습관을 보여줘요 — 서로 다른 각도에서 같은 사람을 설명하는 셈이에요.",
    };
  }

  if (palmSignal !== null) {
    return {
      topic: "돈을 대하는 방식",
      kind: palmSignal ? "일치" : "보완",
      text: palmSignal
        ? "손에 보이는 감정선이 타고난 재물 구조와 같은 방향이에요 — 돈 관련 결정에서도 사람과의 관계·감정이 함께 작용하는 편일 수 있어요."
        : "손에서는 감정선이 뚜렷하게 보이지 않았어요. 감정보다 원칙·기준으로 돈을 판단하는 쪽에 가까울 수 있어요.",
    };
  }

  return {
    topic: "돈을 대하는 방식",
    kind: sajuAware === selfSignal ? "일치" : "차이",
    text:
      sajuAware === selfSignal
        ? "타고난 재물 구조와 본인이 답한 돈 관리 습관이 같은 방향이에요 — 서로 다른 방식으로 같은 모습을 보여준 셈이에요."
        : "타고난 재물 구조와 본인이 답한 돈 관리 습관이 다른 방향이에요. 둘 중 하나가 틀렸다는 뜻은 아니에요 — 실제로 돈이 들어오고 나가는 걸 얼마나 자주 확인하는지 이번 기회에 점검해볼 만해요.",
  };
}

function decision(facts: SajuFacts, palm: OnnxPalmLines | null, check: PersonalityCheckFacts | null): CompareItem | null {
  const palmSignal = palm?.headLine.detected ? palm.headLine.curve : null;
  const selfSignal = check ? check.levels.speed === "왼쪽" : null;
  if (palmSignal === null && selfSignal === null) return null;

  const sajuFast = facts.dayStrength === "strong";
  const palmFast = palmSignal === "직선에 가까움"; // 직선형 두뇌선 = 계산·판단이 빠른 결로 본다

  if (palmSignal !== null && selfSignal !== null) {
    const allAgree = sajuFast === selfSignal;
    return {
      topic: "결정하는 방식",
      kind: allAgree ? "일치" : "보완",
      text: allAgree
        ? "타고난 결정 속도, 손에 보이는 두뇌선, 본인이 답한 결정 속도가 같은 방향이에요 — 세 군데서 같은 모습이 겹쳐 나온 셈이에요."
        : "타고난 결정 속도와 손에 보이는 두뇌선, 본인이 답한 결정 속도가 정확히 하나로 겹치진 않아요. 두뇌선은 평소 사고방식의 결을, 자기응답은 실제 체감 속도를 보여줘요 — 상황에 따라 둘 다 나오는 사람일 수 있어요.",
    };
  }

  if (palmSignal !== null) {
    return {
      topic: "결정하는 방식",
      kind: sajuFast === palmFast ? "일치" : "차이",
      text:
        sajuFast === palmFast
          ? "손에 보이는 두뇌선이 타고난 결정 속도와 같은 방향이에요."
          : "손에 보이는 두뇌선은 타고난 결정 속도와 다른 결을 보여줘요. 원국과 지금 습관이 다를 수 있다는 뜻이에요.",
    };
  }

  return {
    topic: "결정하는 방식",
    kind: sajuFast === selfSignal ? "일치" : "차이",
    text:
      sajuFast === selfSignal
        ? "타고난 결정 속도와 본인이 답한 결정 속도가 같은 방향이에요 — 서로 다른 방식으로 같은 결을 보여준 셈이에요."
        : "타고난 결정 속도와 본인이 답한 결정 속도가 달라요. 둘 중 하나가 틀렸다는 뜻은 아니에요 — 결정 속도가 상황(금액 크기·되돌리기 어려움)에 따라 달라지는지 돌아볼 만해요.",
  };
}

function relationship(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem | null {
  const palmSignal = palm?.heartLine.detected ?? null;
  const selfSignal = check ? check.levels.autonomy === "오른쪽" : null;
  if (selfSignal === null) return null; // 팜만 있고 자기응답이 없으면 이 축은 비교보다 money에서 이미 다룬다

  const sajuInfluenced = facts.officerStarCount + facts.resourceStarCount >= 3;

  if (palmSignal !== null) {
    const allAgree = sajuInfluenced === selfSignal;
    return {
      topic: "사람과의 관계",
      kind: allAgree ? "일치" : "보완",
      text: allAgree
        ? "타고난 대인관계 구조, 손에 보이는 감정선, 본인이 답한 성향이 같은 방향이에요."
        : "타고난 대인관계 구조와 본인이 답한 성향이 정확히 겹치진 않아요. 감정선은 관계에서 감정이 작용하는 결을, 자기응답은 실제 의사결정 습관을 보여줘요 — 둘 다 이 사람의 진짜 모습이에요.",
    };
  }

  return {
    topic: "사람과의 관계",
    kind: sajuInfluenced === selfSignal ? "일치" : "차이",
    text:
      sajuInfluenced === selfSignal
        ? "타고난 대인관계 구조와 본인이 답한 성향이 같은 방향이에요."
        : "타고난 대인관계 구조와 본인이 답한 성향이 달라요. 돈이 걸린 결정일 때 유독 누군가에게 먼저 물어보는지, 아니면 오히려 더 혼자 판단하게 되는지 돌아볼 만해요.",
  };
}

/** 사주 × 손금 × 자기응답 통합 비교. 관련 데이터가 있는 축만 포함하고,
 * 손금도 자기응답도 전혀 없으면 빈 배열을 반환한다(억지 비교 없음). */
export function buildTripleCompare(
  facts: SajuFacts,
  palm: OnnxPalmLines | null,
  check: PersonalityCheckFacts | null,
): CompareItem[] {
  return [money(facts, palm, check), decision(facts, palm, check), relationship(facts, palm, check)].filter(
    (x): x is CompareItem => x !== null,
  );
}
