import { TEN_GOD_GROUP, type SajuFacts, type TenGodGroup } from "@/lib/saju-facts";
import type { SajuAnnualMonthOutlook } from "@/lib/saju-timing";
import { validateReadingPlan, type ReadingEvidence, type ReadingPlan } from "@/lib/reading-plan";
import { hasExpressionReturnEmphasis } from "@/lib/premium-natal-reading";

const COUNTS = {
  비겁: "peerStarCount", 식상: "outputStarCount", 재성: "wealthStarCount",
  관성: "officerStarCount", 인성: "resourceStarCount",
} as const;
const LABEL: Record<TenGodGroup, string> = {
  비겁: "스스로 정하고 움직이는 힘", 식상: "생각을 표현하고 결과로 만드는 힘",
  재성: "노력과 보상을 연결하는 감각", 관성: "역할과 약속을 지키려는 태도", 인성: "이해하고 준비하려는 태도",
};
const AREAS = { year: "익숙한 관계와 환경", month: "사회생활과 일", day: "가까운 사람과의 관계", hour: "일을 마무리하는 과정" } as const;

/** Reading plans use actual relations between natal and monthly signals.
 * No birth-date hash, synonym rotation, fortune score or model call is used.
 * Counts describe exposed ten-god positions, not measured human abilities. */
