import { TEN_GOD_GROUP, type PillarFact, type SajuFacts } from "@/lib/saju-facts";
import { describeAnnualMonthSymbols, type AnnualMonthSymbols, type SajuAnnualMonthOutlook } from "@/lib/saju-timing";
import { validateReadingPlan, type ReadingEvidence, type ReadingPlan } from "@/lib/reading-plan";
import { buildPremiumYearNarrative, type MonthObservationMode } from "@/lib/premium-year-narrative";
import { composeMonthStory, monthSymbolSubject, type MonthStory, monthMeaningContinuity } from "@/lib/premium-month-story";
import { normalizePalmFactsObservation, type PalmFacts } from "@/lib/palm-facts";
import type { DominantHand } from "@/lib/palm-bilateral";
import { palmPersonalLineReading } from "@/lib/palm-customer-reading";

export const traditionalSymbolSubject = monthSymbolSubject;
export type MonthReadingContext = { leftPalm?: PalmFacts | null; rightPalm?: PalmFacts | null; dominantHand?: DominantHand | null };
const PILLAR_LABEL: Record<PillarFact["pillar"], string> = { year: "연", month: "월", day: "일", hour: "시" };

function natalAnchor(facts: SajuFacts, stem: string, branch: string) {
  const a = TEN_GOD_GROUP[stem], b = TEN_GOD_GROUP[branch];
  const preferred: PillarFact["pillar"][] = a === "식상" && b === "재성" ? ["hour", "month", "day", "year"]
    : a === "관성" || b === "관성" ? ["month", "day", "year", "hour"]
      : a === "인성" || b === "인성" ? ["day", "month", "hour", "year"] : ["year", "day", "month", "hour"];
  const candidates = facts.pillars.filter(p => facts.hasTimeInput || p.pillar !== "hour")
    .sort((l, r) => preferred.indexOf(l.pillar) - preferred.indexOf(r.pillar));
  for (const exact of [true, false]) for (const wanted of [stem, branch]) for (const pillar of candidates) for (const part of ["stem", "branch"] as const) {
    const god = pillar[`${part}TenGod`];
    if (exact ? god === wanted : TEN_GOD_GROUP[god] === TEN_GOD_GROUP[wanted]) return { pillar, part, god, exact };
  }
  return null;
}

