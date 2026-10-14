import type { FreeSajuReport, ReportParagraph } from "@/lib/free-report-schema";
import type { SajuFacts, TenGodGroup } from "@/lib/saju-facts";
import { buildPersonalReading } from "@/lib/personal-reading";
import { buildPremiumEditorialPlan, type EditorialArcId } from "@/lib/premium-editorial-plan";
import { buildSajuMoneyMeaning } from "@/lib/saju-money-meaning";

type Item = FreeSajuReport["strengths"][number];

/** Short free and verdict projections of the same natal question used by the
 * deeper report. A group's mere presence supplies a possible lens, never a
 * measured personality strength. */
const ARC: Record<EditorialArcId, { center: string; bridge: string; decision: string; strength: string; strengthDetail: string; cautionTitle: string; caution: string; verdict: string }> = {
  "agency-duty": {
    center: "역할을 지키려는 기준, 그 이유를 이해하려는 관점, 자기 방법을 고르려는 관점이 함께 놓입니다.",
    bridge: "목적이 설명된 자리에서는 방법을 비교하는 쪽으로, 이유가 비어 있는 자리에서는 먼저 납득할 근거를 찾는 쪽으로 읽을 수 있습니다.",
    decision: "새 정보가 목적 자체를 바꿀 수 있다면 그 근거를 먼저 물어보세요. 목적은 이미 납득했지만 실행을 약속하지 않았다면, 직접 고를 방법과 함께 승인받을 방법을 따로 제안할 수 있습니다.",
    strength: "목적을 놓치지 않는 유연함", strengthDetail: "완료할 결과가 분명하고 방법에 재량이 있는 자리라면, 서로 다른 실행안을 비교해 목적에 맞는 하나를 제안할 수 있습니다.", cautionTitle: "목적과 방법의 어긋남", caution: "결과는 그대로인데 방법만 계속 바뀌는 자리에서는 검토에 쓴 시간이 성과로 이어지지 않을 수 있습니다. 반대로 목적이 바뀌었는데 기존 방법을 지키는 상황이라면 먼저 결과의 기준부터 다시 확인할 필요가 있습니다.",
    verdict: "책임의 이유를 납득하고 자기 판단을 보탤 자리를 찾는 질문이 중심입니다.",
  },
  "agency-duty-supported": {
    center: "납득한 책임과 자기 판단에 더해, 이를 이어갈 사람과 자료의 조건이 함께 놓입니다.",
    bridge: "방향을 고르는 단계와 그 선택을 오래 이어갈 조건을 갖추는 단계는 서로 다른 무게로 읽힙니다.",
    decision: "방향을 바꿀 정보가 모자라다면 먼저 필요한 자료의 출처를 정해보세요. 방향은 정했지만 실행 약속은 아직이라면 도움받을 사람과 직접 맡을 부분을 나누어 말할 수 있습니다.",
    strength: "도움을 구체적으로 요청하기", strengthDetail: "목적에 동의하고 함께 검토할 사람이 정해진 자리라면, 자신의 방법을 제안한 뒤 막히는 지점을 구체적인 협력 요청으로 옮길 수 있습니다.", cautionTitle: "지원 없는 진행", caution: "좋은 방향을 골랐더라도 필요한 자료를 받을 통로가 없는 장면에서는 같은 부분을 여러 번 확인하느라 진행이 멈출 수 있습니다. 이때 선택 자체를 의심하기 전에 어떤 지원이 비어 있는지 살펴볼 수 있습니다.",
    verdict: "납득한 방향을 이어갈 도움과 담당 범위를 함께 묻는 질문이 중심입니다.",
  },
  "creation-exchange": {
    center: "생각을 밖으로 표현하는 상징과 그 결과가 실제 어디에 쓰이는지 살피는 상징이 함께 놓입니다.",
    bridge: "반응을 보기 전에는 가능성을 펼치고, 반응을 들은 뒤에는 실제 쓸 사람의 필요를 가리는 흐름으로 읽힙니다.",
    decision: "누가 쓸지 아직 모른다면 작은 결과로 반응을 확인해보세요. 쓰임은 확인했지만 이어갈 약속은 아직이라면 후속 작업의 범위와 조건을 별도로 정할 수 있습니다.",
    strength: "아이디어를 쓸모 있게 다듬기", strengthDetail: "결과를 보여줄 상대가 있고 사용 장면을 물을 수 있다면, 넓은 아이디어 가운데 실제 필요한 한 부분을 다음 실험으로 고를 수 있습니다.", cautionTitle: "호응과 지속성의 간격", caution: "첫 반응이 좋은 장면에서는 여러 방향을 한꺼번에 시작하기 쉽다는 질문을 남깁니다. 실제 사용이 확인되기 전에 작업을 넓히면 어느 결과를 계속 다듬을지 판단할 자료가 부족해질 수 있습니다.",
    verdict: "표현한 생각이 누구의 쓰임과 어떤 조건에서 만나는지 묻는 질문이 중심입니다.",
  },
  "creation-exchange-supported": {
    center: "표현한 가능성과 실제 교환 조건에, 이를 끝낼 지원의 필요가 함께 놓입니다.",
    bridge: "여러 반응을 얻는 단계보다 어떤 제안을 지금의 사람과 자료로 마무리할지 고르는 단계에서 긴장이 커질 수 있습니다.",
    decision: "반응의 이유를 모른다면 실제 사용 장면을 먼저 물어보세요. 이어갈 방향은 정했지만 약속하지 않았다면 필요한 사람·자료가 갖춰진 한 가지부터 제안할 수 있습니다.",
    strength: "완성할 수 있는 제안 고르기", strengthDetail: "여러 제안이 왔을 때 사용할 사람과 도울 사람이 분명한 안부터 고르면, 넓힌 가능성 중 실제 마무리할 대상을 좁힐 수 있습니다.", cautionTitle: "동시 착수의 부담", caution: "여러 제안이 모두 좋아 보이는 상황에서는 준비할 사람과 자료가 겹치는지 놓치기 쉽습니다. 각 제안을 시작하기 전에 필요한 지원을 나란히 두면, 반응의 수와 감당할 일을 혼동하지 않을 수 있습니다.",
    verdict: "생각을 보여준 뒤 그것을 이어갈 지원과 몫을 묻는 질문이 중심입니다.",
  },
  "duty-supported": {
    center: "역할과 약속의 기준이 중심에 있고, 그 일을 이어갈 도움과 설명의 조건이 곁에 놓입니다.",
    bridge: "기대가 분명할수록 맡을 일을 이해하기 쉽지만, 실제 지속성은 정보를 받을 사람과 함께 조정할 여지에 달려 있습니다.",
    decision: "기대의 뜻이 불분명하다면 완료할 결과를 먼저 물어보세요. 뜻은 알지만 실행 약속 전이라면 필요한 도움과 자신이 맡을 부분을 따로 제시할 수 있습니다.",
    strength: "함께 끝내는 꾸준함", strengthDetail: "끝낼 결과와 도움받을 사람이 분명한 자리라면, 일을 빠뜨리지 않고 이어가기 위해 누구에게 무엇을 확인할지 먼저 정할 수 있습니다.", cautionTitle: "지원 조건의 공백", caution: "믿고 맡긴다는 말은 있지만 검토할 사람이나 자료가 비어 있다면, 작은 문제까지 혼자 해결해야 하는 구조가 될 수 있습니다. 신뢰를 유지하려면 어떤 지원이 필요한지 일의 시작에 드러내는 편이 낫습니다.",
    verdict: "맡을 일의 뜻과 그 일을 가능하게 할 도움을 함께 묻는 질문이 중심입니다.",
  },
  "duty-translation": {
    center: "요구와 약속의 기준이 다른 요소보다 두드러지고, 그 뜻을 이해하는 관점과 밖으로 설명할 통로가 곁에 놓입니다.",
    bridge: "맡은 요청의 기준이 한 사람에게서 분명히 오면 뜻을 파악하기 쉽고, 여러 사람이 다른 말을 하면 무엇을 먼저 따를지부터 확인해야 하는 구조로 읽습니다.",
    decision: "완료 기준을 바꿀 정보가 비어 있다면 누가 사용할 결과인지부터 물어보세요. 판단은 끝났지만 실행을 약속하지 않았다면 먼저 보여줄 한 부분과 이후 새로 결정할 부분을 구별해 제안할 수 있습니다.",
    strength: "요구를 실행 가능한 기준으로 나누는 관점", strengthDetail: "사용할 사람과 목적이 분명한 자리라면 여러 요구 중 반드시 충족할 조건을 골라볼 수 있습니다. 그러면 취향이 다른 의견도 같은 목적에 비추어 비교할 수 있어 검토의 순서가 선명해집니다.", cautionTitle: "바뀌는 기준의 비용", caution: "여러 사람이 서로 다른 완료 기준을 내놓는 장면이라면 같은 결과를 계속 고쳐도 판단이 쌓이지 않을 수 있습니다. 이때 필요한 것은 수정 횟수를 늘리는 일이 아니라 어느 기준을 먼저 볼지 결정하는 일입니다.",
    verdict: "약속의 기준을 이해하고 결과로 설명하되, 맡을 범위를 합의하는 질문이 중심입니다.",
  },
  "duty-boundaries": {
    center: "약속을 지키는 기준이 중심에 있고, 자기 몫을 고르는 판단이 곁에 놓입니다.",
    bridge: "익숙한 일을 계속할 때의 안정감과 다음 역할을 새로 선택할 때의 부담이 다른 무게로 읽힙니다.",
    decision: "새 요청이 기존 약속에 포함되는지 모른다면 변경된 결과를 물어보세요. 새 역할임을 알았지만 실행 약속 전이라면 기존 일과 나란히 놓고 우선순위를 정할 수 있습니다.",
    strength: "지킨 약속을 다음 선택에 잇는 관점", strengthDetail: "기존 결과가 확인된 자리라면 무엇을 이어가고 무엇을 새로 배울지 나눠볼 수 있습니다. 이전의 신뢰를 다음 역할의 조건을 묻는 출발점으로 쓸 수 있습니다.", cautionTitle: "기존 일의 밀림", caution: "새 역할이 매력적이어도 이미 맡은 일의 마무리 시간이 그대로라면 두 결과가 서로 밀릴 수 있습니다. 추가 일을 받을지보다 먼저 어느 일을 언제 끝낼지 나누어야 부담의 크기를 볼 수 있습니다.",
    verdict: "지킬 약속과 새로 받아들일 역할의 경계를 묻는 질문이 중심입니다.",
  },
  "agency-value": {
    center: "자기 판단의 이유와 다른 사람이 체감하는 쓰임을 함께 읽는 구성입니다.",
    bridge: "혼자 선택할 때의 납득과 함께 쓸 사람에게 이유를 설명할 때의 납득은 다를 수 있습니다.",
    decision: "상대가 무엇을 필요로 하는지 모른다면 사용 장면을 먼저 물어보세요. 쓰임은 이해했지만 실행 약속 전이라면 지킬 목적과 바꿀 방법을 나누어 제안할 수 있습니다.",
    strength: "선택의 이유를 전하기", strengthDetail: "함께 쓸 사람이 자신의 필요를 말해준 자리라면, 내가 고른 이유를 그 사람이 확인할 수 있는 결과로 옮겨 선택 조건을 선명하게 할 수 있습니다.", cautionTitle: "설명되지 않은 확신", caution: "혼자 충분히 검토한 선택이라도 그 이유를 함께 쓸 사람에게 전하지 못했다면 다른 조건이 뒤늦게 나타날 수 있습니다. 내 판단을 다시 처음부터 버리기보다 상대가 중요하게 보는 조건을 들어볼 여지가 있습니다.",
    verdict: "자기 판단의 이유와 실제 쓰임을 함께 설명하는 질문이 중심입니다.",
  },
  "understanding-duty": {
    center: "이해하고 준비하는 상징과 맡은 일을 지키는 상징이 함께 놓입니다.",
    bridge: "새 조건을 익히는 일은 시작의 바탕이지만, 언제 실제 결과로 옮길지는 그 조건이 결정에 필요한지에 따라 달라집니다.",
    decision: "결정을 바꿀 정보가 남았다면 그 질문과 답할 사람을 적어보세요. 할 방법은 알지만 실행 약속 전이라면 먼저 시험할 한 부분과 맡을 기간을 따로 정할 수 있습니다.",
    strength: "배운 것을 직접 써 보기", strengthDetail: "배운 내용을 시험할 작은 부분과 피드백을 줄 사람이 정해져 있다면, 준비를 끝없는 공부로 남기지 않고 다음 결과를 고르는 자료로 쓸 수 있습니다.", cautionTitle: "끝없는 준비", caution: "자료를 더 찾는 동안 이미 답한 질문까지 다시 검토하고 있다면 시작할 시점을 놓칠 수 있습니다. 새 정보가 무엇을 바꿀지 먼저 적어보면 필요한 확인과 불안을 달래는 반복을 구별할 수 있습니다.",
    verdict: "충분히 이해한 내용을 언제 맡을 일로 옮길지 묻는 질문이 중심입니다.",
  },
  "agency-expression": {
    center: "스스로 방향을 고르려는 상징과 생각을 밖으로 보여주는 상징이 함께 놓입니다.",
    bridge: "먼저 시도하는 속도와 함께할 사람이 그 결과를 이해하고 선택하는 속도는 다를 수 있습니다.",
    decision: "상대가 무엇을 바꿀지 모른다면 작은 예시로 의견을 받아보세요. 다음 방향은 보이지만 실행 약속 전이라면 함께 정할 조건을 듣고 맡을 부분을 고를 수 있습니다.",
    strength: "생각을 눈에 보이게 전하기", strengthDetail: "사용할 사람이 있고 비교할 예시를 만들 수 있다면, 긴 설명 대신 작은 결과를 보여줘 실제 바꾸고 싶은 지점을 들을 수 있습니다.", cautionTitle: "서로 다른 진행 속도", caution: "내게는 다음 방법이 이미 떠올랐어도 함께할 사람은 아직 첫 결과를 검토하는 중일 수 있습니다. 그 사이에 작업을 앞서 시작하면 좋은 제안도 일방적인 변경으로 받아들여질 여지가 있습니다.",
    verdict: "먼저 움직이는 속도와 함께할 사람의 선택을 맞추는 질문이 중심입니다.",
  },
  balanced: {
    center: "한 요소만 앞세우기 어려워 이해·표현·책임·쓰임 등의 기준을 함께 살피는 구성입니다.",
    bridge: "같은 사람이더라도 관계, 돈, 일의 선택에서 먼저 필요한 기준은 서로 다를 수 있습니다.",
    decision: "어느 기준이 이번 결정을 바꿀지 모른다면 선택지를 실제로 비교할 정보를 먼저 모아보세요. 기준을 골랐지만 실행 약속 전이라면 이번에 맡을 한 부분만 정할 수 있습니다.",
    strength: "이번에 필요한 것 고르기", strengthDetail: "비교할 대상과 목적이 분명한 자리라면 여러 기준을 같은 표에 놓아 이번 선택에 꼭 필요한 조건을 골라볼 수 있습니다.", cautionTitle: "비교 기준의 과잉", caution: "목적이 다른 선택의 기준을 한 표에 모두 올리면 어떤 대안도 부족해 보일 수 있습니다. 무엇을 고르는 자리인지 먼저 정해야, 중요한 조건과 다른 문제에서 다룰 조건을 나눌 수 있습니다.",
    verdict: "이번 선택의 중심 기준을 고르는 질문이 중심입니다.",
  },
};

