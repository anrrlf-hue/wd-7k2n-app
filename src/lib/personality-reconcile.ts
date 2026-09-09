// SAJU_FACTS / PERSONALITY_CHECK_FACTS / MBTI_SELF_REPORT를 각각 독립된
// 입력으로 두고, 서로 "일치/불일치"를 있는 그대로 보여주는 비교 레이어.
// 사주 결과를 다른 입력에 맞춰 되돌려 고치지 않는다 — 다를 땐 다르다고 말한다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { MbtiSelfReport } from "@/lib/mbti-facts";
import { dayStrengthLabel } from "@/lib/saju-labels";

export interface PersonalityAddendum {
  /** 사주 신강신약 vs "기회를 먼저 잡는가/검증 후 움직이는가" 축 비교 */
  opportunityCompare: string;
  /** 사주 재성+식상(활동력) vs "위험을 감수하는가/안정을 우선하는가" 축 비교 */
  riskCompare: string;
  /** MBTI 자기보고가 있으면 참고용 한 줄, 없으면 안내 문장 */
  mbtiNote: string;
}

export function buildPersonalityAddendum(
  facts: SajuFacts,
  check: PersonalityCheckFacts,
  mbti: MbtiSelfReport,
): PersonalityAddendum {
  const sajuBold = facts.dayStrength === "strong";
  const checkBold = check.levels.opportunity === "왼쪽"; // 왼쪽 = "새 기회를 먼저 잡는 편"
  const opportunityCompare =
    sajuBold === checkBold
      ? `사주(${dayStrengthLabel(facts.dayStrength)})와 자기보고 성향 체크(기회 앞에서 ${checkBold ? "먼저 움직이는 편" : "검증 후 움직이는 편"})가 비슷한 방향을 가리켜요 — 서로 다른 방식으로 같은 신호를 보여준 셈이에요.`
      : `사주(${dayStrengthLabel(facts.dayStrength)})와 자기보고 성향 체크(기회 앞에서 ${checkBold ? "먼저 움직이는 편" : "검증 후 움직이는 편"})가 서로 다른 신호를 보여요. 둘 중 하나가 "틀렸다"는 뜻이 아니라, 원국 기반 성향과 지금 스스로 느끼는 모습이 다를 수 있다는 뜻이에요.`;

  const sajuActive = facts.outputStarCount + facts.wealthStarCount >= facts.peerStarCount;
  const checkRiskTaking = check.levels.risk === "왼쪽"; // 왼쪽 = "위험을 감수하는 편"
  const riskCompare =
    sajuActive === checkRiskTaking
      ? `사주에서 보이는 활동력·재물 신호와, 자기보고 성향 체크(위험 앞에서 ${checkRiskTaking ? "감수하는 편" : "안정을 우선하는 편"})가 비슷한 결로 나타나요.`
      : `사주에서 보이는 신호와 자기보고 성향 체크(위험 앞에서 ${checkRiskTaking ? "감수하는 편" : "안정을 우선하는 편"})가 다르게 나타나요. 타고난 원국 구조와 실제 성향은 별개일 수 있다는 걸 보여주는 부분이에요.`;

  const mbtiNote =
    "type" in mbti && mbti.type !== "모름"
      ? `MBTI(${mbti.type})는 참고로만 곁들였어요 — 이 결과의 정확도에는 영향을 주지 않아요.`
      : "MBTI는 선택 입력하지 않았어요.";

  return { opportunityCompare, riskCompare, mbtiNote };
}

/** 간단 성향 체크/mbti 중 하나라도 있으면 비교 문단(1개 문자열)을, 둘 다
 * 없으면 null을 반환한다. free-report-mock.ts(무료 사주 리포트)와
 * cross-interpretation-mock.ts(사주+손금 통합 결과) 양쪽에서 같은 로직을 공유한다. */
export function buildPersonalityComparisonText(
  facts: SajuFacts,
  check: PersonalityCheckFacts | null,
  mbti: MbtiSelfReport | null,
): string | null {
  if (!check && !mbti) return null;

  const parts: string[] = [];
  if (check) {
    const addendum = buildPersonalityAddendum(facts, check, mbti ?? { type: "모름" });
    parts.push(addendum.opportunityCompare, addendum.riskCompare);
  }
  if (mbti && "type" in mbti && mbti.type !== "모름") {
    parts.push(`MBTI(${mbti.type})는 참고로 함께 봤어요 — 이 결과의 정확도 자체에는 영향을 주지 않았어요.`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}
