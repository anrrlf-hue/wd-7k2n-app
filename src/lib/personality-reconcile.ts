// SAJU_FACTS / BIG5_FACTS / MBTI_SELF_REPORT를 각각 독립된 입력으로 두고,
// 서로 "일치/불일치"를 있는 그대로 보여주는 비교 레이어. 사주 결과를 다른
// 입력에 맞춰 되돌려 고치지 않는다 — 다를 땐 다르다고 말한다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { Big5Facts } from "@/lib/big5-facts";
import type { MbtiSelfReport } from "@/lib/mbti-facts";
import { dayStrengthLabel } from "@/lib/saju-labels";

export interface PersonalityAddendum {
  /** 사주 신강신약 vs Big5 외향성 비교 */
  extraversionCompare: string;
  /** 사주 재성/식상(활동력) vs Big5 성실성 비교 */
  conscientiousnessCompare: string;
  /** MBTI 자기보고가 있으면 참고용 한 줄, 없으면 안내 문장 */
  mbtiNote: string;
}

export function buildPersonalityAddendum(
  facts: SajuFacts,
  big5: Big5Facts,
  mbti: MbtiSelfReport,
): PersonalityAddendum {
  const sajuOutgoing = facts.dayStrength === "strong";
  const big5Outgoing = big5.levels.extraversion === "높음";
  const extraversionCompare =
    sajuOutgoing === big5Outgoing
      ? `사주(${dayStrengthLabel(facts.dayStrength)})와 자기보고 성향 검사(외향성 ${big5.levels.extraversion})가 비슷한 방향을 가리켜요 — 두 데이터가 서로 다른 방식으로 같은 신호를 보여준 셈이에요.`
      : `사주(${dayStrengthLabel(facts.dayStrength)})와 자기보고 성향 검사(외향성 ${big5.levels.extraversion})가 서로 다른 신호를 보여요. 둘 중 하나가 "틀렸다"는 뜻이 아니라, 원국 기반 성향과 지금 스스로 느끼는 모습이 다를 수 있다는 뜻이에요.`;

  const sajuActive = facts.outputStarCount + facts.wealthStarCount >= facts.peerStarCount;
  const big5Conscientious = big5.levels.conscientiousness === "높음";
  const conscientiousnessCompare =
    sajuActive === big5Conscientious
      ? `사주에서 보이는 활동력·재물 신호와, 자기보고 성실성(${big5.levels.conscientiousness})이 비슷한 결로 나타나요.`
      : `사주에서 보이는 신호와 자기보고 성실성(${big5.levels.conscientiousness})이 다르게 나타나요. 타고난 원국 구조와 실제 생활 습관은 별개일 수 있다는 걸 보여주는 부분이에요.`;

  const mbtiNote =
    "type" in mbti && mbti.type !== "모름"
      ? `MBTI(${mbti.type})는 참고로만 곁들였어요 — 이 결과의 정확도에는 영향을 주지 않아요.`
      : "MBTI는 선택 입력하지 않았어요.";

  return { extraversionCompare, conscientiousnessCompare, mbtiNote };
}
