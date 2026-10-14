import { composeMonthClosure } from "@/lib/premium-month-closure";
import { TEN_GOD_GROUP, type PillarFact, type TenGodGroup } from "@/lib/saju-facts";
import type { AnnualPillarSymbols } from "@/lib/saju-timing";
import type { MonthStory } from "@/lib/premium-month-story";

export type MonthObservationMode = "fate-pair" | "head-curved" | "head-straight" | "heart-curved" | "heart-straight";
export interface PremiumYearNarrative {
  symbols: AnnualPillarSymbols;
  stemGod: string;
  branchGod: string;
  summary: string;
}
const DESIRE: Record<string, string> = {
  비견: "직접 좋아해서 고른 마음", 겁재: "함께 누리면서도 각자의 느낌을 남기고 싶은 마음",
  식신: "손에 익은 시간을 다시 하고 싶은 마음", 상관: "내 뜻을 더 잘 닿게 표현하고 싶은 마음",
  편재: "생각하지 못한 쓰임을 더 경험하고 싶은 마음", 정재: "익숙한 하루에 편안함을 남기고 싶은 마음",
  편관: "낯선 기대 앞에서도 잘해 보이고 싶은 마음", 정관: "이미 지켜 온 믿음을 이어 가고 싶은 마음",
  편인: "다른 이유에서도 뜻을 알아보고 싶은 마음", 정인: "이해받으며 스스로 익히고 싶은 마음",
};
const YEAR_RELATION: Record<TenGodGroup, Record<TenGodGroup, string>> = {
  비겁: {
    비겁: "같이 골랐다는 기쁨 안에도 자기 취향이 들어갔는지는 따로 남을 수 있습니다.",
    식상: "직접 좋아한 이유를 말하거나 보여 주는 동안 자기 바람이 더 구체적인 모습이 될 수 있습니다.",
    재성: "고르던 순간의 애착이 생활에서 실제로 쓰인 만족과 만날 여지가 있습니다.",
    관성: "자신이 원하는 것과 이미 소중히 지키는 것을 한쪽으로 접기 어려운 순간을 읽습니다.",
    인성: "도움받은 경험 안에서도 직접 선택한 마음을 남기고 싶을 수 있습니다.",
  },
  식상: {
    비겁: "표현 뒤 돌아온 반응이 달라도 먼저 좋아했던 뜻까지 잃지는 않을 여지가 있습니다.",
    식상: "즐겁게 반복한 시간에서 작게 달리해 보고 싶은 부분이 더 잘 보일 수 있습니다.",
    재성: "만드는 기쁨과 누군가 실제로 쓰는 보람이 서로 다른 순간에 생길 수 있습니다.",
    관성: "즐겨 보여 준 것에 기대가 붙으면 잘해야 한다는 부담도 같이 놓일 수 있습니다.",
    인성: "직접 해 보며 생긴 작은 질문이 배운 내용을 자기 경험으로 남길 여지가 있습니다.",
  },
  재성: {
    비겁: "쓰임이 좋은 선택 안에서도 자신과 함께하는 사람이 좋아하는 이유는 다를 수 있습니다.",
    식상: "써 본 뒤 생긴 작은 불편이 다음에 표현할 모습을 달리 느끼게 할 수 있습니다.",
    재성: "새로 얻은 설렘과 오래 편하게 쓰는 만족을 다른 경험으로 남길 여지가 있습니다.",
    관성: "생활에 편했던 것이 늘 같은 모습을 유지해야 할 일처럼 느껴지는 순간을 읽습니다.",
    인성: "유용하다는 설명과 직접 경험하고 싶은 마음이 다른 크기로 놓일 수 있습니다.",
  },
  관성: {
    비겁: "기대를 채운 보람 뒤에도 개인적으로 원하는 시간이 남을 수 있습니다.",
    식상: "지켜 온 의미를 다른 말과 모양으로 표현하는 일도 정성을 이어 가는 방식이 될 수 있습니다.",
    재성: "잘 끝났다는 평가 옆에 이후에도 편하게 쓰인 보람이 따로 생길 수 있습니다.",
    관성: "새로운 반응을 잘 받고 싶은 긴장과 이미 이어 온 작은 믿음을 나란히 읽습니다.",
    인성: "믿음직하게 남고 싶은 사람에게도 도움을 받아 마음 놓을 자리가 필요할 수 있습니다.",
  },
  인성: {
    비겁: "충분히 이해한 설명 가운데서도 직접 좋아하는 것을 고를 마음은 따로 남을 수 있습니다.",
    식상: "알고 있다는 안심과 직접 할 수 있게 된 편안함은 다른 순간에 생길 수 있습니다.",
    재성: "더 많이 준비한 만족보다 이미 익힌 것이 실제로 닿은 한 경험에 의미가 생길 수 있습니다.",
    관성: "배운 내용을 기대 앞에 놓을 때 모르는 부분과 처음의 낯섦이 겹쳐 보일 수 있습니다.",
    인성: "답을 더 알아내는 시간 옆에도 이해받았다고 느꼈던 기억을 남길 여지가 있습니다.",
  },
};


