import { TEN_GOD_GROUP, type SajuFacts, type TenGodGroup } from "@/lib/saju-facts";
import type { PremiumReading, PremiumDomainSection } from "@/lib/premium-report";
import { composeNatalReadings } from "@/lib/premium-natal-reading";

const GROUPS = [
  { key: "비겁", count: "peerStarCount", label: "내 뜻과 주도권", trait: "남이 정한 답을 따르기보다 스스로 납득한 방향으로 움직일 때 마음이 놓이는 편으로 읽힙니다.", chance: "재량을 주는 역할이나 서로의 몫이 분명한 협업에서 자기 색깔이 드러나기 좋습니다.", caution: "의견이 부딪힐 때 옳고 그름을 빨리 가르려 하면, 함께 가고 싶은 사람과도 거리가 생길 수 있습니다." },
  { key: "식상", count: "outputStarCount", label: "표현과 창작", trait: "생각을 마음속에 오래 묶어두기보다 말이나 결과물로 꺼낼 때 자기 모습을 더 잘 드러내는 편으로 읽힙니다.", chance: "완성된 정답을 요구하는 자리보다 아이디어에 반응을 주고받는 환경에서 가능성이 열리기 좋습니다.", caution: "새로운 생각이 계속 떠오를수록 이미 시작한 일이나 약속이 뒤로 밀리기 쉽다는 점이 주의할 부분입니다." },
  { key: "재성", count: "wealthStarCount", label: "현실적인 성과", trait: "좋은 생각인지에 그치지 않고 실제로 어디에 쓰이고 어떤 결과가 남는지를 중요하게 여기는 편으로 읽힙니다.", chance: "사람이 필요로 하는 것과 자신이 제공할 수 있는 것을 연결하는 자리에서 강점을 쓰기 좋습니다.", caution: "눈앞의 성과가 매력적일수록 그 뒤에 필요한 시간과 관계의 부담을 가볍게 보기 쉽습니다." },
  { key: "관성", count: "officerStarCount", label: "책임과 신뢰", trait: "맡은 역할을 지키고 주변의 신뢰를 얻는 일이 자기 만족과 가깝게 연결되는 편으로 읽힙니다.", chance: "기준이 분명하고 꾸준히 쌓은 신뢰가 인정되는 환경에서 자신의 자리를 만들기 좋습니다.", caution: "기대에 맞추려는 마음이 커지면 부탁받지 않은 책임까지 혼자 지고 있다는 느낌이 쌓일 수 있습니다." },
  { key: "인성", count: "resourceStarCount", label: "이해와 준비", trait: "충분히 이해하고 마음이 놓인 뒤에 움직이려는 편으로 읽힙니다. 경험 많은 사람의 설명이나 익숙한 기반이 선택에 힘을 보탭니다.", chance: "배운 것을 차근차근 자기 것으로 만들거나 누군가의 도움을 다음 기회로 연결하는 자리에서 강점이 드러나기 좋습니다.", caution: "더 알아야 한다는 마음이 커지면 이미 준비된 부분까지 의심하며 시작을 늦추기 쉽습니다." },
] as const;
export const PERSONAL_GROUP_LABEL = Object.fromEntries(GROUPS.map(g => [g.key, g.label])) as Record<TenGodGroup, string>;
const areaLabel = { year: "익숙한 환경과 가족 관계", month: "사회생활과 일", day: "가까운 관계", hour: "일을 마무리하고 이어가는 과정" } as const;