const GROUP_LENS: Record<TenGodGroup, { title: string; strength: string; cautionTitle: string; caution: string }> = {
  관성: { title: "먼저 지킬 약속 알아보기", strength: "지킬 약속이 둘 이상인 자리라면 먼저 끝낼 결과를 정해, 함께하는 사람이 기다릴 순서를 분명히 할 수 있습니다.", cautionTitle: "겹친 약속의 순서", caution: "새로운 부탁과 이미 맡은 일이 같은 시간에 놓이면, 어느 쪽도 늦지 않게 하려다 두 결과가 함께 밀릴 수 있습니다. 새 부탁의 중요성보다 먼저 지킬 약속의 순서를 확인해보세요." },
  인성: { title: "배운 것을 적용할 자리 찾기", strength: "설명을 들은 뒤 실제 적용할 한 부분이 정해져 있다면, 배운 내용을 행동 전의 확인 기준으로 바꾸어 볼 수 있습니다.", cautionTitle: "정보의 쓰임", caution: "새 자료가 계속 들어와도 이번 결정에서 달라질 점이 없다면 확인이 길어지는 것만으로 판단이 좋아지지는 않습니다. 정보마다 어떤 선택을 바꿀 수 있는지 물어보세요." },
  식상: { title: "의견을 들을 작은 결과 만들기", strength: "의견을 줄 사람이 정해진 자리라면 설명 대신 작은 예시를 보여줘, 상대가 바꾸고 싶은 부분을 구체적으로 들을 수 있습니다.", cautionTitle: "시연과 후속 약속", caution: "작은 예시를 보여준 뒤 좋은 반응을 받더라도 실제 사용할 형태를 만드는 일은 별도 단계일 수 있습니다. 다음 결과를 누가 언제 확인할지 정해지지 않았다면 반응을 완료 약속으로 옮기지 마세요." },
  비겁: { title: "내가 고를 부분 남기기", strength: "공동 목표가 정해져 있고 방법에 여지가 있다면, 스스로 시험할 안을 제안해 함께 비교할 선택지를 늘릴 수 있습니다.", cautionTitle: "내 방식의 적용 범위", caution: "내가 고른 방법이 공동의 완료 기준을 바꾸는지 확인해보세요. 방법을 바꿀 여지가 있어도 결과를 받는 사람과 다시 합의할 조건은 따로 남을 수 있습니다." },
  재성: { title: "실제로 남는 가치 알아보기", strength: "받을 결과와 필요한 자원이 함께 보이는 제안이라면, 무엇이 실제로 남는지 비교할 질문을 구체화할 수 있습니다.", cautionTitle: "보이는 보상과 비용", caution: "좋아 보이는 조건 뒤에 필요한 시간과 사람의 몫도 따로 확인해보세요. 돌아올 대가만 비교하면 실제로 계속 감당할 수 있는지 놓치기 쉽습니다." },
};

