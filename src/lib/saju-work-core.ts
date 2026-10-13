import type { SajuFacts } from "@/lib/saju-facts";
import type { FreeSajuReport } from "@/lib/free-report-schema";

/** One interpretive frame, not an occupational or financial suitability test. */
export function deriveSajuWorkCore(facts: SajuFacts) {
  const roles = facts.officerStarCount > 0;
  const autonomy = facts.peerStarCount + facts.outputStarCount > 0;
  const expression = facts.outputStarCount > facts.peerStarCount;
  const evidence = `관성 ${facts.officerStarCount}, 비겁 ${facts.peerStarCount}, 식상 ${facts.outputStarCount} — 전통적 성향 해석, 직업 적합성 측정 아님`;
  const theme = roles && autonomy
    ? "역할과 책임의 기준, 방법을 고를 자율성을 함께 읽습니다. 가령 목적과 끝낼 결과는 정해져도 방법에 재량이 있는 자리라면, 책임을 지키는 일과 새로운 방법을 비교하는 일을 함께 할 수 있습니다."
    : roles
      ? "일에서는 정해진 역할을 이어가는 기준에 의미를 둡니다. 가령 해야 할 결과와 검토할 사람이 분명한 자리라면 진행이 어디에서 멈췄는지 말하기 쉬워, 다음 작업을 함께 조정할 수 있습니다."
      : autonomy
        ? "일에서는 직접 시도하며 방법을 고르는 관점을 읽습니다. 가령 아직 방법이 정해지지 않았고 결과에 반응을 받을 수 있는 자리라면, 작은 실험으로 다음에 바꿀 부분을 고를 여지가 있습니다."
        : "이 비교에서는 역할을 지키는 기준과 직접 시도하는 기준이 모두 드러나지 않아, 두 방식 중 어느 쪽이 더 맞는지 정하지 않습니다. 실제로 오래 이어간 일에서 목적과 검토 방식이 어떻게 주어졌는지 돌아볼 수 있습니다.";
  const sections: Pick<FreeSajuReport, "earningStyle" | "jobOrientation" | "teamStrength" | "soloStrength"> = {
    earningStyle: { text: `${expression ? "생각을 보여주는 통로에 무게가 있어, 결과를 사용할 사람에게 설명할 자리가 중요하게 읽힙니다." : "맡은 일을 이어가는 기준을 실제 결과에 적용하는 장면으로 읽습니다."} ${expression ? "가령 기획이나 제작 결과를 제안할 때 사용 장면을 함께 들을 수 있다면, 표현한 내용 가운데 어떤 부분에 대가를 기대하는지 구체화할 수 있습니다." : "가령 익힌 방법으로 문제를 해결한 일을 제안한다면, 완성한 내용과 상대에게 남는 쓰임을 함께 설명할 때 보상의 조건을 이야기할 출발점이 생깁니다."}`, evidence },
    jobOrientation: { text: `${theme} 직장형·사업형 이름만으로 고르기보다 실제로 어떤 목적과 검토 방식이 주어지는지 살펴볼 수 있습니다.`, evidence },
    teamStrength: { text: `팀에서는 ${roles ? "각자의 결과가 이어지는 지점을 분명히 하는 관점" : "진행 중인 생각을 함께 볼 수 있게 남기는 관점"}을 떠올릴 수 있습니다. ${roles ? "가령 동료의 자료를 받아 다음 작업을 해야 한다면, 자료를 받을 시점과 검토할 사람을 함께 정해두는 방식이 대기 중인 일을 드러내 줍니다." : "가령 방법이 아직 정해지지 않은 과제라면, 지금 시도한 것과 막힌 부분을 공유하는 방식이 동료의 의견을 실제 다음 작업으로 연결해 줍니다."}`, evidence },
    soloStrength: { text: `혼자 맡은 일에서는 ${autonomy ? "자신의 방법을 시험하는 과정" : "준비한 순서를 실제로 적용하는 과정"}에 의미를 둡니다. ${autonomy ? "가령 두 방법 중 하나를 고르는 상황이라면, 비교할 결과와 멈출 시점을 먼저 정해두면 계속 손보는 일과 다음 시도로 넘어가는 일을 구별할 수 있습니다." : "가령 자료를 모아 시작한 일이라면, 무엇을 끝냈을 때 다음 단계로 갈지 기록해두면 같은 준비를 되풀이하지 않고 진행을 확인할 수 있습니다."}`, evidence },
  };
  return { roles, autonomy, theme, sections };
}