function overallReading(facts: SajuFacts): PremiumReading {
  const ranked = GROUPS.map(g => ({ ...g, value: facts[g.count] })).sort((a, b) => b.value - a.value);
  // Equal counts stay equal: never invent a priority by array order.
  const leaders = ranked.filter(g => g.value === ranked[0].value);
  const leadKeys = new Set<TenGodGroup>(leaders.map(g => g.key));
  const places = [...new Set(facts.pillars.filter(p => leadKeys.has(TEN_GOD_GROUP[p.stemTenGod]) || leadKeys.has(TEN_GOD_GROUP[p.branchTenGod])).map(p => areaLabel[p.pillar]))];
  const equal = leaders.length > 1;
  const attitude = !facts.dayStrengthReliable
    ? null
    : facts.dayStrength === "strong"
      ? "한번 마음을 정하면 주변 반응이 달라도 자기 기준을 지키려는 쪽에 무게가 실립니다. 그 단단함이 버팀목이 되지만, 가까운 사람에게는 결론을 바꿀 여지가 적게 느껴질 수도 있습니다."
      : facts.dayStrength === "weak"
        ? "혼자 모든 조건을 만들기보다 사람이나 환경의 도움을 받을 때 본래의 장점이 편하게 드러나는 쪽으로 읽힙니다. 누구와 어디에서 하느냐가 무엇을 하느냐만큼 중요할 수 있습니다."
        : "자기 뜻을 밀고 가는 힘과 주변 사정을 받아들이는 힘이 어느 한쪽으로 크게 치우치지 않은 모습입니다. 상황에 맞게 속도를 바꾸는 유연함을 장점으로 읽을 수 있습니다.";
  return {
    headline: equal ? `${leaders.map(g => g.label).join(" · ")}의 장점을 함께 지닌 사람` : `${leaders[0].label}에서 힘을 얻는 사람`,
    paragraphs: [leaders.map(g => g.trait).join(" "), ...(attitude ? [attitude] : [])],
    opportunity: equal ? "서로 다른 장점을 함께 쓸 수 있는 자리가 어울립니다. " + leaders.map(g => g.chance).join(" ") : leaders[0].chance,
    caution: equal ? "중요하게 여기는 기준이 여럿이라 한쪽을 택하면 다른 쪽이 마음에 걸릴 수 있습니다. 특히 내 방식과 주변의 기대가 다른 장면에서는 선택보다 마음을 정리하는 데 시간이 들 수 있습니다." : leaders[0].caution,
    tip: "주변의 기대와 내가 원하는 방향이 다를 때는, 이번 선택에서 놓치고 싶지 않은 것 하나만 먼저 말해보세요.",
    basis: `태어난 연·월·일${facts.hasTimeInput ? "·시" : ""}의 구성에서 ${leaders.map(g => `‘${g.label}’`).join(", ")}${equal ? "의 비중이 나란히 두드러집니다." : "의 비중이 두드러집니다."} ${places.length ? `이런 요소가 놓인 자리는 ${places.join(", ")}에 연결해 읽었습니다.` : ""}`,
  };
}