export function buildSajuReadingCoherence(facts: SajuFacts): {
  arcId: EditorialArcId;
  snapshot: ReportParagraph;
  money: ReturnType<typeof buildSajuMoneyMeaning>;
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
  const snapshot: ReportParagraph = { text: `사주에서는 ${copy.center}`, evidence: profileEvidence };
  const temperament: ReportParagraph = {
    text: copy.bridge,
    evidence: profileEvidence,
  };
  const decisionStyle: ReportParagraph = { text: copy.decision, evidence: profileEvidence };
  const lead: Item = { title: copy.strength, detail: copy.strengthDetail, evidence: profileEvidence };
  const supporting = editorial.natalEvidence.supporting.filter(group => counts[group] > 0);
  const strengths: Item[] = [lead, ...supporting.map(group => ({
    title: GROUP_LENS[group].title, detail: GROUP_LENS[group].strength,
    evidence: `해석 계획 ${editorial.id}; ${group} ${counts[group]}개. 한 그룹의 존재만으로 능력을 확정하지 않습니다.`,
  }))].slice(0, 3);
  const cautions: Item[] = [{ title: copy.cautionTitle, detail: copy.caution, evidence: profileEvidence },
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
  return { arcId: editorial.id, snapshot, money: buildSajuMoneyMeaning(editorial), temperament, decisionStyle, strengths, cautions,
    verdictLead: `${copy.verdict} ${strengthContext} 이는 실제 성격이나 행동을 확정한 말이 아닙니다.` };
}
