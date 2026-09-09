// API 키가 없을 때 쓰는 결정론적 대체 교차 해석기.
// 사주 쪽은 항상 계산되는 money-tendency(얕은 결과)를, 손금 쪽은 PalmFacts를
// 그대로 조합해 문장을 만든다 — 두 값의 조합에 따라 결과가 달라지므로
// 서로 다른 입력에서 서로 다른 문장이 나온다.

import type { MoneyTendency } from "@/lib/money-tendency";
import type { PalmFacts } from "@/lib/palm-facts";
import type { SajuFacts } from "@/lib/saju-facts";
import type { Big5Facts } from "@/lib/big5-facts";
import type { MbtiSelfReport } from "@/lib/mbti-facts";
import type { CrossInterpretation } from "@/lib/cross-interpretation-schema";
import { buildPersonalityComparisonText } from "@/lib/personality-reconcile";

const HAND_SHAPE_LABEL: Record<PalmFacts["handShape"], string> = {
  square: "사각형에 가까운 손바닥과 짧은 편인 손가락",
  rectangular: "사각형에 가까운 손바닥과 긴 편인 손가락",
  elongated: "길쭉한 손바닥과 짧은 편인 손가락",
  slender: "길쭉한 손바닥과 긴 편인 손가락",
  unknown: "특징이 뚜렷하지 않은 손 모양",
};

export function buildMockCrossInterpretation(
  tendency: MoneyTendency,
  palm: PalmFacts,
  personality?: { facts: SajuFacts | null; big5: Big5Facts | null; mbti: MbtiSelfReport | null },
): CrossInterpretation {
  const handShapeLabel = HAND_SHAPE_LABEL[palm.handShape];
  const hasLifeLine = palm.majorLines.includes("생명선");
  const hasHeadLine = palm.majorLines.includes("두뇌선");
  const hasHeartLine = palm.majorLines.includes("감정선");
  const jobIsBusinessLeaning = tendency.jobType.leaning >= 4;

  const common =
    jobIsBusinessLeaning && hasLifeLine
      ? `사주에서는 ${tendency.jobType.label.replace("에 가까워요", "")} 성향이 나왔고, 손에서도 ${handShapeLabel}이 보여요. 생명선이 검출된 편이라 실행력·활동성 쪽 신호가 사주와 손 양쪽에서 겹쳐요.`
      : `사주에서 나온 '${tendency.wealthType}' 성향과, 손에서 보이는 ${handShapeLabel}이 서로 비슷한 방향을 가리켜요. 두 데이터 모두 안정보다는 자기 방식대로 판단하는 쪽에 가까운 신호예요.`;

  const differences = hasHeadLine
    ? `사주 쪽 재물 유형(${tendency.wealthType})과 달리, 손에서는 두뇌선이 뚜렷하게 잡혀서 분석적·계획적인 신호도 함께 보여요. 감정보다 계산이 앞서는 순간이 있을 수 있어요.`
    : `사주에서 보인 성향에 비해, 이번 손 사진에서는 두뇌선 신호가 약하게 나왔어요. 계획을 세우는 쪽보다 그때그때 판단하는 쪽에 조금 더 가까울 수 있어요.`;

  const moneyConnection = hasHeartLine
    ? `감정선이 검출된 편이라, 돈 관련 결정에서도 사람과의 관계·감정이 영향을 주는 경우가 많을 수 있어요. ${tendency.earningPower.label} 성향과 맞물리면, 사람을 통해 기회가 오는 흐름과 잘 어울려요.`
    : `감정선 신호가 약하게 나온 편이라, 돈 관련 결정에서는 감정보다 상황과 기준으로 판단하는 쪽에 가까울 수 있어요. ${tendency.keepingPower.label} 성향과 함께 보면, 원칙 기반으로 지키는 힘이 강조돼요.`;

  const selfComparisonQuestion = `실제로도 결정할 때 ${hasHeadLine ? "이유와 계산을 먼저 따지는" : "일단 느낌부터 움직이는"} 편이라는 말을 주변에서 듣는 편인가요?`;

  const uncertaintyNote = `이 손금 분석은 사진 속 손 랜드마크를 기반으로 한 단순 특징 추출(선의 존재·길이·방향 추정)이며, 정밀 의학적·전문 관상 수준의 인식이 아니에요. 참고용으로만 봐주세요.`;

  const personalityNote =
    personality?.facts && (personality.big5 || personality.mbti)
      ? buildPersonalityComparisonText(personality.facts, personality.big5, personality.mbti)
      : null;

  return {
    common,
    differences,
    moneyConnection,
    selfComparisonQuestion,
    uncertaintyNote,
    personalityNote,
  };
}
