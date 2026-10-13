import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { SajuFacts, TenGodGroup } from "@/lib/saju-facts";
import { buildPersonalReading } from "@/lib/personal-reading";
import { buildPremiumEditorialPlan, type EditorialArcId } from "@/lib/premium-editorial-plan";

type Item = FreeSajuReport["strengths"][number];

/** Short free and verdict projections of the same natal question used by the
 * deeper report. A group's mere presence supplies a possible lens, never a
 * measured personality strength. */
const ARC: Record<EditorialArcId, { bridge: string; decision: string; strength: string; strengthDetail: string; caution: string; verdict: string }> = {
  "agency-duty": {
    bridge: "맡은 목적을 이해한 뒤 직접 고를 방법을 남길 때 이 두 면을 함께 쓸 수 있습니다.",
    decision: "무엇을 끝낼지 먼저 합의하고, 그 목적 안에서 스스로 고를 방법 한 가지를 정해보세요. 더 확인할 정보와 이미 납득한 기준을 구분할 수 있습니다.",
    strength: "납득한 책임 안에서 방법을 고르는 관점", strengthDetail: "같은 목표라도 실행 방법은 여러 가지일 수 있음을 설명하며 자기 몫을 제안해볼 수 있습니다.", caution: "목적에 동의한 것을 모든 실행 방법까지 맡기로 한 약속으로 넓히지 않도록 살펴보세요.",
    verdict: "책임의 이유를 납득하고 자기 판단을 보탤 자리를 찾는 질문이 중심입니다.",
  },
  "agency-duty-supported": {
    bridge: "선택을 이어갈 사람과 자료가 갖춰질 때 자기 판단과 책임을 함께 놓기 쉽습니다.",
    decision: "하고 싶은 방향과 혼자 맡을 수 있는 범위를 나누고, 함께 확인할 사람과 자료를 먼저 정해보세요.",
    strength: "책임과 도움의 조건을 함께 보는 관점", strengthDetail: "시작에 필요한 사람과 자료를 말로 확인하면 자신의 판단을 실제 역할에 연결해볼 수 있습니다.", caution: "좋은 방향이라고 판단한 뒤 준비와 실행까지 모두 혼자 맡는 약속으로 넘어가지 않도록 살펴보세요.",
    verdict: "납득한 방향을 이어갈 도움과 담당 범위를 함께 묻는 질문이 중심입니다.",
  },
  "creation-exchange": {
    bridge: "생각을 밖으로 꺼낸 다음 실제 쓰임과 맡을 조건을 확인하는 과정으로 이어집니다.",
    decision: "새 아이디어를 보여줄 때 누구에게 어떤 쓰임이 있는지 먼저 확인하고, 이어갈 범위를 정해보세요.",
    strength: "생각과 실제 쓰임을 연결하는 관점", strengthDetail: "표현한 결과가 누구에게 어떤 도움이 되는지 묻는 과정에서 다음 실험을 구체화할 수 있습니다.", caution: "좋은 반응을 받은 제안을 모두 끝까지 맡을 수 있는 약속으로 넓히지 않도록 살펴보세요.",
    verdict: "표현한 생각이 누구의 쓰임과 어떤 조건에서 만나는지 묻는 질문이 중심입니다.",
  },
  "creation-exchange-supported": {
    bridge: "표현한 가능성을 마무리할 사람과 자료를 정할 때 장점이 구체화될 수 있습니다.",
    decision: "반응을 받은 생각 가운데 지금의 역할과 도움으로 마무리할 한 가지를 골라보세요.",
    strength: "가능성과 실행 조건을 같이 보는 관점", strengthDetail: "좋은 반응을 얻은 다음 필요한 도움을 확인하면 이어갈 가능성의 범위를 좁혀볼 수 있습니다.", caution: "관심을 얻은 일이 준비 인력과 자료까지 확보됐다는 뜻으로 굳어지지 않도록 살펴보세요.",
    verdict: "생각을 보여준 뒤 그것을 이어갈 지원과 몫을 묻는 질문이 중심입니다.",
  },
  "duty-supported": {
    bridge: "기대의 뜻을 확인하고 함께 맡을 범위를 정할 때 책임이 구체적인 선택이 됩니다.",
    decision: "맡아달라는 말의 완료 기준과 필요한 도움을 나누어 확인한 뒤 답해보세요.",
    strength: "기대와 실행 조건을 함께 확인하는 관점", strengthDetail: "맡은 일의 뜻을 질문하면 협력이 필요한 지점과 직접 마무리할 부분을 나눌 수 있습니다.", caution: "상대의 기대를 이해한 일을 모든 부담을 받아들인 약속으로 바꾸지 않도록 살펴보세요.",
    verdict: "맡을 일의 뜻과 그 일을 가능하게 할 도움을 함께 묻는 질문이 중심입니다.",
  },
  "duty-translation": {
    bridge: "요구를 곧바로 떠안기보다 설명을 확인하고 작은 결과로 옮길 때 책임과 지원의 의미가 이어집니다.",
    decision: "완료 기준을 먼저 묻고, 보여줄 결과와 수정할 범위를 나누어 선택해보세요. 설명을 듣는 일과 실행 전체를 약속하는 일은 별개입니다.",
    strength: "요구를 실행 가능한 기준으로 나누는 관점", strengthDetail: "복잡한 요청을 작은 확인 항목으로 바꾸어 설명하면 함께 볼 결과를 구체화할 수 있습니다.", caution: "완료 기준을 모른 채 맡은 범위를 넓히면 보여줄 결과와 추가 요청의 경계가 흐려질 수 있습니다.",
    verdict: "약속의 기준을 이해하고 결과로 설명하되, 맡을 범위를 합의하는 질문이 중심입니다.",
  },
  "duty-boundaries": {
    bridge: "맡은 일을 지키는 태도와 다음 역할을 고르는 판단을 따로 둘 때 무게를 조절할 수 있습니다.",
    decision: "익숙해서 맡는 일과 앞으로도 같은 범위로 이어갈 일을 구분해보세요.",
    strength: "신뢰와 책임 범위를 함께 보는 관점", strengthDetail: "지켜온 약속을 바탕으로 다음 역할에서는 맡을 범위를 새로 제안해볼 수 있습니다.", caution: "한 번 잘해낸 일을 다음 추가 책임까지 이미 수락한 것으로 여기지 않도록 살펴보세요.",
    verdict: "지킬 약속과 새로 받아들일 역할의 경계를 묻는 질문이 중심입니다.",
  },
  "agency-value": {
    bridge: "스스로 납득한 이유가 다른 사람에게도 설명될 때 선택의 실제 쓰임을 확인할 수 있습니다.",
    decision: "내게 중요한 이유와 함께하는 사람이 확인할 조건을 나란히 적어보세요.",
    strength: "선택의 이유와 쓰임을 잇는 관점", strengthDetail: "판단의 이유를 상대가 쓸 수 있는 말로 옮기면 함께 고를 조건이 더 선명해질 수 있습니다.", caution: "내게 분명한 이유가 상대에게도 전달됐다고 미리 가정하지 않도록 살펴보세요.",
    verdict: "자기 판단의 이유와 실제 쓰임을 함께 설명하는 질문이 중심입니다.",
  },
  "understanding-duty": {
    bridge: "이해한 내용을 실제 맡을 일로 옮길 때 준비와 책임이 서로 맞닿습니다.",
    decision: "더 알아야 할 조건 하나와 지금 시험할 수 있는 부분 하나를 나누어보세요.",
    strength: "이해를 작은 실행으로 옮기는 관점", strengthDetail: "배운 내용 가운데 바로 시험할 부분을 고르면 준비가 실제 결과로 이어지는지 확인할 수 있습니다.", caution: "모든 기대를 만족시키려는 확인과 결정을 위해 꼭 필요한 확인을 혼동하지 않도록 살펴보세요.",
    verdict: "충분히 이해한 내용을 언제 맡을 일로 옮길지 묻는 질문이 중심입니다.",
  },
  "agency-expression": {
    bridge: "먼저 제안한 뒤 함께할 사람이 고를 시간을 남길 때 표현과 협력이 이어집니다.",
    decision: "작은 결과를 보여주고 상대가 바꾸고 싶은 조건 한 가지를 들은 뒤 다음 방법을 정해보세요.",
    strength: "자기 방향을 작은 결과로 보이는 관점", strengthDetail: "먼저 만든 예시를 보여주면 다른 사람이 바꾸고 싶은 부분을 구체적으로 들을 수 있습니다.", caution: "먼저 제안한 방법이 함께할 사람의 동의까지 얻은 것으로 넘어가지 않도록 살펴보세요.",
    verdict: "먼저 움직이는 속도와 함께할 사람의 선택을 맞추는 질문이 중심입니다.",
  },
  balanced: {
    bridge: "서로 다른 기준이 나란히 보일 때에는 이번 선택에서 중요한 것 하나를 먼저 정해볼 수 있습니다.",
    decision: "이번 선택의 완료 기준 하나와 함께 조정할 조건 하나를 구분해보세요.",
    strength: "여러 기준을 나란히 살피는 관점", strengthDetail: "서로 다른 요구를 같은 표에 놓아보면 이번 결정에서 지킬 조건을 골라볼 수 있습니다.", caution: "서로 다른 기준을 모두 만족시키려다 어느 결정을 위한 비교인지 흐려지지 않도록 살펴보세요.",
    verdict: "이번 선택의 중심 기준을 고르는 질문이 중심입니다.",
  },
};