// Observations change the selected scene and its resolution. They are not a
// generic palm sentence pasted between an unchanged natal scene and advice.
function withObservedScene(story: MonthStory, stem: string, branch: string, area: PillarFact["pillar"], context: MonthReadingContext,
  evidence: ReadingEvidence[]): { story: MonthStory; refs: string[]; mode?: MonthObservationMode } {
  const hands = { left: context.leftPalm ? normalizePalmFactsObservation(context.leftPalm) : null,
    right: context.rightPalm ? normalizePalmFactsObservation(context.rightPalm) : null };
  const order: DominantHand[] = context.dominantHand === "left" ? ["left", "right"] : ["right", "left"];
  const groups = [TEN_GOD_GROUP[stem], TEN_GOD_GROUP[branch]];
  const refs: string[] = [];
  const add = (id: string, value: ReadingEvidence["value"]) => { evidence.push({ id, kind: "observed", source: id, value }); refs.push(id); };
  if (TEN_GOD_GROUP[stem] === "식상" && TEN_GOD_GROUP[branch] === "재성") {
    const shared = area === "month";
    const scene = stem === "상관"
      ? shared
        ? "함께 쓰는 자료의 불편한 부분을 고쳤는데 동료는 모양까지 새로 바꾸길 바란다고 가정해 보세요. 자신은 쓰기 쉽게 만든 것에 만족했지만 상대는 새로워 보이는 변화에 기대를 두었을 수 있습니다. 더 많이 고칠수록 이미 손에 익은 순서까지 낯설어지면 두 사람이 좋다고 생각한 개선의 뜻이 달랐던 것입니다."
        : "매일 쓰던 물건의 작은 불편을 손봤는데 가까운 사람은 더 눈에 띄게 바꾸면 좋겠다고 했다고 가정해 보세요. 내가 해결한 것은 손에 걸리던 불편이고 상대가 기대한 것은 새로워진 모습일 수 있습니다. 좋은 제안을 모두 따르다 보면 아끼던 사용감까지 잃을 수 있어, 표현한 변화와 생활에 남기고 싶은 편안함 사이의 긴장을 읽습니다."
      : shared
        ? "직접 만든 것을 동료가 다른 일에도 쓰고 싶다고 말하는 장면을 떠올려 보세요. 처음에는 손에 익히며 즐겁던 시간이었는데 반응이 늘자 더 자주 제공해야 할 것처럼 느낄 수 있습니다. 상대가 알아본 쓰임을 듣는 기쁨과 직접 만들고 싶어서 시작한 이유가 다른 속도로 커지는 장면입니다."
        : "즐겨 만들던 것을 가까운 사람에게 나눴는데 다음에도 부탁한다는 답을 받는 장면을 떠올려 보세요. 내게는 만드는 시간이 즐거웠고 상대에게는 완성된 것의 편리함이 좋았을 수 있습니다. 반가운 호응을 모두 같은 양의 제공으로 이어 가면 처음 좋아했던 시간이 의무처럼 달라질 수 있습니다.";
    return { story: { ...story, scene }, refs };
  }
  // Read a hand feature only for the relation it materially changes. Other
  // months retain their own natal scenes rather than a repeated palm paragraph.
  const relation = `${stem}|${branch}`;
  if (!["편인|편인", "정인|식신", "정관|정인"].includes(relation)) return { story, refs };
  const key = relation === "정관|정인" ? "heartLine" : "headLine";
  const observed = order.flatMap(hand => {
    const line = hands[hand]?.onnxLines?.[key];
    return hands[hand]?.imageQuality === "good" && line?.depthStrength !== "약함" && palmPersonalLineReading(key, line) ? [{ hand, line: line! }] : [];
  });
  const primary = observed[0];
  if (!primary) return { story, refs };
  for (const entry of observed) {
    add(`${entry.hand}.${key}.curve`, entry.line.curve);
    add(`${entry.hand}.${key}.observation`, JSON.stringify({ modelExecuted: hands[entry.hand]!.onnxLines!.modelExecuted,
      imageQuality: hands[entry.hand]!.imageQuality, detected: entry.line.detected, curve: entry.line.curve,
      attributeSupport: entry.line.attributeSupport, depthStrength: entry.line.depthStrength, sourceVariant: entry.line.sourceVariant ?? "unknown" }));
  }
  const curved = primary.line.curve === "완만한 곡선";
  const label = primary.hand === "left" ? "왼손" : "오른손";
  let scene: string, meaning: string;
  if (relation === "편인|편인" && area === "day") {
    scene = curved
      ? `가까운 사람의 짧은 답을 여러 번 생각하는 장면이라면, 이유를 혼자 찾을 때와 실제로 말을 주고받을 때 마음이 다르게 움직일 수 있습니다. ${label} 두뇌선에서 읽힌 연결해 이해하는 모습은 대화 중 떠오른 작은 예에서 상대의 뜻이 구체화되는 쪽으로 이어집니다. 설명을 더 알아냈는데도 서운함이 남으면 이해한 내용과 그때 원했던 반응이 달랐을 수 있습니다.`
      : `가까운 사람의 짧은 답이 마음에 남았다면, 서로 무엇을 말한 것인지 분명해져야 마음이 놓이는 장면을 떠올릴 수 있습니다. ${label} 두뇌선의 정리하는 모습과 함께 읽으면 여러 이유를 추측하기보다 내가 이해한 뜻을 짧게 되짚는 일이 대화를 편하게 만드는 쪽으로 이어집니다.`;
    meaning = curved ? "궁금한 이유를 묻는 말에 그 답을 듣고 느꼈던 마음도 한 번 놓아 볼 수 있습니다. 상대를 이해한 것과 내 마음이 이해받은 것이 함께 남을 때 대화를 다시 곱씹는 이유도 달라질 여지가 있습니다."
      : "내가 들은 뜻을 말한 뒤 상대의 답을 기다리면 추측하던 시간에 없던 새로운 내용이 들어올 자리가 생깁니다. 짧은 말도 서로 같은 뜻으로 들은 순간에는 안심이 될 수 있습니다.";
  } else if (relation === "정인|식신") {
    const place = area === "month" ? "배운 것을 일에서 직접 해 보는" : area === "day" ? "배운 것을 가까운 사람과 함께 해 보는" : "배운 것을 혼자 반복해 보는";
    scene = curved
      ? `${place} 장면이라면, 받은 설명을 다른 예와 연결해 뜻을 잡는 ${label} 두뇌선의 모습이 함께 읽힙니다. 알려 준 순서에서 한 부분을 달리했더니 더 편해졌다면, 도움받은 흔적과 내가 발견한 요령이 한 결과 안에 남을 수 있습니다. 다르게 해 본 것이 틀린 답처럼 느껴지는 순간에도, 무엇이 편해졌는지를 내 말로 설명하며 배움을 자기 경험으로 이어 갈 여지가 있습니다.`
      : `${place} 장면이라면, 왜 그 순서가 필요한지 정리해야 마음이 놓이는 ${label} 두뇌선의 모습이 함께 읽힙니다. 직접 해 보다가 설명에 없던 한 부분을 물었을 때 순서 전체가 이해된다면, 질문은 처음부터 모른다는 뜻보다 배운 것을 끝까지 이어 가는 과정이 될 수 있습니다.`;
    meaning = curved ? "받은 방법을 그대로 따라 한 만족과 자신에게 맞게 익힌 만족이 함께 남을 수 있습니다. 도움에 감사하면서도 달리 해 본 흔적을 지우지 않을 때 다음에도 스스로 해 보고 싶은 마음이 이어질 여지가 있습니다."
      : "설명을 더 모으기보다 직접 이어 할 수 있게 된 한 부분을 알아보면, 배우던 사람이 스스로 할 수 있게 되었다는 편안함이 구체적으로 남을 수 있습니다.";
  } else if (relation !== "정관|정인" && groups.includes("인성")) {
    scene = curved
      ? `배운 것을 처음 내 방식으로 해 보는 장면이라면, 익숙한 경험에 연결하며 이해하는 ${label} 두뇌선의 모습이 함께 읽힙니다. 알려 준 순서에서 작은 부분을 달리했을 때 갑자기 뜻이 잡히면, 처음에는 설명되지 않던 질문도 자신의 경험으로 남을 수 있습니다.`
      : `배운 것을 직접 해 보는 장면이라면, 납득한 이유를 정리하며 마음을 놓는 ${label} 두뇌선의 모습이 함께 읽힙니다. 순서를 알고도 시작이 낯설다면 내용을 모르는 것보다 손으로 익힐 시간이 아직 적었을 수 있습니다.`;
    meaning = curved ? "받은 설명을 그대로 재현한 만족과 내 예에서 이해가 붙은 만족을 함께 남길 수 있습니다. 다르게 해 본 작은 흔적이 다음에 스스로 해 볼 마음을 구체화할 여지가 있습니다."
      : "한 부분을 직접 해 본 뒤 어디서 편해졌는지 떠올리면, 더 읽어야 할 내용과 이미 알고 해도 되는 부분이 다르게 느껴질 수 있습니다.";
  } else {
    const setting = area === "month" ? "익숙하게 해 오던 일" : "가까운 사람과 보내는 시간";
    scene = curved
      ? `${setting}에서 늘 내가 챙기는 쪽이었다면, ${label} 감정선의 말을 주고받는 표현은 이번에는 작은 도움을 청하는 장면에서 다른 의미로 이어집니다. 잘 설명하지 못해도 들어 줬다고 느낀다면, 기대를 채운 결과보다 약한 마음 그대로 받아들여졌다는 안심이 남을 수 있습니다.`
      : `${setting}에서 작은 것을 기억해 챙겨 왔다면, ${label} 감정선의 조용히 행동에 담는 표현을 함께 읽습니다. 나도 기억해 줬으면 했던 것을 짧게 말했을 때 상대가 실제로 챙겨 줬다면, 말없이 알아주길 바란 마음이 서로 기억해 가는 경험으로 달라질 여지가 있습니다.`;
    meaning = curved ? "늘 괜찮다고 말하던 모습을 잠시 내려놓아도 함께한 믿음이 작아지지는 않을 수 있습니다. 도움을 청한 마음을 들어 주는 시간이 관계의 새로운 편안함으로 남을 여지가 있습니다."
      : "잘해 준 만큼 되돌아와야 한다는 셈보다 나에게도 소중한 한 가지를 알리는 선택이 조용했던 마음을 서로 알아보는 경험으로 이어질 수 있습니다.";
  }
  const other = observed[1];
  if (other && other.line.curve !== primary.line.curve) {
    meaning += key === "headLine" ? " 두 사진의 두뇌선 모양이 달라, 예를 넓혀 이해할 때와 한 뜻으로 정리해 전할 때의 만족도 함께 살펴볼 수 있습니다."
      : " 두 사진의 감정선 모양이 달라 함께 읽으면, 말로 나누고 싶었던 마음과 작은 행동에 남겨 둔 마음을 같은 크기로 표현할 필요는 없을 수 있습니다.";
  }
  return { story: { ...story, scene, meaning }, refs, mode: key === "headLine" ? curved ? "head-curved" : "head-straight" : curved ? "heart-curved" : "heart-straight" };
}

