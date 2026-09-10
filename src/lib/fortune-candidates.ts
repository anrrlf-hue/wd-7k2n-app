// "내 운세 지도" — 무료 통합 리포트가 끝난 뒤, 사용자가 지금 가장 궁금한
// 운 하나를 직접 고르는 화면의 데이터 레이어. TRUTH RULE: 전환에 좋은
// 문구를 먼저 정하고 거기 맞춰 사주 해석을 짜내지 않는다 — 이미 SajuFacts에
// 있는 실제 값만 재사용해서 후보별 문구를 만든다.
//
// 이번 라운드 변경:
//  - 자동 순위화(wealthScore/careerScore/...) 휴리스틱을 제거했다.
//    "전문적으로 검증된 공통 비교척도가 없으면 자동추천하지 않는다"는
//    요구에 따라, 이제 3개 후보를 고정된 순서로 그대로 제시하고 사용자가
//    직접 고른다 — 순위를 매겨 우선순위를 암시하지 않는다.
//  - "인연·사람의 흐름" 후보를 이번 라운드에서 제외했다(§7: 이번 우선
//    선택지는 재물/직장·사업/변화·기회 3개).
//  - reason/미니리딩 문구에서 "재성 2개", "비겁+관성" 같은 원자료 인용을
//    모두 뺐다 — 실제 숫자는 여전히 이 함수 내부에서 조건 분기에 쓰이지만
//    화면에 보이는 문장 자체에는 등장하지 않는다.
//  - 미니리딩을 1~2문장에서 "타고난 방식 / 현재 대운 흐름 / 다음 흐름 변화
//    / 손금과의 비교(있으면) / 생활 속 미래 장면 / 다음 질문 하나"로
//    확장했다 — 화면 수가 아니라 실제 새 정보량을 늘리는 방향.
//  - 미니리딩 뒤에 재무정보를 묻지 않는 현재상황 1문항을 추가했다(§9).

import type { SajuFacts } from "@/lib/saju-facts";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type FortuneInterestId = "wealth_timing" | "career_business" | "change_opportunity";

export interface SituationOption {
  label: string;
  value: string;
}

export interface FortuneCandidate {
  id: FortuneInterestId;
  label: string;
  /** 왜 이 사람에게 이 후보가 관련 있는지 — 실제 근거 기반, 전문용어 없이 */
  reason: string;
  /** 무료 17섹션에서 이미 중심적으로 다룬 영역이면 true(단순 완료 표시용, 가짜 진행률 아님) */
  alreadyCovered: boolean;
  bornWay: string;
  currentFlow: string;
  nextShift: string;
  /** 손금 관련 선이 실제로 검출됐을 때만 채워진다 — 없으면 null(억지 비교 없음) */
  compareNote: string | null;
  futureScene: string;
  deeperQuestion: string;
  deeperCTA: string;
  situation: { question: string; options: SituationOption[] };
  paywallTitle: string;
  paywallItems: string[];
  paywallCTA: string;
}