const GROUP_LENS: Record<TenGodGroup, { title: string; strength: string; cautionTitle: string; caution: string }> = {
  관성: { title: "약속의 기준을 살피는 관점", strength: "맡을 범위를 먼저 확인하면 책임을 실제로 지킬 방법을 고를 수 있습니다.", cautionTitle: "추가 책임의 경계", caution: "새 요청을 받았을 때 처음 약속한 완료 기준과 늘어난 범위를 따로 확인해보세요. 맡을 수 있는 범위를 말로 남겨두면 나중에 서로 다른 기대를 확인하기 쉽습니다." },
  인성: { title: "필요한 설명을 골라 듣는 관점", strength: "요청의 뜻을 확인한 뒤 바로 적용할 부분을 가려볼 수 있습니다.", cautionTitle: "확인의 목적", caution: "더 알아볼 내용이 결정을 바꿀 근거인지, 이미 정한 기준을 반복 확인하는 것인지 나누어보세요. 앞의 경우에는 질문을 남기고, 뒤의 경우에는 작은 실행으로 확인할 수 있습니다." },
  식상: { title: "생각을 작은 결과로 보이는 관점", strength: "설명만 이어가기보다 시험할 수 있는 결과 하나로 반응을 확인해볼 수 있습니다.", cautionTitle: "시연과 약속의 차이", caution: "작은 결과를 보여준 일과 후속 수정 전체를 맡기로 한 일은 구분해보세요. 반응이 좋더라도 다음에 누가 무엇을 고칠지 정한 뒤 이어가는 편이 좋습니다." },
  비겁: { title: "자기 몫을 고르는 관점", strength: "함께하는 일에서도 직접 정할 부분을 말로 남겨볼 수 있습니다.", cautionTitle: "내 방식의 적용 범위", caution: "내가 고른 방법이 공동의 완료 기준을 바꾸는지 확인해보세요. 방법을 바꿀 여지가 있어도 결과를 받는 사람과 다시 합의할 조건은 따로 남을 수 있습니다." },
  재성: { title: "쓰임과 조건을 함께 보는 관점", strength: "누구에게 쓸모가 있는지와 들일 자원을 나란히 살펴볼 수 있습니다.", cautionTitle: "보이는 보상과 비용", caution: "좋아 보이는 조건 뒤에 필요한 시간과 사람의 몫도 따로 확인해보세요. 돌아올 대가만 비교하면 실제로 계속 감당할 수 있는지 놓치기 쉽습니다." },
};

