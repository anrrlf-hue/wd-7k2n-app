import { TEN_GOD_GROUP, type PillarFact, type SajuFacts, type TenGodGroup } from "@/lib/saju-facts";
import { describeAnnualMonthSymbols, type AnnualMonthSymbols, type SajuAnnualMonthOutlook } from "@/lib/saju-timing";
import { buildContextualMonthReading } from "@/lib/premium-context-reading";
import { validateReadingPlan, type ReadingPlan } from "@/lib/reading-plan";
import { eulReul, gwaWa, iGa } from "@/lib/korean-particle";

type SymbolMeaning = { subject: string; proposal: string; condition: string; result: string };
// These are parts of a decision, not ready-made monthly scenes.
const MEANING: Record<string, SymbolMeaning> = {
  비견: { subject: "자기 판단", proposal: "스스로 고른 방향", condition: "내가 직접 시험할 한 부분", result: "직접 시험할 선택의 크기" },
  겁재: { subject: "함께 나눌 몫", proposal: "함께 진행할 방식", condition: "함께 쓸 자료와 담당 몫", result: "각자가 맡을 자료와 일의 범위" },
  식신: { subject: "이어 만들 결과", proposal: "반복 가능한 결과", condition: "계속 보여줄 수 있는 작은 결과", result: "반복할 수 있는 결과의 기준" },
  상관: { subject: "고쳐 표현할 결과", proposal: "기존 방식을 고친 설명", condition: "바뀐 이유를 보일 구체적 예", result: "상대가 확인할 수 있는 수정의 이유" },
  편재: { subject: "열린 쓰임과 자원", proposal: "열린 쓰임의 가능성", condition: "가능성별로 들일 자원", result: "시도할 쓰임과 감당할 자원의 범위" },
  정재: { subject: "유지할 교환 조건", proposal: "지속할 수 있는 쓰임", condition: "계속 지킬 교환 조건", result: "반복해도 감당할 수 있는 조건" },
  편관: { subject: "새 요구와 책임", proposal: "새로 들어온 요구", condition: "새 요구를 감당할 권한과 지원", result: "맡을 수 있는 요구의 범위" },
  정관: { subject: "약속한 역할", proposal: "이미 정해진 역할", condition: "이미 약속한 범위와 기준", result: "지킬 약속과 새로 합의할 부분" },
  편인: { subject: "다른 관점의 검토", proposal: "익숙한 설명과 다른 관점", condition: "기존 방식이 놓친 문제", result: "선택을 바꿀 만한 새 근거" },
  정인: { subject: "확인된 설명과 도움", proposal: "검증해 익힌 설명과 도움", condition: "확인된 자료와 필요한 도움", result: "설명과 지원의 확인 범위" },
};
const PILLAR_LABEL: Record<PillarFact["pillar"], string> = { year: "연", month: "월", day: "일", hour: "시" };
const AREA: Record<PillarFact["pillar"], Record<TenGodGroup, string>> = {
  year: {
    비겁: "오래 알고 지낸 사람들과 각자 원하는 주말을 이야기할 때",
    식상: "익숙한 모임에서 새로 해 본 것을 나누려 할 때",
    재성: "여럿이 함께 쓰는 비용이나 물건을 고를 때",
    관성: "가족이나 익숙한 사람의 부탁과 내 일정이 겹칠 때",
    인성: "늘 듣던 조언을 지금 생활에 써 보려 할 때",
  },
  month: {
    비겁: "일에서 내가 편하게 하던 방법을 다른 사람도 쓰게 할 때",
    식상: "공들인 결과를 처음 다른 사람에게 보여 줄 때",
    재성: "하던 일의 대가나 준비 비용을 다시 말할 때",
    관성: "마무리하던 일에 새 부탁이 더해질 때",
    인성: "배운 방법을 실제 업무에서 처음 써 볼 때",
  },
  day: {
    비겁: "가까운 사람과 쉬는 날을 어떻게 보낼지 이야기할 때",
    식상: "가까운 사람에게 기뻤던 소식이나 새 생각을 말할 때",
    재성: "함께 살 물건을 고르며 각자 쓸 장면을 떠올릴 때",
    관성: "만남을 기다렸는데 서로의 일정이 달라졌을 때",
    인성: "가까운 사람의 고민을 듣고 어떻게 도울지 생각할 때",
  },
  hour: {
    비겁: "혼자 마음에 두었던 일을 작은 규모로 시작할 때",
    식상: "취미로 만들던 것을 끝내고 누군가에게 보여 줄 때",
    재성: "앞으로 하고 싶은 일에 필요한 비용을 마련할 때",
    관성: "오늘 끝내려던 일과 새로 해 보고 싶은 일이 겹칠 때",
    인성: "관심 있던 내용을 배운 뒤 직접 해 보려 할 때",
  },
};
function group(god: string | null): TenGodGroup | null { return god ? TEN_GOD_GROUP[god] ?? null : null; }
export function traditionalSymbolSubject(god: string | null): string {
  return MEANING[god ?? ""]?.subject ?? "확인되지 않은 주제";
}
function natalAnchor(facts: SajuFacts, stem: string, branch: string) {
  const candidates = facts.pillars.filter(p => facts.hasTimeInput || p.pillar !== "hour");
  // Exact correspondence outranks a broad match. Check the branch first so
  // a changed condition can select a different confirmed position.
  for (const exact of [true, false]) for (const wanted of [stem, branch]) {
    for (const pillar of candidates) for (const part of ["stem", "branch"] as const) {
      const god = pillar[`${part}TenGod`];
      if (exact ? god === wanted : group(god) === group(wanted)) return { pillar, part, god, exact };
    }
  }
  return null;
}
type YearFrame = { setting: string; gate: string; target: string };
function yearFrame(symbols: AnnualMonthSymbols): YearFrame {
  const groups = [symbols.year.stemTenGod, symbols.year.branchTenGod].map(group);
  if (groups.includes("관성") && groups.includes("인성")) return {
    setting: "이미 맡은 일에 새 설명이나 요구가 붙는다면", gate: "역할의 기준과 필요한 자료·지원을 먼저 확인한 뒤", target: "맡을 범위",
  };
  if (groups.includes("식상") && groups.includes("재성")) return {
    setting: "만든 결과의 쓰임을 고르려 한다면", gate: "보여줄 결과와 실제 들일 자원을 함께 비교한 뒤", target: "결과의 쓰임",
  };
  if (groups.includes("관성")) return {
    setting: "이미 맡은 일에 다른 방법을 적용하려 한다면", gate: "기존 약속에서 놓친 문제와 결정 권한을 먼저 확인한 뒤", target: "약속한 역할",
  };
  if (groups.includes("식상")) return {
    setting: "만든 것을 다른 사람에게 설명하려 한다면", gate: "보여줄 작은 결과와 아직 설명할 부분을 나눈 뒤", target: "밖에 보일 결과",
  };
  if (groups.includes("재성")) return {
    setting: "선택 가능한 쓰임이 여럿 보인다면", gate: "가능성마다 실제 들일 자원과 교환 조건을 적은 뒤", target: "감당할 쓰임",
  };
  if (groups.includes("인성")) return {
    setting: "새 설명을 판단에 적용하려 한다면", gate: "확인된 자료와 아직 필요한 도움을 구분한 뒤", target: "판단의 근거",
  };
  return { setting: "함께 정할 일이 생긴다면", gate: "누가 결정하고 누가 실행할지 나눈 뒤", target: "선택의 범위" };
}
// Pair rules describe one decision unit, never a complete scene or prediction.
const RELATION: Record<string, string> = {
  "비겁|식상": "스스로 고른 방향을 남이 볼 수 있는 결과로 옮기는 일",
  "비겁|재성": "자신의 몫을 실제 투입과 분배 조건에 맞추는 일",
  "비겁|관성": "맡은 역할 안에서 누가 무엇을 정할지 가르는 일",
  "비겁|인성": "들은 설명 중 책임지고 시험할 부분을 고르는 일",
  "식상|재성": "만든 결과의 쓰임과 교환 조건을 함께 정하는 일",
  "식상|관성": "보여줄 결과를 약속한 기준에 담는 일",
  "식상|인성": "이해한 내용을 확인 가능한 결과로 옮기는 일",
  "재성|관성": "선택할 자원을 맡을 책임의 범위에 맞추는 일",
  "재성|인성": "쓰임이나 조건을 정하기 전에 근거를 확인하는 일",
  "관성|인성": "맡을 역할에 필요한 설명과 지원을 확인하는 일",
};
function decisionUnit(stem: string, branch: string): string {
  if (stem === branch) return `${MEANING[stem].condition}${eulReul(MEANING[stem].condition)} 한 번 확인하는 일`;
  const a = group(stem), b = group(branch);
  if (a === b) return `${MEANING[stem].proposal}${eulReul(MEANING[stem].proposal)} ${MEANING[branch].condition}에 맞추는 일`;
  return RELATION[`${a}|${b}`] ?? RELATION[`${b}|${a}`]
    ?? `${MEANING[stem].proposal}${eulReul(MEANING[stem].proposal)} ${MEANING[branch].condition}에 연결하는 일`;
}
type PlannedDecision = { headline: string; action: string; check: string; consequence: string };
function planDecision(stem: string, branch: string, frame: YearFrame): PlannedDecision {
  const a = group(stem), b = group(branch);
  const proposal = MEANING[stem].proposal, condition = MEANING[branch].condition;
  const fallback = {
    headline: decisionUnit(stem, branch).replace(/ 일$/, " 판단"),
    action: `${proposal}${eulReul(proposal)} ${condition}에 연결할 범위를 좁혀봅니다.`,
    check: `${condition}${eulReul(condition)} 확인해 실제로 ${frame.target}${eulReul(frame.target)} 바꿀 만한지 살핍니다.`,
    consequence: `이때 ${MEANING[branch].result}${eulReul(MEANING[branch].result)} 말로 정리해볼 수 있습니다.`,
  };
  if (stem === branch) {
    if (a === "인성") return { headline: "새 설명이 기존 판단을 바꿀 근거인가", action: `${proposal}${iGa(proposal)} 기존 방식에서 놓친 문제를 실제로 설명하는지 한 번만 확인합니다.`, check: `새로움 자체가 아니라 ${frame.target}${eulReul(frame.target)} 바꿀 이유가 남는지 살펴봅니다.`, consequence: "새 설명을 적용할 범위를 정하고 기존 방식과 비교해볼 수 있습니다." };
    if (a === "재성") return { headline: "가능한 쓰임과 감당할 자원을 함께 보기", action: `${proposal}마다 실제로 필요한 자원을 나눠 적어봅니다.`, check: `반응이 크다는 이유만으로 ${frame.target}${eulReul(frame.target)} 넓히지 않습니다.`, consequence: "가능성의 수보다 먼저 감당할 수 있는 시도 범위를 정합니다." };
    return { ...fallback, headline: `${MEANING[stem].subject}${eulReul(MEANING[stem].subject)} 한 판단으로 모으기` };
  }
  if (a === b) {
    if (a === "관성") return { headline: "새 요구를 기존 약속과 맞추기", action: `${proposal}${iGa(proposal)} ${condition} 안에 들어오는지 가려봅니다.`, check: `새로 합의할 일과 이미 맡은 일을 구분합니다.`, consequence: "요구가 생긴다는 예고가 아니라 책임을 판단하는 순서입니다." };
    if (a === "식상") return { headline: "고친 설명을 반복할 결과로 만들기", action: `${proposal}에서 남이 확인할 수 있는 한 부분을 골라봅니다.`, check: `${condition}${eulReul(condition)} 통해 방법이 분명한지 살핍니다.`, consequence: "한 번의 표현과 계속 만들 수 있는 결과를 구분하는 데 씁니다." };
    return { ...fallback, headline: `${MEANING[stem].subject}에서 ${MEANING[branch].subject} 쪽으로 좁히기` };
  }
  const has = (g: TenGodGroup) => a === g || b === g;
  if (has("인성") && has("비겁")) {
    const peer = a === "비겁" ? stem : branch;
    return peer === "비견"
      ? { headline: "들은 설명을 내 작은 시험으로 옮기기", action: `${a === "인성" ? proposal : condition} 가운데 스스로 결정할 한 부분을 고릅니다.`, check: `기존 방식과 같은 기준으로 시험해 ${frame.target}에 미치는 차이를 살핍니다.`, consequence: "개인 판단을 먼저 시험하는 단계이며, 다른 사람의 몫까지 정했다는 뜻은 아닙니다." }
      : a === "비겁"
        ? { headline: "함께할 일을 정하기 전에 설명 맞추기", action: `${proposal}${eulReul(proposal)} 먼저 제안했다면, 각자가 같은 조건을 이해했는지 확인합니다.`, check: `필요한 자료나 도움이 비어 있으면 담당을 확정하기 전에 그 부분부터 맞춥니다.`, consequence: "함께하겠다는 뜻과 실제로 시작할 준비가 갖춰졌다는 판단을 구분합니다." }
        : { headline: "확인한 설명을 함께 쓸 조건으로 옮기기", action: `${proposal}${eulReul(proposal)} 공동으로 적용할 한 부분을 고릅니다.`, check: `누가 자료를 갖고 어떤 부분을 실행·확인할지 나눕니다.`, consequence: "설명에 동의한 것과 함께 이어갈 담당·확인 기준을 정한 것은 다를 수 있습니다." };
  }
  if (has("인성") && has("식상")) return { headline: "이해한 것을 확인 가능한 결과로 옮기기", action: `${proposal} 가운데 남에게 보여줄 한 부분을 고릅니다.`, check: `${condition}${eulReul(condition)} 통해 실제로 확인되는지 살핍니다.`, consequence: "설명을 더 모으는 일과 작은 결과로 시험하는 일을 구분합니다." };
  if (has("인성") && has("재성")) return { headline: (a === "재성" ? stem : branch) === "정재" ? "지속할 쓰임의 근거 다시 확인하기" : "가능성을 좁히기 전에 다른 설명 점검하기", action: `${proposal}에 바로 자원을 두기보다 판단을 바꿀 설명이 있는지 확인합니다.`, check: `${condition}${gwaWa(condition)} 실제 교환 조건을 따로 적어봅니다.`, consequence: "가능성이 크다는 인상과 확인된 쓰임을 나누어 볼 수 있습니다." };
  if (has("인성") && has("관성")) return { headline: (a === "관성" ? stem : branch) === "편관" ? "낯선 요구에 필요한 설명과 지원 확인하기" : "기존 역할에 필요한 자료와 지원 확인하기", action: `${proposal}${eulReul(proposal)} 받아들이기 전에 ${condition}${eulReul(condition)} 확인합니다.`, check: `설명이 부족한 부분은 약속의 범위에서 따로 협의합니다.`, consequence: "준비와 책임을 한 사람이 모두 떠맡는지 돌아볼 수 있습니다." };
  if (has("비겁") && has("식상")) {
    const peer = a === "비겁" ? stem : branch;
    const output = a === "식상" ? stem : branch;
    if (peer === "비견" && output === "식신") return { headline: "내 판단을 반복할 작은 결과로 보여주기", action: `${proposal}에서 스스로 결정할 한 부분을 작은 결과로 만들어봅니다.`, check: `${condition}${iGa(condition)} 같은 방식으로 다시 만들어지는지 확인합니다.`, consequence: "혼자 납득한 선택과 남도 살펴볼 수 있는 결과를 구분합니다." };
    if (peer === "겁재" && output === "상관") return { headline: "함께 고친 방식을 확인할 예로 설명하기", action: `${proposal}에서 각자 고칠 부분을 나누고 바뀐 이유를 한 예에 담습니다.`, check: `${condition}${iGa(condition)} 함께한 사람에게도 같은 뜻인지 확인합니다.`, consequence: "개인 선택을 보여주는 단계에서 공동으로 고친 이유를 합의하는 단계로 옮깁니다." };
    if (peer === "비견") return { headline: "내 판단을 고친 설명으로 내놓기", action: `${proposal}에서 직접 고칠 한 부분을 고르고 바뀐 이유를 설명합니다.`, check: `${condition}${iGa(condition)} 다른 사람에게도 보이는지 살핍니다.`, consequence: "스스로 결정한 일과 상대가 수정 이유를 이해한 일은 다를 수 있습니다." };
    if (output === "식신") return { headline: "함께할 몫을 반복 가능한 결과로 나누기", action: `${proposal}에서 각자가 이어 만들 부분을 나눕니다.`, check: `${condition}${iGa(condition)} 함께한 사람에게도 같은 크기인지 살핍니다.`, consequence: "협력의 범위와 꾸준히 낼 수 있는 결과를 함께 정해봅니다." };
    return { headline: "누가 결정하고 무엇을 보여줄지 나누기", action: `${proposal}에서 직접 정할 부분과 보여줄 결과를 나눕니다.`, check: `${condition}${iGa(condition)} 다른 사람에게도 확인되는지 살핍니다.`, consequence: "내 판단을 설명하는 일과 타인의 동의를 얻는 일을 구분합니다." };
  }
  if (has("비겁") && has("재성")) return { headline: "내 몫을 실제 투입 조건에 맞추기", action: `${proposal}${eulReul(proposal)} 맡을 때 각자가 들일 자원과 가져갈 몫을 적어봅니다.`, check: `${condition}${eulReul(condition)} 감당할 수 있는지 확인합니다.`, consequence: "좋아 보이는 선택과 책임질 수 있는 선택을 분리합니다." };
  if (has("비겁") && has("관성")) return { headline: "맡은 역할 안에서 결정권 나누기", action: `${proposal} 중 스스로 정할 범위와 합의할 범위를 가릅니다.`, check: `${condition}에 어긋나지 않는지 확인합니다.`, consequence: "책임을 맡는 것과 모든 결정을 혼자 하는 것을 구분합니다." };
  if (has("식상") && has("재성")) {
    const output = a === "식상" ? stem : branch;
    return output === "식신"
      ? { headline: "반복 가능한 결과에서 새로운 쓰임 고르기", action: `${proposal}${eulReul(proposal)} 한 번 더 만들 수 있는 크기로 정한 뒤 쓰임을 비교합니다.`, check: `${condition}${eulReul(condition)} 실제로 감당할 수 있는지 확인합니다.`, consequence: "시도할 쓰임을 고르는 일과 이미 정해진 보상을 기대하는 일을 구분합니다." }
      : { headline: "고친 설명을 지속할 조건으로 바꾸기", action: `${proposal}에서 무엇이 달라졌는지 상대가 볼 수 있는 예로 설명합니다.`, check: `${condition}${eulReul(condition)} 새 작업의 범위와 함께 다시 합의합니다.`, consequence: "수정이 좋은 반응을 얻는 것과 그 일을 같은 조건으로 이어가는 것은 다를 수 있습니다." };
  }
  if (has("식상") && has("관성")) return { headline: "보여준 결과를 역할 기준에 담기", action: `${proposal}${iGa(proposal)} 약속한 역할의 어느 부분을 바꾸는지 살핍니다.`, check: `${condition}${eulReul(condition)} 넘는 부분은 새로 협의합니다.`, consequence: "잘해낸 결과가 곧 무제한 책임이 되지 않도록 범위를 정합니다." };
  if (has("재성") && has("관성")) {
    const wealth = a === "재성" ? stem : branch;
    const officer = a === "관성" ? stem : branch;
    return wealth === "편재"
      ? { headline: "여러 쓰임 중 새 요구를 감당할 수 있는가", action: `${proposal}${eulReul(proposal)} 고를 때 새로 맡을 책임과 필요한 자원을 한 장에 적습니다.`, check: `${condition}${eulReul(condition)} 확보하지 못한 가능성은 시험 범위로만 남깁니다.`, consequence: "선택지가 늘었다는 사실과 실제 맡을 수 있는 범위를 구분합니다." }
      : { headline: a === "관성" ? "맡은 역할에서 지속할 쓰임의 조건 확인하기" : officer === "편관" ? "지속할 쓰임에 새 요구가 붙을 때" : "지속할 쓰임을 기존 약속 안에 둘 수 있는가", action: `${proposal}${eulReul(proposal)} 이어갈 때 이미 지키기로 한 역할부터 확인합니다.`, check: `${condition}${eulReul(condition)} 넘어서는 반복 비용이나 요청은 다시 합의합니다.`, consequence: a === "관성" ? "역할을 먼저 살핀 뒤 그 책임 안에서 유지할 쓰임이 무엇인지 좁혀봅니다." : "한 번의 선택보다 계속 지킬 조건이 무엇인지 분명히 할 수 있습니다." };
  }
  return fallback;
}
/** Plan a decision from the relation, confirmed natal area and annual
 * constraint before writing the scene. Unused calculations are not evidence. */
