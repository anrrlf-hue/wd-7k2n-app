// SAJU_FACTS / PERSONALITY_CHECK_FACTS / MBTI_SELF_REPORT를 각각 독립된
// 입력으로 두고, 서로 "일치/불일치"를 있는 그대로 보여주는 비교 레이어.
// 사주 결과를 다른 입력에 맞춰 되돌려 고치지 않는다 — 다를 땐 다르다고 말한다.
//
// 이전에는 이 비교 문장들을 "자기보고 성향과 비교하면" 같은 별도 섹션으로
// 따로 모아 보여줬다 — 사주/손금/자기보고를 각각 다른 섹션에 쌓아두는
// 것과 같은 문제였다("세 데이터를 이어붙이지 않고 한 사람의 리포트로
// 만든다"는 요구에 어긋남). 이번에는 이 비교 문장들을 free-report-mock.ts의
// 관련 주제별 섹션(재물 구조/의사결정/사람과 돈/기회) 안에 직접 녹여
// 쓴다 — 여기 있는 함수들은 각 주제가 필요할 때 직접 불러 쓰는 조각이다.

import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { MbtiSelfReport } from "@/lib/mbti-facts";
import { dayStrengthLabel } from "@/lib/saju-labels";
import type { SajuFacts } from "@/lib/saju-facts";

type DayStrength = SajuFacts["dayStrength"];

/** 한 리포트 안에서 자기보고 축을 최대 4번(재물/의사결정/사람과 돈/기회)
 * 비교하다 보니, 마무리 문구를 하나로 고정하면 실제 생성 리포트(예:
 * 1978년생 샘플)에서 "서로 다른 방식으로 같은 결을 보여준 셈이에요."나
 * "둘 중 하나가 틀렸다는 뜻은 아니에요 —"가 한 리포트에 2~3번 그대로
 * 반복됐다 — free-report-mock.ts의 evidenceTail 풀과 같은 방식으로
 * seed에 따라 문구를 바꿔 반복을 없앤다. */
const MATCH_TAIL_POOL = [
  "서로 다른 방식으로 같은 결을 보여준 셈이에요.",
  "같은 성향이 사주와 자기 대답 양쪽에서 겹쳐 나온 거예요.",
  "따로 나온 두 정보가 우연히 같은 곳을 가리켰어요.",
  "사주만 그런 게 아니라 본인 대답까지 같은 방향이라 더 뚜렷해요.",
];
const MISMATCH_LEAD_POOL = [
  "둘 중 하나가 틀렸다는 뜻은 아니에요 — ",
  "어느 한쪽이 맞고 다른 쪽이 틀린 게 아니에요 — ",
  "이건 모순이라기보다 다른 각도에 가까워요 — ",
  "타고난 결과 지금 스스로 느끼는 모습은 다를 수 있어요 — ",
];

/** "일치"만큼 "차이"도 개인화 체감을 높이는 신호로 다룬다 — 둘 중 하나가
 * 틀렸다고 말하지 않고, 사용자가 스스로 경험을 떠올려보게 하는 문장으로
 * 맺는다(바넘효과 문장보다 구체적인 자기비교를 유도하는 게 목적). */
export function compareLine(params: {
  match: boolean;
  sajuLabel: string;
  selfLabel: string;
  reflect: string;
  seed: number;
}): string {
  const { match, sajuLabel, selfLabel, reflect, seed } = params;
  return match
    ? `사주에서는 ${sajuLabel} 신호가 나오는데, 본인도 ${selfLabel}이라고 답했어요. ${MATCH_TAIL_POOL[seed % MATCH_TAIL_POOL.length]}`
    : `사주에서는 ${sajuLabel} 신호가 나오는데, 본인은 ${selfLabel}이라고 답했어요. ${MISMATCH_LEAD_POOL[seed % MISMATCH_LEAD_POOL.length]}${reflect}`;
}

/** 사주 신강신약 vs "새로운 기회·위험을 감수하는가/안정을 우선하는가" 축.
 * opportunityStyle(기회를 잡는 방식) 섹션에서 쓴다. */
export function compareRiskOpportunity(dayStrength: DayStrength, check: PersonalityCheckFacts, seed: number): string {
  const sajuBold = dayStrength === "strong";
  const checkRiskTaking = check.levels.risk === "왼쪽"; // 왼쪽 = "새로운 기회·위험을 감수하는 편"
  return compareLine({
    match: sajuBold === checkRiskTaking,
    sajuLabel: `${dayStrengthLabel(dayStrength)}이라 ${sajuBold ? "밀어붙이는 힘이 강한" : "신중하게 움직이는"}`,
    selfLabel: checkRiskTaking ? "새로운 기회·위험을 감수하는 편" : "안정을 우선하는 편",
    reflect: sajuBold
      ? "평소에는 신중해도, 정작 확신이 서면 빠르게 움직이는 순간이 있는지 돌아볼 만해요."
      : "평소엔 과감해 보여도, 정말 큰돈이 걸린 결정 앞에서는 달라지는지 돌아볼 만해요.",
    seed,
  });
}

