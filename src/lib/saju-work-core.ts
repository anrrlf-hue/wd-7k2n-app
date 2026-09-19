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
    : roles ? "역할과 책임의 경계를 확인하는 경향에 무게를 둡니다. 자율성이 필요 없다는 뜻은 아닙니다."
    : autonomy ? "스스로 시도하고 실행하는 경향에 무게를 둡니다. 조직이나 규칙에 맞지 않는다는 뜻은 아닙니다."
    : "역할과 자율성 중 하나를 우세하게 정하지 않습니다. 실제로 편한 업무 조건을 먼저 확인할 필요가 있습니다.";
  const sections: Pick<FreeSajuReport, "earningStyle" | "jobOrientation" | "teamStrength" | "soloStrength"> = {
    earningStyle: { text: `이 해석에서는 ${expression ? "아이디어를 결과물로 표현하는" : "자신이 맡은 일을 직접 실행하는"} 경향을 살펴봅니다. ${theme} 어떤 활동이 실제 수입으로 이어지는지는 경험과 업무 자료로 확인해야 합니다.`, evidence },
    jobOrientation: { text: `이 해석에서는 ${theme} 직장·사업·프리랜서 중 어느 쪽이 맞는지는 출생정보로 정하지 않습니다. 실제 역할, 소득 안정성, 경력과 선호를 함께 확인해야 합니다.`, evidence },
    teamStrength: { text: `이 해석에서는 ${roles ? "팀의 역할과 완료 기준을 분명하게 두는 경향" : "팀 안에서도 자신의 실행 방법을 찾는 경향"}을 살펴봅니다. 역할 합의와 실행 재량이 함께 있을 때 어떤지 떠올려 보세요. 실제 조직 적응력을 확인한 결과는 아닙니다.`, evidence },
    soloStrength: { text: `이 해석에서는 ${autonomy ? "맡은 범위 안에서 직접 시도하는 경향" : "독립 실행 성향을 단정하기보다 준비 조건"}을 살펴봅니다. 혼자 판단할 범위와 도움받을 부분을 나눠 보세요. 독립·창업을 권하거나 과거 성과를 확인한 것은 아닙니다.`, evidence },
  };
  return { roles, autonomy, theme, sections };
}