export function buildContextualMonthReading(facts: SajuFacts, month: SajuAnnualMonthOutlook): ReadingPlan {
  const signals = month.comparisons[0]?.signals;
  const groups = [...new Set(signals?.month ?? [])] as TenGodGroup[];
  const counts = Object.fromEntries(Object.entries(COUNTS).map(([key, field]) => [key, facts[field]])) as Record<TenGodGroup, number>;
  const leaders = (Object.keys(COUNTS) as TenGodGroup[]).filter(g => counts[g] === Math.max(...Object.values(counts)));
  const evidence: ReadingEvidence[] = [
    { id: "month", kind: "calculated", source: "annual.months[].comparisons[0].signals.month", value: groups.join("·") },
    { id: "calendar", kind: "calculated", source: "annual.months[].comparisons[0].basis", value: month.comparisons[0]?.basis ?? "" },
    { id: "strength", kind: "calculated", source: "facts.dayStrength + dayStrengthReliable", value: facts.dayStrengthReliable ? facts.dayStrength : null },
    ...Object.entries(COUNTS).map(([key, field]) => ({ id: key, kind: "calculated" as const, source: `facts.${field}`, value: facts[field] })),
  ];
  const plan: ReadingPlan = {
    headline: "이달의 주제를 구분할 계산 근거가 부족합니다",
    passages: [], evidence,
    limits: ["월별 주제와 원국의 관계를 생활에 대입한 전통적 해석입니다. 실제 사건이나 성격을 검증한 결과가 아닙니다.", "매월 15일의 세운·월운을 사용하며 절기 경계와 기간 중 대운 전환은 정밀하게 반영하지 않습니다."],
  };
  if (!groups.length) {
    plan.passages.push({ id: "missing-month", kind: "observation", text: "이달의 해석 요소가 확인되지 않아 월별 성향이나 행동을 덧붙이지 않았습니다.", evidenceIds: ["month"] });
    validateReadingPlan(plan); return plan;
  }
  const add = (id: string, text: string, evidenceIds: string[], kind: "traditional" | "reflection" = "traditional") => plan.passages.push({ id, text, evidenceIds: ["month", ...evidenceIds], kind });
  // Joint signals take precedence: a month is a relationship between topics,
  // not a concatenation of two independent dictionary definitions.
  if (groups.includes("식상") && groups.includes("재성")) {
    plan.headline = "만든 것을 보여주는 일과 보상 조건을 함께 읽는 달";
    if (hasExpressionReturnEmphasis(facts) && facts.dayStrengthReliable && facts.dayStrength === "weak") {
      plan.headline = "펼친 가능성 중 내 몫과 지원이 맞는 일을 깊게 잇는 구간";
      add("output-return-with-support", "이미 원국에서도 표현과 성과에 관심이 함께 놓여 있습니다. 이 시기는 새로운 표현을 처음 시작하는 달보다, 펼쳐둔 가능성 중 자신이 맡을 몫과 지원이 맞는 일을 골라 깊게 연결하는 구간으로 읽습니다. 반응이 좋은 일을 모두 이어가는 것과, 도움을 받으며 자신의 결과로 마무리할 수 있는 일은 다를 수 있습니다.", ["식상", "재성", "비겁", "관성", "인성", "strength"]);
    } else if (counts.재성 === 0) {
      plan.headline = "준비한 생각을 상대가 필요로 하는 결과로 꺼내는 구간";
      add("output-to-unfamiliar-return", "이번 달은 잘해낸 일과 그 일에 어떤 대가를 바라는지를 함께 살피는 쪽으로 읽습니다. 원국에서 성과와 보상을 직접 뜻하는 요소는 드러난 글자에 잡히지 않지만, 이달에는 표현과 보상의 주제가 함께 들어옵니다. 돈을 못 다룬다는 뜻이 아니라, 익숙한 역할을 성실히 해내는 것만으로 조건까지 정해졌다고 넘기지 말자는 해석입니다.", ["재성", "식상"]);
    } else if (hasExpressionReturnEmphasis(facts)) {
      add("output-return-already-present", "평소의 풀이에서도 생각을 결과로 만들고 그 쓰임을 확인하는 쪽이 두드러집니다. 이번 달에는 표현과 보상의 주제가 함께 겹쳐, 일을 더 벌이는 것보다 이미 만든 것을 어떤 조건으로 이어갈지에 초점을 둡니다. 반응이 좋았다는 사실과 서로 만족할 거래가 됐다는 사실을 나누어 보는 달로 읽을 수 있습니다.", ["식상", "재성", "비겁", "관성", "인성"]);
    } else if (leaders.includes("관성") && counts.관성 > Math.max(counts.식상, counts.재성)) {
      plan.headline = "맡아 해낸 일을 보이는 결과와 조건으로 연결하는 구간";
      add("duty-to-return", "맡은 역할을 충실히 해내는 태도에 비해, 이번 달의 주제는 내가 만든 결과를 밖에 보이고 보상과 연결하는 쪽으로 옮겨갑니다. 조용히 잘해내는 것만으로 충분했던 일인지, 기여와 조건을 직접 설명해야 하는 일인지 살펴볼 만합니다.", ["관성", "식상", "재성"]);
    } else if (counts.식상 === 0) {
      add("judgment-to-expression", "원국에서는 결과의 쓰임을 살피는 요소에 비해 생각을 밖으로 표현하는 요소가 적게 드러납니다. 이달에는 판단한 가치를 상대가 이해할 수 있게 보여주는 과정에 초점을 둡니다. 스스로 좋은 선택이라고 납득하는 것과, 다른 사람도 그 이유를 알아보고 함께하기로 정하는 일 사이를 연결해볼 수 있습니다.", ["식상", "재성"]);
    } else {
      add("output-return-in-context", `원국에서는 ‘${leaders.map(g => LABEL[g]).join(" · ")}’에 더 무게가 실립니다. 이달에는 생각을 밖에 보이는 과정과 그 결과의 쓰임을 함께 살펴봅니다. 평소 중요하게 여긴 기준이 상대에게도 전달되는지, 함께하는 일의 조건에 어떻게 반영되는지를 연결해볼 수 있습니다.`, ["식상", "재성", ...leaders]);
    }
    add("output-return-scene", "예를 들어 추가 작업을 부탁받았다면, 먼저 해준 뒤 인정받기를 기다리기보다 어디까지가 원래 약속이고 무엇이 새 요청인지 함께 확인해보세요. 결과물을 보여주는 일과 조건을 이야기하는 일을 같은 대화에서 다루는 방식입니다.", ["식상", "재성"], "reflection");
  } else if (groups.includes("인성")) {
    const repeated = leaders.includes("인성") && counts.인성 > 0;
    plan.headline = groups.includes("식상") ? "준비한 생각을 밖에 내보내는 경계" : repeated ? "준비의 장점이 결정을 늦추지 않도록 살피는 달" : "앞으로 움직일 힘에 이해와 지원을 더하는 달";
    if (repeated) {
      const context = counts.관성 > counts.식상
        ? "원국에서는 충분히 이해하려는 태도와 맡은 약속을 지키려는 태도가 함께 두드러집니다. 그래서 준비는 단순히 정보를 모으는 시간이 아니라, 나중에 책임질 수 있는 선택인지 확인하는 과정으로 읽힙니다. 이달에도 준비의 주제가 겹치면 꼼꼼함이 힘이 되지만, 이미 이해한 일에도 빈틈이 없다는 확신을 더 구하느라 답이 늦어질 수 있습니다."
        : counts.식상 > counts.관성 && counts.재성 > 0
          ? "원국에는 생각을 밖으로 표현하는 힘과 실제 쓰임을 확인하는 감각이 함께 있고, 이해와 준비의 비중도 작지 않습니다. 하고 싶은 일을 찾으면 움직이면서 배우는 쪽과 충분히 납득한 뒤 시작하고 싶은 쪽이 공존하는 모습입니다. 이달에는 그중 준비 쪽이 앞에 놓여, 새 일을 늘리기보다 시도해본 일이 있다면 그 반응에서 방향을 정리하는 흐름으로 볼 수 있습니다."
          : "원국에서 이미 두드러지는 이해와 준비의 태도가 이달의 주제와 겹칩니다. 충분히 이해한 뒤 움직이는 장점이 있는 한편, 새 정보가 생길 때마다 결정을 뒤로 미루는 장면도 함께 살펴볼 만합니다.";
      add("resource-reinforced", context, ["인성", "관성", "식상", "재성"]);
    } else {
      const dominant = leaders.map(g => LABEL[g]).join(" · ");
      add("resource-counterweight", `평소 풀이에서는 ${dominant}에 무게가 실립니다. 이번 달은 그 방향을 더 밀기보다, 선택을 뒷받침할 설명과 도움을 확보하는 쪽에 초점을 둡니다. 진행이 더딘 달이라는 뜻이 아니라, 이해하지 못한 조건을 남긴 채 속도만 높이지 말자는 해석입니다.`, ["인성", ...leaders]);
    }
    if (groups.includes("식상")) add("resource-expression-tension", "다만 준비만을 뜻하는 달은 아닙니다. 생각을 밖으로 드러내는 주제도 함께 있어, 자료를 더 쌓는 일과 작은 결과를 보여주는 일 사이의 균형이 중요해집니다. 완성될 때까지 설명을 미루기보다 지금 확인받을 수 있는 부분부터 꺼내는 장면으로 읽습니다.", ["식상", "인성"]);
    if (groups.includes("비겁")) add("resource-peer-tension", "스스로 결정하려는 주제도 함께 들어옵니다. 조언을 많이 듣는 것과 결정을 남에게 맡기는 것은 구분할 필요가 있습니다. 도움을 받더라도 마지막에 무엇을 기준으로 고를지는 자신의 말로 정리하는 쪽에 의미를 둡니다.", ["비겁", "인성"]);
    if (groups.includes("관성")) add("resource-duty-tension", "여기에 역할과 약속의 주제가 겹칩니다. 충분히 알고 시작하고 싶은 마음과 정해진 때에 답해야 하는 상황이 함께 놓인 모습입니다. 아직 모르는 조건이 무엇인지 상대에게 설명하면, 준비 부족을 숨기느라 혼자 책임을 늘리는 일을 줄이는 데 도움이 될 수 있습니다.", ["관성", "인성"]);
    if (groups.includes("재성")) add("resource-return-tension", "보상과 실제 쓰임의 주제도 함께 있습니다. 더 배우는 선택이 지금 필요한 일을 해결하는지, 준비 과정 자체가 목적이 됐는지를 나누어 읽습니다.", ["재성", "인성"]);
    add("resource-scene", repeated ? "이미 충분히 알아본 제안 앞에서 망설인다면, 결정을 바꿀 만큼 중요한 미확인 조건이 남았는지 짚어보세요. 남아 있다면 그 부분을 묻고, 없다면 지금 가진 정보로 감당할 수 있는 범위를 정해보는 편입니다." : "새 역할이나 제안을 검토한다면, 방법을 혼자 완성하려 하기 전에 그 일을 해본 사람에게 막히는 지점 하나를 설명해보세요. 어떤 도움이 필요한지 말로 정리하는 과정까지 준비의 일부로 봅니다.", ["인성"], "reflection");
  } else {
    const lead = groups.includes("관성") ? "관성" : groups.includes("식상") ? "식상" : groups.includes("재성") ? "재성" : "비겁";
    const reinforced = leaders.includes(lead) && counts[lead] > 0;
    const copies = {
      관성: { title: "책임을 맡는 일과 맡을 범위를 함께 살피는 달", repeated: "원국에서도 역할과 약속의 비중이 큰데 이달에 같은 주제가 겹칩니다. 더 많은 일을 맡는 것을 곧바로 신뢰의 증거로 받아들이기보다, 이미 맡은 몫을 지속할 여지가 있는지 살펴보는 달로 읽습니다.", different: "평소 중심이 되는 성향과 별개로 이달에는 역할과 약속이 해석의 앞에 놓입니다. 내 방식대로 잘해내는 것만큼, 함께 일하는 사람이 무엇을 완료로 보는지를 확인하는 장면에 초점을 둡니다.", scene: "새 책임이 생겼다면 해야 할 일뿐 아니라 스스로 결정할 수 있는 범위도 이야기해보세요. 기대에 맞추느라 권한 없이 책임만 늘어나는 상황인지 구별하는 데 도움이 됩니다." },
      식상: { title: "생각을 전하는 방식에서 차이를 만드는 달", repeated: "원국의 표현과 실행 성향에 이달의 같은 주제가 겹칩니다. 새 생각을 더하는 것보다 이미 꺼낸 제안을 상대가 어떻게 받아들였는지 듣는 쪽에 초점을 둡니다. 말한 양과 전달된 양이 같지는 않다는 점을 함께 읽습니다.", different: "평소 익숙한 방식에 비해 이달은 생각을 밖에 드러내는 일이 해석의 앞에 놓입니다. 준비하거나 맡은 일을 조용히 해내는 데 머물렀다면, 어떤 판단을 했고 무엇이 필요한지 설명하는 장면을 떠올려볼 수 있습니다.", scene: "의견이 다른 상대에게 새 방법을 제안한다면, 결론을 반복하기보다 무엇이 달라지는지 작은 예를 보여주세요. 상대가 납득한 부분과 더 설명이 필요한 부분을 나누는 대화가 어울립니다." },
      재성: { title: "선택의 매력과 실제 감당할 조건을 함께 보는 달", repeated: "원국에서도 성과와 쓰임을 살피는 요소가 두드러지고 이달에도 같은 주제가 겹칩니다. 결과를 빨리 확인하려는 마음이 있다면, 얻을 것에 비해 시간과 관계의 부담을 작게 잡고 있지는 않은지 함께 읽어볼 만합니다.", different: "이번 달은 평소의 장점을 어떤 결과와 조건으로 연결할지에 초점을 둡니다. 잘할 수 있다는 판단과 그 일을 어떤 대가로 맡을지는 서로 다른 질문입니다. 능력을 인정받기 위해 조건 이야기를 뒤로 미루는 장면이 있는지 살펴봅니다.", scene: "매력적인 제안이라도 얼마를 얻는지와 얼마나 오래 관여해야 하는지를 함께 확인해보세요." },
      비겁: { title: "내가 정할 일과 함께 정할 일의 경계를 보는 달", repeated: "스스로 방향을 잡으려는 원국의 성향에 이달의 같은 주제가 겹칩니다. 주도권을 갖는 장점이 상대의 선택까지 대신 정하는 모습으로 이어지지 않는지 살펴볼 만합니다. 더 밀어붙이는 달로만 읽지는 않습니다.", different: "이번 달은 도움을 받거나 정해진 역할을 따르는 일에서 한 걸음 나와, 자신의 선택을 설명하는 쪽에 초점을 둡니다. 혼자 해야 한다는 뜻보다, 함께하는 일에서도 내가 원하는 조건을 분명히 하는 장면으로 읽습니다.", scene: "공동으로 진행하는 일이 있다면 혼자 결정해도 되는 부분과 함께 동의해야 하는 부분을 나누어보세요. 속도를 내면서도 상대가 참여할 여지를 남기는 방식입니다." },
    };
    const copy = copies[lead];
    plan.headline = copy.title;
    add(`${lead}-${reinforced ? "reinforced" : "contrast"}`, copy[reinforced ? "repeated" : "different"], [lead, ...leaders]);
    const other = groups.find(g => g !== lead);
    if (other) add("second-month-theme", `이달에는 ${LABEL[other]}도 함께 주제로 들어옵니다. ${other === "재성" ? "맡을 역할을 정할 때 보상이나 필요한 자원을 별개의 문제로 남기지 않는 쪽으로 읽습니다." : "자기 생각을 내는 일과 함께 정할 몫을 구분하는 쪽으로 읽습니다."}`, [other, lead]);
    add("month-scene", copy.scene, [lead], "reflection");
  }
  // Strength changes the reflection, not a probability or health assertion.
  if (facts.dayStrengthReliable) {
    add("strength-context", facts.dayStrength === "strong"
      ? "자기 기준을 지키는 쪽으로 읽히는 원국이므로, 선택을 굳힐 때에는 내 생각을 지지하는 이야기뿐 아니라 바꿀 만한 이유도 들을 자리를 남겨보세요. 이번 달의 주제를 자신의 확신만 강화하는 데 쓰지 않기 위한 보완입니다."
      : facts.dayStrength === "weak"
        ? "사람이나 환경의 도움을 함께 볼 때 균형을 찾는 원국으로 읽힙니다. 사람의 설명이나 역할을 나눌 조건이 갖춰질 때, 이달의 주제가 본인의 선택으로 이어지기 쉬운 모습입니다."
        : "자기 뜻과 주변 조건을 함께 살피는 원국으로 읽힙니다. 이달의 주제에서도 밀고 갈 부분과 조정할 부분을 미리 나누어두면 어느 한쪽에만 맞추려는 부담을 덜 수 있습니다.", ["strength"], "reflection");
  } else plan.limits.push("출생시간을 몰라 강약을 이용한 보완과 대운 배경을 생략했습니다.");
  const areaGroup = [...groups].sort().find(g => counts[g] > 0);
  if (areaGroup) {
    const positions = facts.pillars.filter(p => TEN_GOD_GROUP[p.stemTenGod] === areaGroup || TEN_GOD_GROUP[p.branchTenGod] === areaGroup);
    const position = positions.find(p => p.pillar === "month") ?? positions.find(p => p.pillar === "day") ?? positions[0];
    if (position) {
      evidence.push({ id: "position", kind: "calculated", source: `facts.pillars.${position.pillar}`, value: `${position.ganzhi}:${position.stemTenGod}/${position.branchTenGod}` });
      add("natal-position", `이 주제는 원국의 자리로 보면 ${AREAS[position.pillar]}에도 연결됩니다. ${position.pillar === "day" ? "가까운 사람과 결정할 일이 있다면, 혼자 충분히 생각했다는 것과 상대에게 그 과정이 전해졌다는 것을 나누어 살펴보세요." : position.pillar === "month" ? "일에서는 자신의 판단만 정리하기보다 함께 일하는 사람이 기대하는 바와 비교하는 데 이 풀이를 써볼 수 있습니다." : "특정 사건이 생긴다는 뜻보다, 반복해서 마주치는 이 영역의 선택을 돌아보는 참고로 삼아주세요."}`, [areaGroup, "position"], "reflection");
    }
  }
  if (facts.hasTimeInput && facts.currentDaeun) {
    const daeun = facts.currentDaeun;
    const background = [...new Set([TEN_GOD_GROUP[daeun.stemTenGod], TEN_GOD_GROUP[daeun.branchTenGod]].filter(Boolean))];
    evidence.push({ id: "daeun", kind: "calculated", source: "facts.currentDaeun", value: `${daeun.ganzhi}:${daeun.stemTenGod}/${daeun.branchTenGod}` });
    // Only authored, explainable combinations add a period-level paragraph.
    // Other backgrounds remain once in the annual introduction, never a
    // generic "direction versus preparation" paragraph for every combination.
    if (background.includes("재성") && groups.includes("식상") && groups.includes("재성")) {
      add("daeun-context", "현재 대운에서 읽는 결과와 보상의 관심에, 이 구간의 표현 주제가 더해집니다. 생각하거나 준비한 내용을 상대가 살펴볼 수 있게 보여주고, 그 쓰임과 조건을 함께 이야기하는 연결로 읽을 수 있습니다.", ["daeun", "식상", "재성"]);
    } else if (background.includes("재성") && groups.includes("관성") && groups.includes("재성")) {
      add("daeun-context", "현재 대운의 보상 주제가 이 구간에서는 역할과 약속을 통해 구체화되는 모습으로 읽힙니다. 맡을 책임이 달라진다면 필요한 자원과 돌아오는 대가도 함께 정해져 있는지 살펴보는 연결입니다.", ["daeun", "관성", "재성"]);
    } else if (background.includes("재성") && background.includes("비겁") && groups.includes("인성") && counts.인성 > 0 && counts.관성 > 0) {
      add("daeun-context", "현재 대운에는 자기 기준으로 맡을 몫을 정하는 주제와 결과·보상을 살피는 주제가 함께 놓입니다. 여기에 이달의 준비와 이해가 더해지면, 어떤 일을 어떤 조건으로 맡을지 판단 기준을 구체화하는 과정으로 볼 수 있습니다. 충분히 이해한 일에 책임을 다하려는 성향이 실제 역할과 보상에 어떻게 이어지는지가 이 구간의 연결점입니다.", ["daeun", "인성", "관성"]);
    } else if (background.includes("관성") && groups.includes("관성")) {
      add("daeun-context", "현재 대운에서 맡은 역할과 지켜야 할 약속이 이달의 관계 주제와 만납니다. 잘해내는 것만으로 끝내지 않고, 누가 무엇을 언제까지 맡을지 말로 정하는 장면으로 읽습니다.", ["daeun", "관성"]);
    } else if (background.includes("비겁") && groups.includes("비겁")) {
      add("daeun-context", "현재 대운에서 자기 몫과 선택을 정하는 주제가 이달의 관계 주제와 만납니다. 함께 움직이더라도 내가 결정할 부분과 상대와 합의할 부분을 나누는 장면으로 읽습니다.", ["daeun", "비겁"]);
    }
  }
  validateReadingPlan(plan);
  return plan;
}