export function buildPremiumMonthNarrative(facts: SajuFacts, month: SajuAnnualMonthOutlook, previous: SajuAnnualMonthOutlook | null,
  context: MonthReadingContext = {}): { plan: ReadingPlan; symbols: AnnualMonthSymbols } {
  const symbols = describeAnnualMonthSymbols(facts, month);
  const { stemTenGod: stem, branchTenGod: branch } = symbols.month;
  const evidence: ReadingEvidence[] = [
    { id: "month-stem", kind: "calculated", source: "monthly pillar stem compared with facts.dayStem", value: `${symbols.month.stem}:${stem ?? "미확인"}` },
    { id: "month-branch", kind: "calculated", source: "monthly branch main hidden stem compared with facts.dayStem", value: `${symbols.month.branch}:${branch ?? "미확인"}` },
  ];
  if (!stem || !branch || !TEN_GOD_GROUP[stem] || !TEN_GOD_GROUP[branch]) {
    return { symbols, plan: { headline: "이 달의 관점은 아직 정하지 않습니다", evidence,
      passages: [{ id: "month-unconfirmed", kind: "observation", text: "계산에서 월별 상징을 충분히 확인하지 못해 이 달의 세부 풀이는 남겨 두었습니다.", evidenceIds: ["month-stem", "month-branch"] }], limits: [] } };
  }
  const anchor = natalAnchor(facts, stem, branch);
  const area = anchor?.pillar.pillar ?? "year";
  const refs = ["month-stem", "month-branch"];
  if (anchor) {
    const { pillar, part, god } = anchor;
    evidence.push({ id: "natal-anchor", kind: "calculated", source: `facts.pillars.${pillar.pillar}.${part}TenGod`, value: `${PILLAR_LABEL[pillar.pillar]}${part === "stem" ? "간" : "지"} ${Array.from(pillar.ganzhi)[part === "stem" ? 0 : 1]}/${god}` });
    refs.push("natal-anchor");
  }
  const base = composeMonthStory(stem, branch, area, anchor?.god ?? null);
  const observed = withObservedScene(base, stem, branch, area, context, evidence);
  const year = buildPremiumYearNarrative(symbols.year);
  const story = composeMonthStory(stem, branch, area, anchor?.god ?? null, { year, observedStory: observed.story, mode: observed.mode });
  if (year) {
    evidence.push({ id: "year-stem", kind: "calculated", source: "annual pillar stem compared with facts.dayStem", value: `${symbols.year.stem}:${year.stemGod}` },
      { id: "year-branch", kind: "calculated", source: "annual branch main hidden stem compared with facts.dayStem", value: `${symbols.year.branch}:${year.branchGod}` });
  }
  const scene = story.scene;
  const passages: ReadingPlan["passages"] = [
    { id: "month-relation", kind: "traditional", text: story.opening, evidenceIds: ["month-stem", "month-branch"] },
    { id: "month-lived-scene", kind: "reflection", text: scene, evidenceIds: [...refs, ...observed.refs, ...(year ? ["year-stem"] : [])] },
    { id: "month-lived-resolution", kind: "reflection", text: story.meaning, evidenceIds: [...refs, ...observed.refs, ...(year ? ["year-branch"] : [])] },
  ];
  if (previous) {
    const prior = describeAnnualMonthSymbols(facts, previous);
    if (prior.month.stemTenGod && prior.month.branchTenGod) {
      const priorStory = composeMonthStory(prior.month.stemTenGod, prior.month.branchTenGod, area, null);
      if (priorStory.headline !== story.headline) {
        // Compare lived meanings with the relation; no extra author-facing
        // paragraph that merely repeats both headings.
        const priorGod = prior.month.branchTenGod;
        const continuity = monthMeaningContinuity(priorGod, stem, branch);
        if (continuity && !(stem === "상관" && branch === "정재")) {
          evidence.push({ id: "previous-month-symbols", kind: "calculated", source: "previous annual month pillar compared with facts.dayStem", value: `${prior.month.ganzhi}:${prior.month.stemTenGod}/${prior.month.branchTenGod}` });
          passages[0].text += ` ${continuity}`;
          passages[0].evidenceIds.push("previous-month-symbols");
        }
      }
    }
  }
  const plan: ReadingPlan = { headline: story.headline, passages, evidence, limits: [] };
  validateReadingPlan(plan);
  return { plan, symbols };
}