function domainReadings(facts: SajuFacts): PremiumDomainSection[] {
  const expression = facts.outputStarCount + facts.peerStarCount;
  const reserve = facts.resourceStarCount + facts.officerStarCount;
  const love = expression === reserve ? "balanced" : expression > reserve ? "expressive" : "reserved";
  const money = facts.wealthStarCount === facts.resourceStarCount ? "balanced" : facts.wealthStarCount > facts.resourceStarCount ? "results" : "understanding";
  const work = facts.outputStarCount === facts.officerStarCount ? "balanced" : facts.outputStarCount > facts.officerStarCount ? "creative" : "responsible";
  const loveCopy: Record<typeof love, PremiumReading> = {
    expressive: {
      headline: "마음을 나누면서 가까워지는 관계",
      paragraphs: ["관계에서 먼저 말을 꺼내거나 분위기를 움직이는 쪽에 무게가 실립니다. 좋아하는 마음도 생각도 밖으로 전하면서 상대와의 거리를 가늠하는 편으로 읽힙니다.", "대화가 잘 통하면 빠르게 가까워질 수 있지만, 상대가 생각을 정리하는 동안에는 반응이 적다고 느끼기 쉽습니다. 표현의 양보다 서로 편한 속도가 관계의 만족을 좌우할 수 있습니다."],
      opportunity: "취향이나 관심사를 함께 즐기고 서로의 생각에 반응하는 관계에서 자연스러운 매력이 드러나기 좋습니다.",
      caution: "내가 답을 빨리 말할수록 상대에게는 자기 마음을 꺼낼 자리가 좁게 느껴질 수 있습니다.",
      tip: "답을 제안하기 전에 ‘네 마음은 어때?’라고 한 번 물어보세요.",
      basis: "생각을 표현하고 스스로 움직이는 요소가, 마음속에서 정리하거나 역할을 지키는 요소보다 두드러져 대화를 통해 가까워지는 관계로 읽었습니다.",
    },
    reserved: {
      headline: "작은 약속이 쌓일수록 깊어지는 관계",
      paragraphs: ["마음이 움직여도 바로 드러내기보다 이 관계가 편안하고 믿을 만한지 먼저 살피는 편으로 읽힙니다. 강한 첫인상보다 꾸준히 이어지는 연락과 작은 배려에 마음이 열리는 모습입니다.", "가까워진 뒤에는 말보다 챙기는 행동으로 애정을 보일 수 있습니다. 다만 속으로 충분히 생각한 마음이 상대에게도 전해졌다고 여기면, 서로 좋아하면서도 서운함이 남을 수 있습니다."],
      opportunity: "관계의 속도를 재촉하지 않고 말과 행동이 비슷한 사람과 신뢰를 쌓기 좋습니다.",
      caution: "상대가 먼저 알아주기를 오래 기다리면, 원하는 것이 없는 사람처럼 보일 수 있습니다.",
      tip: "고마웠던 행동이나 바라는 시간을 짧게 말로 덧붙여보세요.",
      basis: "마음을 정리하고 약속을 지키는 요소가 표현과 주도성을 나타내는 요소보다 두드러져, 신뢰를 확인하며 가까워지는 관계로 읽었습니다.",
    },
    balanced: {
      headline: "가까움과 나만의 공간이 함께 필요한 관계",
      paragraphs: ["마음을 표현하고 싶은 쪽과 신중하게 거리를 살피는 쪽이 비슷하게 놓여 있습니다. 좋아하는 사람과 자주 나누는 시간도, 혼자 마음을 정리할 여유도 소중한 모습으로 읽힙니다.", "익숙한 사람 앞에서는 편하게 이야기하다가도 중요한 약속 앞에서는 생각이 깊어질 수 있습니다. 이 차이를 서로 알아주면 관계가 편해지고, 모르고 지나가면 갑자기 멀어진 것처럼 느껴질 수 있습니다."],
      opportunity: "함께하는 시간과 각자의 시간을 자연스럽게 인정하는 관계에서 안정감을 얻기 좋습니다.",
      caution: "그날의 여유에 따라 표현이 달라질 때 상대가 이유를 모르면 마음이 바뀌었다고 받아들일 수 있습니다.",
      tip: "혼자 쉬고 싶은 날에는 거리 두기가 아니라 휴식이 필요하다는 말을 남겨보세요.",
      basis: "표현과 주도성을 나타내는 요소, 신중함과 약속을 나타내는 요소의 비중이 같아 어느 한쪽만 우선하는 관계로 정하지 않았습니다.",
    },
  };
  const moneyCopy: Record<typeof money, PremiumReading> = {
    results: {
      headline: "가능성을 실제 보상으로 연결하려는 재물 흐름",
      paragraphs: ["무언가를 고를 때 흥미로운지뿐 아니라 어떤 쓸모와 결과가 남는지를 빨리 떠올리는 편으로 읽힙니다. 돈도 막연히 모으는 대상보다 일의 성과나 선택의 결과와 연결해 이해하는 모습입니다.", facts.outputStarCount > 0 ? "표현하고 만들어내는 요소도 함께 있어, 자신의 결과물이 누군가의 필요와 만나는 과정에 눈길이 갑니다. 잘하는 일을 어떻게 전달하느냐가 보상을 받아들이는 감각과 연결될 수 있습니다." : "성과를 확인하려는 마음에 비해 결과를 밖으로 드러내는 요소는 두드러지지 않습니다. 생각한 가치와 상대가 알아보는 가치 사이에 거리가 생기면 아쉬움이 커질 수 있습니다."],
      opportunity: "무엇을 제공하고 무엇을 받는지가 분명한 일에서 자신의 기여를 드러내기 좋습니다.",
      caution: "보이는 보상이 클수록 그 일을 이어가는 데 드는 시간이나 관계의 부담이 뒤늦게 느껴질 수 있습니다.",
      tip: "조건이 매력적인 제안이라면 얻는 것과 오래 감당해야 할 것을 함께 떠올려보세요.",
      basis: "실제 결과와 교환을 뜻하는 요소가 이해와 준비를 뜻하는 요소보다 두드러집니다. 여기에 자신의 생각을 결과로 드러내는 요소가 있는지도 함께 읽었습니다.",
    },
    understanding: {
      headline: "납득할 수 있는 기반에서 안정을 찾는 재물 흐름",
      paragraphs: ["돈이 된다는 말만으로 움직이기보다 어떤 과정으로 생기는 결과인지 이해해야 마음이 놓이는 편으로 읽힙니다. 낯선 기회보다 배워온 것과 익숙한 경험에 연결된 선택에 신뢰가 쌓이기 쉽습니다.", "이런 신중함은 쉽게 휩쓸리지 않는 바탕이 될 수 있습니다. 반면 충분히 준비했는데도 확신이 더 필요하다고 느끼면, 자신의 시간과 능력에 어떤 보상을 기대하는지 말하는 일이 늦어질 수 있습니다."],
      opportunity: "전문성이나 꾸준히 쌓은 신뢰를 상대가 알아주는 환경에서 보상의 의미를 찾기 좋습니다.",
      caution: "준비에 쓴 노력과 실제로 돌아오는 보상을 별개로 여기면, 많이 애쓰고도 충분히 인정받지 못했다고 느낄 수 있습니다.",
      tip: "보상이 걸린 일을 맡을 때는 기대하는 대가를 처음부터 편하게 이야기해보세요.",
      basis: "이해하고 익히는 요소가 현실적인 성과를 뜻하는 요소보다 두드러져, 확신과 익숙한 기반을 중시하는 돈의 태도로 읽었습니다.",
    },
    balanced: {
      headline: "가치에 대한 납득과 실제 이익을 함께 보는 재물 흐름",
      paragraphs: ["무엇이 남는지도 중요하지만 왜 이 선택을 하는지 스스로 설명할 수 있어야 편한 쪽으로 읽힙니다. 이익이 커 보여도 과정이 납득되지 않으면 망설이고, 마음에 드는 일이라도 부담이 너무 크면 다시 생각하는 모습입니다.", "현실적인 조건과 자신의 기준을 함께 살필 수 있는 점이 장점입니다. 두 기준이 엇갈릴 때에는 어느 하나가 틀렸다기보다, 지금 무엇을 더 소중하게 여기는지가 선택을 가를 수 있습니다."],
      opportunity: "내용을 충분히 이해하면서도 노력에 대한 대가가 분명한 일에서 만족을 찾기 좋습니다.",
      caution: "완벽하게 납득되는 조건만 기다리면 이미 괜찮은 선택도 부족하게 느껴질 수 있습니다.",
      tip: "비슷한 선택지라면 이익 외에 오래 만족할 이유 하나를 함께 떠올려보세요.",
      basis: "현실적인 성과를 뜻하는 요소와 이해·준비를 뜻하는 요소의 비중이 같아, 이익 추구나 신중함 한쪽으로만 읽지 않았습니다.",
    },
  };
  const workCopy: Record<typeof work, PremiumReading> = {
    creative: {
      headline: "자신의 방법을 결과로 보여줄 때 살아나는 일",
      paragraphs: ["정해진 절차를 빠짐없이 따르는 일보다 생각한 방법을 직접 써보고 결과를 보여주는 일에 마음이 움직이는 편으로 읽힙니다. 같은 목표라도 접근 방식을 고를 여지가 있을 때 자기 색깔이 드러나기 쉽습니다.", "아이디어가 실제 반응을 얻으면 다음 일을 이어갈 힘이 생기는 모습입니다. 반대로 설명할 기회 없이 방식만 지시받으면 능력을 쓰기보다 틀에 맞추는 데 에너지를 쓰고 있다고 느낄 수 있습니다."],
      opportunity: "기획·제안·제작처럼 생각이 구체적인 결과로 이어지고 피드백을 받을 수 있는 역할에서 강점을 쓰기 좋습니다.",
      caution: "새 방법을 떠올리는 속도와 함께 일하는 사람이 받아들이는 속도가 다르면, 좋은 의도도 잦은 변경으로 보일 수 있습니다.",
      tip: "새 방식을 제안할 때는 무엇이 좋아지는지 작은 예 하나를 곁들여보세요.",
      basis: "자신의 생각을 표현하고 만들어내는 요소가 정해진 역할과 규칙을 뜻하는 요소보다 두드러져, 방법을 고를 여지가 있는 일로 연결했습니다.",
    },
    responsible: {
      headline: "꾸준히 맡아낸 일이 신뢰로 쌓이는 일",
      paragraphs: ["눈에 띄는 새 아이디어보다 맡은 일을 믿고 맡길 수 있게 해내는 데 강점이 드러나는 편으로 읽힙니다. 자신의 역할이 분명하고 책임에 맞는 권한을 받을 때 일의 의미가 또렷해질 수 있습니다.", "한 번의 성과보다 여러 번 함께 일하며 쌓은 평판이 자신의 자리를 만드는 모습입니다. 다만 주변에서 믿고 맡기는 일이 늘수록, 잘하고 있다는 느낌과 부담스럽다는 느낌이 동시에 커질 수 있습니다."],
      opportunity: "운영·조율·관리처럼 흐름을 안정적으로 이어가고 책임 있게 마무리하는 역할에서 신뢰를 얻기 좋습니다.",
      caution: "끝까지 해내려는 마음 때문에 역할 밖의 일까지 받아들이면, 정작 잘하는 일에 쓸 여유가 줄 수 있습니다.",
      tip: "새 책임을 맡을 때는 결정할 수 있는 범위도 함께 이야기해보세요.",
      basis: "자유로운 표현보다 역할과 신뢰를 뜻하는 요소가 두드러져, 꾸준함이 평판으로 이어지는 일의 방식으로 읽었습니다.",
    },
    balanced: {
      headline: "새로운 방법과 안정적인 마무리를 잇는 일",
      paragraphs: ["자신의 생각을 보여주는 힘과 맡은 역할을 지키려는 마음이 비슷하게 놓여 있습니다. 새로운 방식을 고민하더라도 실제로 함께 쓰고 마무리할 수 있는지가 중요하게 느껴지는 모습입니다.", "아이디어만 내거나 정해진 일만 반복하는 자리보다, 바꿀 부분과 지킬 부분을 함께 판단하는 역할에 여지가 있습니다. 어느 쪽을 원하는 자리인지 불분명하면 스스로도 힘을 어디에 써야 할지 헷갈릴 수 있습니다."],
      opportunity: "기존 일을 개선하거나 사람들의 생각을 실행 가능한 형태로 조율하는 역할에서 균형감을 쓰기 좋습니다.",
      caution: "새로움과 안정성을 동시에 완벽하게 만족시키려 하면 작은 변화에도 결정이 길어질 수 있습니다.",
      tip: "지켜야 할 부분과 바꿔도 되는 부분을 먼저 나눠 이야기해보세요.",
      basis: "표현·창작과 역할·규칙을 뜻하는 요소의 비중이 같아, 자유로운 실행과 안정적인 완수 중 한쪽만 우선하지 않았습니다.",
    },
  };
  const dayBranch = facts.pillars.find(p => p.pillar === "day")?.branchTenGod;
  const closeGroup = dayBranch ? TEN_GOD_GROUP[dayBranch] : null;
  const loveResult = { ...loveCopy[love], paragraphs: [...loveCopy[love].paragraphs] };
  if (closeGroup === "인성") loveResult.paragraphs.push("가까운 관계를 나타내는 자리에는 이해와 보살핌의 의미가 놓여 있습니다. 편하게 기대고 마음을 설명할 수 있다는 느낌이 친밀함을 더해주는 모습입니다.");
  if (closeGroup === "비겁") loveResult.paragraphs.push("가까운 관계를 나타내는 자리에는 자기 뜻과 동등함의 의미가 놓여 있습니다. 서로를 챙기더라도 한 사람이 다른 사람의 방식을 대신 정하지 않는 관계가 편할 수 있습니다.");
  const workResult = facts.outputStarCount === 0 && facts.officerStarCount === 0 ? {
    headline: "일의 방식은 실제 경험과 맡은 조건을 함께 보기",
    paragraphs: ["표현과 창작, 역할과 규칙을 비교하는 요소가 모두 드러난 글자에 없어, 이 기준으로 새로운 일을 잘하는지 정해진 일을 잘하는지 정하지 않았습니다. 두 요소가 없다는 사실은 어느 쪽 능력이 부족하다는 뜻도 아닙니다.", "일에서는 어떤 선택을 직접 할 수 있는지, 어떤 도움을 받을 수 있는지를 실제 경험과 함께 살펴볼 수 있습니다. 다른 원국 요소에서 읽은 장점도 구체적인 역할과 환경에 놓아볼 때 자신에게 맞는 부분을 구분하기 쉽습니다."],
    opportunity: "실제로 흥미를 느끼고 잘 이어갔던 경험을 바탕으로, 재량과 협업 조건이 맞는 역할을 찾아볼 수 있습니다.",
    caution: "드러난 요소가 적다는 이유로 자신의 적성이나 가능한 직업을 좁힐 근거는 없습니다.",
    tip: "", basis: "드러난 글자의 식상과 관성 집계가 모두 0이므로 같은 비중이라는 이유만으로 두 성향이 모두 강하다고 읽지 않았습니다.",
  } : workCopy[work];
  return [
    { key: "love_relationship", label: "연애·관계", ...loveResult },
    { key: "money", label: "재물", ...moneyCopy[money] },
    { key: "work", label: "직장·일", ...workResult },
  ];
}

/** The free opening and deeper report are projections of this same reading. */
export function buildPersonalReading(facts: SajuFacts) {
  return composeNatalReadings(facts, { overall: overallReading(facts), domains: domainReadings(facts) });
}
