import type { SajuFacts } from "@/lib/saju-facts";
import type { FreeSajuReport } from "@/lib/free-report-schema";

/** One interpretive frame, not an occupational or financial suitability test. */
export function deriveSajuWorkCore(facts: SajuFacts) {
  const roles = facts.officerStarCount > 0;
  const autonomy = facts.peerStarCount + facts.outputStarCount > 0;
  const expression = facts.outputStarCount > facts.peerStarCount;
  const evidence = `관성 ${facts.officerStarCount}, 비겁 ${facts.peerStarCount}, 식상 ${facts.outputStarCount} — 전통적 역할/실행 해석, 직업 적합성 측정 아님`;
  const theme = roles && autonomy
    ? "명확한 역할·약속을 두고, 실행 방법에는 자율성을 갖는 경향으로 읽습니다. 역할이 분명한 것과 스스로 방법을 정하는 것은 함께 가능합니다."
    : roles ? "역할과 책임의 경계를 분명히 하고, 맡은 일을 끝까지 정리하는 경향에 무게를 둡니다."
    : autonomy ? "스스로 시도하고 실행하면서 자신만의 방법을 찾아가는 경향에 무게를 둡니다."
    : "역할과 자율성에 비슷한 무게를 두고 살펴봅니다. 맡은 범위와 실행 재량을 함께 정리해 볼 수 있습니다.";
  const sections: Pick<FreeSajuReport, "earningStyle" | "jobOrientation" | "teamStrength" | "soloStrength"> = {
    earningStyle: { text: `이 해석에서는 ${expression ? "생각을 눈에 보이는 결과물로 풀어내는 활동" : "맡은 일을 직접 실행하고 완성하는 활동"}에 주목합니다. ${expression ? "설명, 기획, 제작처럼 머릿속 구상이 다른 사람에게 전달되는 장면" : "배운 것을 실제 문제에 써보고, 끝까지 마무리하는 장면"}을 떠올려 보세요. 내가 잘하는 일을 상대가 알아볼 수 있는 결과로 보여주는 것이 이 풀이의 핵심입니다.`, evidence },
    jobOrientation: { text: `이 해석에서는 ${theme} 직업 이름 하나보다 일하는 조건을 살펴보면 더 구체적입니다. 무엇을 완성해야 하는지, 어디까지 스스로 정할 수 있는지 두 가지를 나란히 놓고 생각해 보세요.`, evidence },
    teamStrength: { text: `이 해석에서는 ${roles ? "팀의 역할과 완료 기준을 분명하게 맞추는 면" : "팀의 목표를 내 실행 방법으로 구체화하는 면"}을 강점으로 읽습니다. ${roles ? "함께 시작할 때 누가 무엇을 맡고 어디까지 끝낼지 정리하는 장면" : "막연한 과제를 작은 작업으로 나누고 동료와 진행 상황을 공유하는 장면"}에 연결해 볼 수 있습니다. 합의한 목표 안에서 내 방법을 발휘할 여지가 있는지도 살펴보세요.`, evidence },
    soloStrength: { text: `이 해석에서는 ${autonomy ? "맡은 범위 안에서 직접 시도하며 방법을 다듬는 면" : "할 일과 준비 조건을 차분히 정리하는 면"}에 주목합니다. 혼자 맡은 작업이라면 ${autonomy ? "작게 실행해 본 뒤 결과를 보고 다음 단계를 조정하는 방식" : "완료 기준과 필요한 자료를 먼저 적어두는 방식"}을 떠올릴 수 있습니다. 직접 해볼 부분과 도움을 청할 부분을 나누면 이 성향을 일상에 대입하기 좋습니다.`, evidence },
  };
  return { roles, autonomy, theme, sections };
}
