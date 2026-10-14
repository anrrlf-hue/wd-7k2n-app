import type { SajuFacts } from "@/lib/saju-facts";
import { buildCustomerFreeNarrative } from "@/lib/saju-customer-narrative";
import type { FreeSajuReport } from "@/lib/free-report-schema";

/** One interpretive frame, not an occupational or financial suitability test. */
export function deriveSajuWorkCore(facts: SajuFacts) {
  const roles = facts.officerStarCount > 0;
  const autonomy = facts.peerStarCount + facts.outputStarCount > 0;
  const theme = roles && autonomy
    ? "역할과 책임의 기준, 방법을 고를 자율성을 함께 읽습니다. 가령 목적과 끝낼 결과는 정해져도 방법에 재량이 있는 자리라면, 책임을 지키는 일과 새로운 방법을 비교하는 일을 함께 할 수 있습니다."
    : roles
      ? "일에서는 정해진 역할을 이어가는 기준에 의미를 둡니다. 가령 해야 할 결과와 검토할 사람이 분명한 자리라면 진행이 어디에서 멈췄는지 말하기 쉬워, 다음 작업을 함께 조정할 수 있습니다."
      : autonomy
        ? "일에서는 직접 시도하며 방법을 고르는 관점을 읽습니다. 가령 아직 방법이 정해지지 않았고 결과에 반응을 받을 수 있는 자리라면, 작은 실험으로 다음에 바꿀 부분을 고를 여지가 있습니다."
        : "이 비교에서는 역할을 지키는 기준과 직접 시도하는 기준이 모두 드러나지 않아, 두 방식 중 어느 쪽이 더 맞는지 정하지 않습니다. 실제로 오래 이어간 일에서 목적과 검토 방식이 어떻게 주어졌는지 돌아볼 수 있습니다.";
  const narrative = buildCustomerFreeNarrative(facts);
  const sections: Pick<FreeSajuReport, "earningStyle" | "jobOrientation" | "teamStrength" | "soloStrength"> = {
    earningStyle: narrative.earningStyle, jobOrientation: narrative.jobOrientation,
    teamStrength: narrative.teamStrength, soloStrength: narrative.soloStrength,
  };
  return { roles, autonomy, theme, sections };
}