const EXACT_YEAR_RELATION: Record<string, string> = {
  "편관|정관": "새 기대 하나 앞에서 긴장됐어도 이미 편하게 지켜 온 작은 경험은 남아 있을 수 있습니다. 처음부터 전부 증명하려던 마음과 해 온 것을 이어 가는 편안함을 다르게 느낄 여지가 있습니다.",
  "정관|편관": "늘 지켜 온 의미에 새 기대가 붙으면 같은 일도 전보다 무겁게 느껴질 수 있습니다. 믿음직한 모습을 잃고 싶지 않은 마음이 익숙하지 않은 부분까지 잘해야 한다는 부담으로 넓어졌는지 돌아볼 여지가 있습니다.",
  "정관|정인": "늘 괜찮게 해내는 모습 안에도 작은 도움을 받아 마음 놓을 자리가 필요할 수 있습니다. 다시 묻거나 기대는 경험이 해 온 정성을 작게 만드는 일은 아닐 수 있습니다.",
  "편관|편인": "처음부터 알고 잘해야 한다는 긴장이 있다면, 다른 사람이 처음 겪었던 어려움을 듣는 동안 자기 낯섦도 다른 모습으로 보일 수 있습니다. 정답을 더 모으는 만족과 상황을 달리 이해한 편안함이 따로 남을 여지가 있습니다.",
  "겁재|비견": "같이 즐거웠던 시간에도 직접 좋아한 부분이 각자 다르게 남을 수 있습니다. 같은 선택을 했다는 기쁨 옆에 자기 취향도 들어올 때 함께한 기억이 더 구체적인 모습이 될 여지가 있습니다.",
  "비견|식신": "직접 고른 것을 편하게 다시 하는 동안 처음의 이유가 생활의 애착으로 남을 수 있습니다. 크게 새롭게 보여 주지 않아도 자기가 좋아한 시간을 이어 가는 경험에 만족이 생길 여지가 있습니다.",
};

/** Both exact annual symbols are used: the stem selects the felt pressure,
 * the branch selects what may make that same experience satisfying. */
export function buildPremiumYearNarrative(symbols: AnnualPillarSymbols): PremiumYearNarrative | null {
  const stemGod = symbols.stemTenGod, branchGod = symbols.branchTenGod;
  if (!stemGod || !branchGod || !DESIRE[stemGod] || !DESIRE[branchGod]) return null;
  const together = stemGod === branchGod ? `${DESIRE[stemGod]}이 겹쳐 놓입니다.`
    : `${DESIRE[stemGod]}과 ${DESIRE[branchGod]}이 함께 놓입니다.`;
  return { symbols, stemGod, branchGod, summary: `${together} ${EXACT_YEAR_RELATION[`${stemGod}|${branchGod}`] ?? YEAR_RELATION[TEN_GOD_GROUP[stemGod]][TEN_GOD_GROUP[branchGod]]}` };
}

