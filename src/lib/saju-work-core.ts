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
    earningStyle: { text: `${expression ? "생각을 눈에 보이는 결과물로 만들고 다른 사람에게 전달할 때 돈 버는 강점이 살아납니다." : "맡은 일을 직접 실행하고 끝까지 완성할 때 돈 버는 강점이 살아납니다."} ${expression ? "설명·기획·제작처럼 머릿속 구상을 결과물로 보여주는 일" : "배운 것을 실제 문제에 적용하고 마무리하는 일"}과 잘 맞는 편입니다.`, evidence },
    jobOrientation: { text: `${theme} 그래서 직장형·사업형 하나로 단정하기보다, 역할은 분명하면서 실행 방법에는 재량이 있는 환경에서 강점이 잘 드러납니다.`, evidence },
    teamStrength: { text: `팀에서는 ${roles ? "역할과 완료 기준을 분명하게 맞추는 능력" : "막연한 목표를 실제 실행 방법으로 바꾸는 능력"}이 강점입니다. ${roles ? "누가 무엇을 맡고 어디까지 끝낼지 정리하면 안정적으로 힘을 냅니다." : "과제를 작은 작업으로 나누고 진행 상황을 공유할 때 강점이 살아납니다."}`, evidence },
    soloStrength: { text: `혼자 맡은 일에서는 ${autonomy ? "직접 시도하면서 방법을 다듬는 편" : "할 일과 준비 조건을 먼저 정리하는 편"}입니다. ${autonomy ? "작게 실행하고 결과를 보며 다음 단계를 조정할 때" : "완료 기준과 필요한 자료를 먼저 정해둘 때"} 안정적으로 힘을 냅니다.`, evidence },
  };
  return { roles, autonomy, theme, sections };
}