export function buildPremiumMonthNarrative(
  facts: SajuFacts, month: SajuAnnualMonthOutlook, previous: SajuAnnualMonthOutlook | null,
): { plan: ReadingPlan; symbols: AnnualMonthSymbols } {
  const base = buildContextualMonthReading(facts, month);
  const symbols = describeAnnualMonthSymbols(facts, month);
  const before = previous ? describeAnnualMonthSymbols(facts, previous) : null;
  const { stemTenGod: stem, branchTenGod: branch } = symbols.month;
  if (!stem || !branch || !MEANING[stem] || !MEANING[branch]) return { plan: base, symbols };
  const evidence: ReadingPlan["evidence"] = [
    { id: "month-stem", kind: "calculated", source: "monthly pillar stem compared with facts.dayStem", value: `${symbols.month.stem}:${stem}` },
    { id: "month-branch", kind: "calculated", source: "monthly branch main hidden stem compared with facts.dayStem", value: `${symbols.month.branch}:${branch}` },
    { id: "year-symbols", kind: "calculated", source: "annual pillar compared with facts.dayStem", value: `${symbols.year.ganzhi}:${symbols.year.stemTenGod ?? "미확인"}/${symbols.year.branchTenGod ?? "미확인"}` },
  ];
  const passages: ReadingPlan["passages"] = [];
  const add = (id: string, value: string, ids: string[], kind: "traditional" | "reflection" = "traditional") =>
    passages.push({ id, text: value, evidenceIds: ids, kind });
  const anchor = natalAnchor(facts, stem, branch);
  let anchorLabel = "", anchorScene = "일상에서";
  if (anchor) {
    const { pillar, part, god } = anchor;
    anchorLabel = `${PILLAR_LABEL[pillar.pillar]}${part === "stem" ? "간" : "지"} ${Array.from(pillar.ganzhi)[part === "stem" ? 0 : 1]}/${god}`;
    anchorScene = AREA[pillar.pillar][group(branch) ?? group(stem) ?? "인성"];
    evidence.push({ id: "natal-anchor", kind: "calculated", source: `facts.pillars.${pillar.pillar}.${part}TenGod`, value: anchorLabel });
  }
  const frame = yearFrame(symbols);
  const decisionPlan = planDecision(stem, branch, frame);
  const stemIdea = MEANING[stem].proposal;
  const condition = MEANING[branch].condition;
  const headline = decisionPlan.headline;
  add("year-common-frame",
    `${frame.setting}, ${frame.gate} ${frame.target}${eulReul(frame.target)} 고르는 흐름으로 읽어볼 수 있습니다. 이 배경이 실제 사건이나 결과를 예고하는 것은 아닙니다.`,
    ["year-symbols"]);
  add("month-applied-decision",
    `가령 ${anchorScene}, ${decisionPlan.action} ${decisionPlan.check}`,
    anchor ? ["month-stem", "month-branch", "year-symbols", "natal-anchor"] : ["month-stem", "month-branch", "year-symbols"], "reflection");
  add("month-decision-consequence", decisionPlan.consequence, ["month-stem", "month-branch"], "reflection");
  if (before && group(before.month.stemTenGod) === group(stem) && group(before.month.branchTenGod) === group(branch)
    && (before.month.stemTenGod !== stem || before.month.branchTenGod !== branch)) {
    evidence.push({ id: "previous-month-symbols", kind: "calculated", source: "previous annual month pillar compared with facts.dayStem", value: `${before.month.ganzhi}:${before.month.stemTenGod ?? "미확인"}/${before.month.branchTenGod ?? "미확인"}` });
    const priorStem = MEANING[before.month.stemTenGod ?? ""], priorBranch = MEANING[before.month.branchTenGod ?? ""];
    if (priorStem && priorBranch) add("month-decision-shift",
      `앞 구간에는 ${priorStem.proposal}${eulReul(priorStem.proposal)} ${priorBranch.condition}에 맞춰 보았다면, 이번에는 ${stemIdea}${eulReul(stemIdea)} ${condition}에 맞춥니다. ${priorBranch.result} 대신 ${MEANING[branch].result}에 초점을 옮깁니다.`,
      ["previous-month-symbols", "month-stem", "month-branch"], "reflection");
  }
  if (before && before.year.ganzhi !== symbols.year.ganzhi) {
    const priorFrame = yearFrame(before);
    evidence.push({ id: "previous-year-symbols", kind: "calculated", source: "previous annual pillar compared with facts.dayStem", value: `${before.year.ganzhi}:${before.year.stemTenGod ?? "미확인"}/${before.year.branchTenGod ?? "미확인"}` });
    add("year-decision-shift", `앞 구간에서 ${priorFrame.target}${eulReul(priorFrame.target)} 살폈다면, 이번에는 ${frame.target}${eulReul(frame.target)} 고를 때 무엇이 필요한지 돌아볼 수 있습니다. 새해의 상징이 달라진 것을 실제 사건의 변화로 단정하지 않습니다.`,
      ["previous-year-symbols", "year-symbols"]);
  }
  const plan: ReadingPlan = { headline, passages, evidence, limits: base.limits };
  validateReadingPlan(plan);
  return { plan, symbols };
}