// The annual emphasis is rendered once in annualIntroduction. Monthly scenes
// retain only their own symbol relation and branch-specific consequence.
export function connectYearToMonth(story: MonthStory, stem: string, branch: string, area: PillarFact["pillar"], year: PremiumYearNarrative | null,
  mode?: MonthObservationMode): MonthStory {
  if (!year) return story;
  const action = monthAction(stem, branch, area, mode);
  const meaning = composeMonthClosure(stem, branch, year.branchGod, action, mode);
  // The annual summary owns the common yearly theme. A month keeps only its
  // own symbol/scene and the branch-specific consequence; do not append the
  // same annual pressure to every month with a date prefix.
  return { ...story,
    meaning,
  };
}
function monthAction(stem: string, branch: string, area: PillarFact["pillar"], mode?: MonthObservationMode): string {
  if (mode === "fate-pair") return stem === "상관" ? "고치지 않아도 편했던 부분을 남기고 실제 불편했던 한 곳만 다시 손보는 선택"
    : "좋아하던 시간의 크기로 한 번 더 나누되 다음에도 스스로 하고 싶은 부분을 남기는 선택";
  if (mode?.startsWith("head") && stem === "편인" && branch === "편인") return mode === "head-curved"
    ? "대화 중 떠오른 작은 예로 뜻을 묻고 그 답을 듣고 느낀 마음도 함께 말하는 선택"
    : "내가 들은 뜻을 짧게 되짚은 뒤 상대의 답을 기다려 추측에 없던 내용을 받아들이는 선택";
  if (mode?.startsWith("head") && stem === "정인" && branch === "식신") return mode === "head-curved"
    ? "배운 순서에서 직접 달리해 편해진 한 부분을 자신의 말로 설명하는 선택"
    : "설명에 없던 한 부분을 묻고 이해된 순서로 직접 이어 해 보는 선택";
  if (mode?.startsWith("heart")) return mode === "heart-curved" ? "잘 설명되지 않아도 작은 도움을 청하고 그 마음을 들어 주는 시간을 받아들이는 선택"
    : "나도 기억해 줬으면 했던 한 가지를 짧게 말해 서로 챙겨 갈 자리를 남기는 선택";
  const a = TEN_GOD_GROUP[stem], b = TEN_GOD_GROUP[branch];
  const setting = area === "day" ? "가까운 사람에게" : area === "month" ? "함께하는 사람에게" : "익숙한 사람에게";
  const actions: Record<TenGodGroup, Record<TenGodGroup, string>> = {
    비겁: { 비겁: "함께 고른 뒤에도 각자 좋았던 순간을 나누는 선택", 식상: branch === "상관" ? "같은 뜻을 다른 말로 전해 보고 더 잘 닿은 한 부분을 남기는 선택" : "직접 좋아해 고른 것을 다시 편하게 이어 해 보는 선택", 재성: "처음 고른 이유와 실제로 쓰게 된 이유를 다른 경험으로 남기는 선택", 관성: `${setting} 개인적인 바람을 말하고 함께 소중한 부분을 다시 알아보는 선택`, 인성: "도움받은 방법에서 혼자 할 수 있게 된 한 부분을 직접 써 보는 선택" },
    식상: { 비겁: "보여 준 것에서 상대가 좋아한 부분을 듣고 내가 남기고 싶은 뜻도 나누는 선택", 식상: "완성한 것의 좋아하던 부분을 남기며 새로 아쉬운 한 곳만 달리해 보는 선택", 재성: stem === "상관" ? "전부 새롭게 고치기보다 생활에서 불편했던 한 부분만 바꿔 쓰는 선택" : "다른 사람이 쓴 모습을 보며 즐겨 만들던 시간을 다시 남기는 선택", 관성: "한 반응으로 표현 전체를 고치기보다 처음 좋아했던 한 부분을 남기는 선택", 인성: "배운 것을 직접 표현하다 생긴 질문 한 곳을 작은 경험으로 풀어 보는 선택" },
    재성: { 비겁: "각자 줄이고 싶은 불편을 듣고 같은 선택을 해야 한다는 마음을 잠시 두는 선택", 식상: "써 본 뒤 달라진 한 불편을 다시 해 보는 모습으로 남기는 선택", 재성: "새로 얻은 설렘과 오래 편해진 만족 중 지금 필요한 것을 작게 경험하는 선택", 관성: branch === "편관" ? "새롭게 좋았던 한 부분을 작게 이어 해 보고 처음의 즐거움을 남기는 선택" : "익숙하게 편했던 부분을 달리 이어도 소중했던 뜻을 남기는 선택", 인성: branch === "편인" ? "다른 설명을 잠시 두고 직접 경험하고 싶은 한 부분을 써 보는 선택" : "써 본 사람의 경험을 듣고 내 하루에서 필요한 한 부분을 익히는 선택" },
    관성: { 비겁: "기대를 채운 뒤에도 개인적으로 좋아하는 시간을 작게 고르는 선택", 식상: "소중히 지켜 온 뜻을 달라진 말이나 모습으로 전해 보는 선택", 재성: "끝났다는 평가 뒤에 실제로 편하게 쓰인 한 장면을 알아보는 선택", 관성: "새로운 기대 앞에서도 이미 편하게 해 온 한 부분부터 이어 보는 선택", 인성: branch === "정인" ? `${setting} 낯선 한 부분을 말하고 작은 도움을 청하는 선택` : `${setting} 처음 겪은 어려움을 듣고 내 상황에 다른 뜻이 있었는지 알아보는 선택` },
    인성: { 비겁: branch === "비견" ? "충분히 이해한 이유 옆에 직접 좋아했던 한 순간을 놓고 고르는 선택" : "같은 설명을 듣고 서로 달리 편해진 경험을 나누는 선택", 식상: branch === "상관" ? "알고 있던 뜻을 자기 말로 바꾸다 막힌 한 곳을 다시 해 보는 선택" : "익힌 것을 반복해 직접 할 수 있게 된 한 부분을 알아보는 선택", 재성: "더 배울 것보다 이미 익힌 내용이 실제로 닿은 한 경험을 남기는 선택", 관성: "모르는 부분과 처음 실행하는 낯섦을 나누어 작은 부분을 직접 해 보는 선택", 인성: `${setting} 말의 이유와 그 말을 듣고 좋거나 아쉬웠던 마음을 함께 묻는 선택` },
  };
  return actions[a][b];
}

// A year's emphasis enters the existing scene as a reason for its discomfort;