export function buildSajuReadingCoherence(facts: SajuFacts): {
  arcId: EditorialArcId;
  temperament: ReportParagraph;
  decisionStyle: ReportParagraph;
  strengths: FreeSajuReport["strengths"];
  cautions: FreeSajuReport["cautions"];
  verdictLead: string;
} {
  const personal = buildPersonalReading(facts);
  const editorial = buildPremiumEditorialPlan(facts, personal.rule);
  const copy = ARC[editorial.id];
  const counts = editorial.natalEvidence.counts;
  const profileEvidence = `해석 계획 ${editorial.id}; ${Object.entries(counts).map(([group, count]) => `${group} ${count}개`).join(" · ")}. 계산된 상징을 전통적으로 읽은 것으로 실제 성향을 측정하지 않습니다.`;
  const temperament: ReportParagraph = {
    text: `${personal.overall.paragraphs[0].replaceAll("원국", "사주 구성")} ${copy.bridge}`,
    evidence: profileEvidence,
  };
  const decisionStyle: ReportParagraph = { text: copy.decision, evidence: profileEvidence };
  const lead: Item = { title: copy.strength, detail: copy.strengthDetail, evidence: profileEvidence };
  const supporting = editorial.natalEvidence.supporting.filter(group => counts[group] > 0);
  const strengths: Item[] = [lead, ...supporting.map(group => ({
    title: GROUP_LENS[group].title, detail: GROUP_LENS[group].strength,
    evidence: `해석 계획 ${editorial.id}; ${group} ${counts[group]}개. 한 그룹의 존재만으로 능력을 확정하지 않습니다.`,
  }))].slice(0, 3);
  const cautions: Item[] = [{ title: "선택 범위의 경계", detail: `${copy.caution} 이는 실제로 그런 습관이 있다는 판정이 아니라, 비슷한 선택 앞에서 합의할 범위를 확인하기 위한 질문입니다.`, evidence: profileEvidence },
    ...supporting.map(group => ({ title: GROUP_LENS[group].cautionTitle, detail: GROUP_LENS[group].caution,
      evidence: `해석 계획 ${editorial.id}; ${group} ${counts[group]}개. 실제 행동을 확인하지 않았습니다.` }))].slice(0, 3);
  const fallback: Item[] = [
    { title: "선택의 적용 범위", detail: "이번 해석이 맞는지는 작은 선택에서 어떤 기준을 실제로 썼는지 돌아보며 확인해보세요.", evidence: profileEvidence },
    { title: "함께 정할 조건", detail: "혼자 고를 부분과 상대의 동의가 필요한 부분을 나누면 선택의 조건을 더 분명히 볼 수 있습니다.", evidence: profileEvidence },
  ];
  for (const item of fallback) {
    if (strengths.length < 3) strengths.push(item);
    if (cautions.length < 3) cautions.push({ ...item, title: `${item.title} 확인`,
      detail: `${item.detail} 해당 기준을 실제로 쓴 적이 있는지 떠올린 뒤, 다음 선택에서는 무엇을 먼저 확인할지 한 가지를 정해보세요.` });
  }
  const strengthContext = !facts.dayStrengthReliable
    ? "출생시간이 없어 자기주도성의 강약은 이 해석에 덧붙이지 않았습니다."
    : facts.dayStrength === "weak"
      ? "상황과 도움을 살피는 방식이 함께 읽혀, 곧바로 앞장서는 모습으로 단정하지 않습니다."
      : facts.dayStrength === "strong"
        ? "자기 기준을 지키는 모습은 읽히지만, 모든 상황에서 같은 속도로 결정한다고 보지는 않습니다."
        : "자기 기준과 주변 조건을 함께 보는 모습은 상황에 따라 다르게 나타날 수 있습니다.";
  return { arcId: editorial.id, temperament, decisionStyle, strengths, cautions,
    verdictLead: `${copy.verdict} ${strengthContext} 이는 실제 성격이나 행동을 확정한 말이 아닙니다.` };
}