/** 사주 재성 개수(재물을 의식하는 구조인지) vs "소비·저축을 잘 파악·관리하는가" 축.
 * wealthStructure/earningStyle(재물 구조/돈을 버는 방식) 섹션에서 쓴다. */
export function compareMoneyHabit(wealthStarCount: number, check: PersonalityCheckFacts, seed: number): string {
  const sajuWealthAware = wealthStarCount >= 2;
  const checkMoneyAware = check.levels.spendAwareness === "왼쪽" && check.levels.savingConsistency === "왼쪽";
  return compareLine({
    match: sajuWealthAware === checkMoneyAware,
    sajuLabel: `재성이 ${wealthStarCount}개로 ${sajuWealthAware ? "재물 흐름에 신경 쓰는 구조" : "재물보다 다른 축이 더 크게 작동하는 구조"}`,
    selfLabel: checkMoneyAware ? "소비·저축을 꾸준히 파악·관리하는 편" : "지출 파악이나 저축 관리가 느슨한 편",
    reflect: "실제로 돈이 들어오고 나가는 걸 얼마나 자주 확인하는지 이번 기회에 한번 점검해볼 만해요.",
    seed,
  });
}

/** 사주 신강신약(빠른 판단력 여부) vs "빠르게 결정/충분히 생각 후 결정",
 * "계획적/즉흥적" 축. decisionStyle(의사결정 스타일) 섹션에서 쓴다. */
export function compareDecisionSpeed(dayStrength: DayStrength, check: PersonalityCheckFacts, seed: number): string {
  const sajuFast = dayStrength === "strong"; // 강한 일간 = 직관적으로 빠르게 밀어붙이는 편으로 본다
  const checkFast = check.levels.speed === "왼쪽"; // 왼쪽 = "빠르게 결정하는 편"
  return compareLine({
    match: sajuFast === checkFast,
    sajuLabel: `일간이 ${dayStrengthLabel(dayStrength)}이라 ${sajuFast ? "직관적으로 빠르게 결정하는" : "정보를 모으고 신중하게 결정하는"}`,
    selfLabel: checkFast ? "빠르게 결정하는 편" : "충분히 생각한 후 결정하는 편",
    reflect: "결정 속도가 상황(금액 크기·되돌리기 어려움)에 따라 달라지는지 돌아볼 만해요.",
    seed,
  });
}

/** 사주 관성/인성 비교(사회적 관계 의존도) vs "혼자 결정하는가/사람 의견에
 * 영향받는가" 축. peopleAndMoney(사람과 돈) 섹션에서 쓴다. */
export function compareAutonomy(
  socialCompare: "officer" | "resource" | "tie",
  check: PersonalityCheckFacts,
  seed: number,
): string {
  const sajuInfluenced = socialCompare !== "tie"; // 관성/인성 중 하나가 뚜렷하면 사회적 신호에 영향받는 구조로 본다
  const checkInfluenced = check.levels.autonomy === "오른쪽"; // 오른쪽 = "사람 의견·관계에 영향받는 편"
  return compareLine({
    match: sajuInfluenced === checkInfluenced,
    sajuLabel: sajuInfluenced
      ? `${socialCompare === "officer" ? "관성" : "인성"} 신호가 뚜렷해서 주변 구조·사람에 영향받는`
      : "관성·인성이 균형 잡혀서 스스로 판단하는 축이 강한",
    selfLabel: checkInfluenced ? "사람 의견·관계에 영향받는 편" : "혼자 결정하는 편",
    reflect: "돈이 걸린 결정일 때 유독 누군가에게 먼저 물어보는지, 아니면 오히려 더 혼자 판단하게 되는지 돌아볼 만해요.",
    seed,
  });
}

/** MBTI 자기보고가 있으면 참고용 한 줄, 없으면 null. evidenceExplainer
 * 마지막에 짧게 곁들이는 용도(별도 섹션으로 만들지 않는다). */
export function mbtiMentionLine(mbti: MbtiSelfReport | null): string | null {
  if (!mbti || !("type" in mbti) || mbti.type === "모름") return null;
  return `MBTI(${mbti.type})는 참고로 함께 봤어요 — 이 결과의 정확도 자체에는 영향을 주지 않았어요.`;
}