export function buildFortuneCandidates(facts: SajuFacts, onnxLines?: OnnxPalmLines | null): FortuneCandidate[] {
  const {
    wealthStarCount,
    outputStarCount,
    peerStarCount,
    officerStarCount,
    officerStarPillars,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    currentDaeun,
    nextDaeun,
  } = facts;

  // ---------- 재물의 다음 흐름 ----------
  const wealthHeart = onnxLines?.heartLine.detected ?? null;
  const wealthTiming: FortuneCandidate = {
    id: "wealth_timing",
    label: "재물의 다음 흐름",
    reason:
      wealthOpportunityDaeunCount > 0
        ? "평생 흐름 중에 재물 기운이 함께 오는 구간이 있어서, 시기까지 이어보면 궁금해질 만해요."
        : "재물이 원국에 직접 드러나 있진 않지만, 그래서 오히려 시기와 방식이 더 궁금할 수 있어요.",
    alreadyCovered: true,
    bornWay:
      wealthStarCount === 0
        ? "재물이 저절로 굴러들어오는 타입은 아니에요. 본업이나 전문성이 돈으로 바뀌는 흐름에 가까운 쪽이에요."
        : "타고난 원국 자체에 재물을 다루는 힘이 자리 잡고 있는 편이에요.",
    currentFlow: currentDaeun
      ? `지금은 ${currentDaeun.ageRange}세 구간을 지나는 중이에요.`
      : "현재 구간 데이터는 이번 계산에서 확인되지 않았어요.",
    nextShift: nextDaeun
      ? `다음 구간(${nextDaeun.ageRange}세부터)으로 넘어가면 돈을 대하는 힘의 균형 자체가 한 번 바뀌어요.`
      : "다음 구간 데이터는 이번 계산에서 확인되지 않았어요.",
    compareNote:
      wealthHeart === null
        ? null
        : wealthHeart
          ? "손에서도 감정선이 뚜렷하게 보여서, 돈 관련 결정에 감정·관계가 함께 작용하는 흐름이 손에도 나타났어요."
          : "손에서는 감정선이 뚜렷하게 보이지 않아서, 감정보다 원칙 위주로 판단하는 쪽에 가까울 수 있어요.",
    futureScene: "큰돈을 움직이거나 중요한 선택을 해야 할 때, 움직일 때와 지킬 때의 차이를 보는 것이 중요해질 수 있어요.",
    deeperQuestion: "그렇다면 이 흐름이 실제로 언제 강해지는지, 궁금하지 않아요?",
    deeperCTA: "내 중요한 시기 이어서 보기",
    situation: {
      question: "지금 재물 상황을 어떻게 느끼고 있어요?",
      options: [
        { label: "안정적으로 유지 중", value: "stable" },
        { label: "변화가 필요하다고 느낌", value: "need_change" },
        { label: "새로운 기회를 찾는 중", value: "seeking" },
        { label: "그냥 앞으로가 궁금함", value: "curious" },
      ],
    },
    paywallTitle: "지금 이 재물 흐름을 어떻게 써야 할까요",
    paywallItems: [
      "지금 흐름을 실제로 활용하는 방식",
      "먼저 준비하면 좋을 것과 피해야 할 행동 패턴",
      "흐름이 달라지는 시기",
    ],
    paywallCTA: "내 재물운 행동 가이드 열어보기",
  };

  // ---------- 직장·사업의 흐름 ----------
  const activeGap = wealthStarCount + outputStarCount - (peerStarCount + officerStarCount);
  const careerLeaning: "business" | "stable" = activeGap > 0 ? "business" : "stable";
  const careerHead = onnxLines?.headLine.detected ? onnxLines.headLine.curve : null;
  const careerBusiness: FortuneCandidate = {
    id: "career_business",
    label: "직장·사업의 흐름",
    reason:
      careerLeaning === "business"
        ? "스스로 판을 짜는 쪽에 가까운 신호가 뚜렷해서, 그 힘을 언제 어떻게 쓰면 좋을지 궁금해질 수 있어요."
        : "정해진 체계 안에서 크는 쪽 신호가 뚜렷해서, 그 안에서 어떻게 움직이면 좋을지 궁금해질 수 있어요.",
    alreadyCovered: false,
    bornWay:
      careerLeaning === "business"
        ? "성과가 직접 보이는 구조에서 힘을 발휘하는 편이에요. 조직 안에 있더라도 스스로 기획하고 밀어붙이는 역할일 때 결과가 더 잘 따라와요."
        : `안정적인 틀 안에서 신뢰를 쌓아가는 쪽이 더 잘 맞아요. ${officerStarPillars.length > 0 ? "역할과 책임이 분명한 환경일수록 오히려 힘이 붙어요." : "정해진 규칙과 역할이 있는 환경에서 크게 성장해요."}`,
    currentFlow: currentDaeun
      ? `지금은 ${currentDaeun.ageRange}세 구간을 지나는 중이에요.`
      : "현재 구간 데이터는 이번 계산에서 확인되지 않았어요.",
    nextShift: nextDaeun
      ? `다음 구간(${nextDaeun.ageRange}세부터)으로 넘어가면 일을 대하는 힘의 방향이 한 번 바뀌어요.`
      : "다음 구간 데이터는 이번 계산에서 확인되지 않았어요.",
    compareNote:
      careerHead === null
        ? null
        : careerHead === "완만한 곡선"
          ? "손에서도 두뇌선이 완만한 곡선으로 나와서, 정해진 틀보다 유연하게 판단하는 결이 손에도 보여요."
          : "손에서도 두뇌선이 직선에 가까워서, 계산하고 따지는 결이 손에도 보여요.",
    futureScene: "새로운 제안이나 독립적인 선택을 앞뒀을 때, 밀고 나가는 게 맞는지 기다리는 게 맞는지가 더 중요해질 수 있어요.",
    deeperQuestion: "그 타이밍을 미리 알 수 있다면 어떨까요?",
    deeperCTA: "내 직장·사업 흐름 더 깊게 보기",
    situation: {
      question: "지금 일 관련해서 어떤 상황에 가까워요?",
      options: [
        { label: "현재 직장 유지", value: "keep_job" },
        { label: "이직 고민", value: "considering_move" },
        { label: "독립·사업 고민", value: "considering_independent" },
        { label: "새로운 역할·제안", value: "new_offer" },
        { label: "단순히 앞으로가 궁금함", value: "curious" },
      ],
    },
    paywallTitle: "지금 이 일의 흐름을 어떻게 써야 할까요",
    paywallItems: [
      "지금 상황에 맞춘 행동 전략",
      "기회를 판단하는 기준",
      "흐름이 달라지는 시기",
    ],
    paywallCTA: "내 일의 흐름 행동 가이드 열어보기",
  };

  // ---------- 변화·기회의 흐름 ----------
  const daeunShift = Boolean(
    currentDaeun && nextDaeun && (currentDaeun.stemTenGod !== nextDaeun.stemTenGod || currentDaeun.branchTenGod !== nextDaeun.branchTenGod),
  );
  const changeLife = onnxLines?.lifeLine.detected ? onnxLines.lifeLine.depthStrength : null;
  const changeOpportunity: FortuneCandidate = {
    id: "change_opportunity",
    label: "변화·기회의 흐름",
    reason:
      peakStagePillars.length > 0
        ? "기회를 감지하는 힘이 원국에 뚜렷해서, 그 타이밍을 미리 아는 게 도움이 될 수 있어요."
        : "변화가 꾸준히 이어지는 구조라, 지금이 어떤 시점인지 궁금해질 수 있어요.",
    alreadyCovered: false,
    bornWay:
      peakStagePillars.length > 0
        ? "정점의 기운이 뚜렷한 자리가 있어서, 기회가 왔을 때 몸이 먼저 반응하는 편이에요."
        : "순발력보다는 꾸준함으로 기회를 만들어가는 쪽에 가까워요.",
    currentFlow: currentDaeun
      ? `지금은 ${currentDaeun.ageRange}세 구간을 지나는 중이에요.`
      : "현재 구간 데이터는 이번 계산에서 확인되지 않았어요.",
    nextShift:
      daeunShift && nextDaeun
        ? `다음 구간(${nextDaeun.ageRange}세부터)으로 넘어가면 구성 자체가 바뀌어요 — 구간마다 결이 뚜렷하게 갈리는 원국이라는 뜻이에요.`
        : "지금 흐름이 비교적 꾸준하게 이어지는 편이에요.",
    compareNote:
      changeLife === null
        ? null
        : changeLife === "강함"
          ? "손에서도 생명선이 뚜렷하게 나타나서, 변화 앞에서 몸으로 먼저 움직이는 활력이 손에도 보여요."
          : "손에서는 생명선이 비교적 옅게 나타나서, 순발력보다 컨디션 관리와 꾸준함이 더 중요할 수 있어요.",
    futureScene: "예상치 못한 제안이나 선택의 갈림길에 섰을 때, 그 타이밍이 진짜 기회인지 아닌지를 보는 게 중요해질 수 있어요.",
    deeperQuestion: "그 변화가 언제 오는지 미리 안다면 어떨까요?",
    deeperCTA: "내 변화의 흐름 더 깊게 보기",
    situation: {
      question: "지금 변화에 대해 어떻게 느끼고 있어요?",
      options: [
        { label: "새로운 기회를 기다리는 중", value: "waiting" },
        { label: "변화가 다가오는 걸 느낌", value: "sensing_change" },
        { label: "지금이 움직일 때인지 고민 중", value: "considering_timing" },
        { label: "그냥 앞으로가 궁금함", value: "curious" },
      ],
    },
    paywallTitle: "지금 이 변화·기회를 어떻게 써야 할까요",
    paywallItems: [
      "기회를 판단하는 기준",
      "지금 먼저 준비하면 좋을 것",
      "흐름이 달라지는 시기",
    ],
    paywallCTA: "내 변화의 흐름 행동 가이드 열어보기",
  };

  return [wealthTiming, careerBusiness, changeOpportunity];
}
