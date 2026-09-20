import type { SajuFacts } from "@/lib/saju-facts";
import type { FreeSajuReport } from "@/lib/free-report-schema";

/** One interpretive frame, not an occupational or financial suitability test. */
export function deriveSajuWorkCore(facts: SajuFacts) {
  const roles = facts.officerStarCount > 0;
  const autonomy = facts.peerStarCount + facts.outputStarCount > 0;
  const expression = facts.outputStarCount > facts.peerStarCount;
  const evidence = `관성 ${facts.officerStarCount}, 비겁 ${facts.peerStarCount}, 식상 ${facts.outputStarCount} — 전통적 성향 해석, 직업 적합성 측정 아님`;
  const theme = roles && autonomy
    ? "역할과 책임은 분명한 편이지만, 실행 방법까지 세세하게 정해지는 것은 답답하게 느낄 수 있습니다. 맡은 범위가 분명하고 그 안에서 자기 방식으로 풀어갈 때 힘이 잘 납니다."
    : roles
      ? "맡은 역할과 책임의 경계를 분명히 하고, 시작한 일은 끝까지 정리하려는 편입니다. 기준이 모호한 환경보다 해야 할 일이 선명한 환경에서 안정감을 느낍니다."
      : autonomy
        ? "누가 정해준 방식보다 직접 시도하며 자기 방법을 찾아갈 때 힘이 납니다. 작은 실행에서 감을 잡고, 결과를 보며 다음 단계를 조정하는 편입니다."
        : "역할과 자율성 어느 한쪽으로 강하게 치우치기보다, 상황에 따라 필요한 만큼 조절하는 편입니다.";
  const sections: Pick<FreeSajuReport, "earningStyle" | "jobOrientation" | "teamStrength" | "soloStrength"> = {
    earningStyle: { text: `${expression ? "생각을 눈에 보이는 결과로 만들고 다른 사람에게 전달할 때 강점이 살아납니다." : "맡은 일을 실제로 움직여 끝까지 완성할 때 강점이 살아납니다."} ${expression ? "설명·기획·제작처럼 머릿속 구상을 형태로 보여주는 일" : "배운 것을 실제 문제에 적용하고 마무리하는 일"}과 잘 맞는 편입니다.`, evidence },
    jobOrientation: { text: `${theme} 그래서 직장형·사업형 하나로 단정하기보다, 어떤 환경에서 가장 오래 힘을 낼 수 있는지를 보는 편이 더 정확합니다.`, evidence },
    teamStrength: { text: `팀에서는 ${roles ? "역할과 완료 기준을 분명히 맞추는 능력" : "막연한 목표를 실제 실행 방법으로 바꾸는 능력"}이 강점입니다. ${roles ? "누가 무엇을 맡고 어디까지 끝낼지 정리되면 안정적으로 힘을 냅니다." : "과제를 작은 작업으로 나누고 진행 상황을 공유할 때 강점이 잘 드러납니다."}`, evidence },
    soloStrength: { text: `혼자 맡은 일에서는 ${autonomy ? "직접 시도하면서 방법을 다듬는 편" : "할 일과 준비 조건을 먼저 정리하는 편"}입니다. ${autonomy ? "작게 실행하고 결과를 보며 다음 단계를 조정할 때" : "완료 기준과 필요한 자료를 먼저 정해둘 때"} 안정적으로 힘을 냅니다.`, evidence },
  };
  return { roles, autonomy, theme, sections };
}
