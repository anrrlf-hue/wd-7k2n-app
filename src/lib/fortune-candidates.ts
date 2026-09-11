// "내 운세 지도" — 무료 통합 리포트가 끝난 뒤, 사용자가 지금 가장 궁금한
// 운 하나를 직접 고르는 화면의 데이터 레이어. TRUTH RULE: 전환에 좋은
// 문구를 먼저 정하고 거기 맞춰 사주 해석을 짜내지 않는다 — 이미 SajuFacts에
// 있는 실제 값만 재사용해서 후보별 문구를 만든다.
//
// 이번 라운드 변경:
//  - currentFlow/nextShift가 나이 구간만 인용하던 걸(§7), 실제 대운의
//    십성(stemTenGod/branchTenGod — 이미 SajuFacts에 있던 값인데 안 쓰고
//    있었다)을 반영해 "그 구간이 어떤 성격인지 + 생활에서 어떻게 나타날
//    수 있는지"까지 담도록 깊게 만들었다.
//  - deeperQuestion/paywall 문구를 고정 문구에서 situationCopy(현재상황
//    응답별 문구)로 바꿨다(§8) — 지금까지는 상황을 골라도 analytics에만
//    남고 다음 화면이 똑같았다. 이제 상황 선택값이 실제로 다음 질문·
//    Paywall 제목/항목·CTA를 바꾼다.
//  - "언제 강해질까요?"류 타이밍 중심 질문을 "그래서 지금 나는 무엇을
//    해야 하는가" 행동 중심 질문으로 바꿨다(§9). 시기는 paywallItems의
//    한 줄로만 남긴다.
//  - career_business의 "재성+식상 > 비겁+관성 = 사업형" 이분법을 3구간
//    (business/balanced/stable)으로 완화했다 — 차이가 크지 않을 때 억지로
//    한쪽으로 단정하지 않는다(§6).
//  - change_opportunity의 compareNote는 depthStrength(생명선 두께 근사치)
//    기반 활력 해석을 제거하면서 같이 없앴다 — 생명선에 안전하게 쓸 수
//    있는 대체 근거가 없어 이 축은 손금 비교 자체를 만들지 않는다(§5).
//  - wealth_timing의 compareNote는 "감정선이 있다/없다"만 보던 걸 곡률
//    기반으로 바꿨다 — 선이 검출됐다는 사실 자체로 성향을 판정하지 않는다(§3).

import type { SajuFacts, DaeunFact } from "@/lib/saju-facts";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type FortuneInterestId = "wealth_timing" | "career_business" | "change_opportunity";

export interface SituationOption {
  label: string;
  value: string;
}

/** 현재상황 응답 하나에 대응하는 개인화 카피. deeperQuestion/ctaLabel은
 * 미니리딩의 "더 보기" 버튼에, paywallTitle/paywallItems는 그 다음 결제창에
 * 그대로 이어진다 — 상황을 바꿔 고르면 이 네 가지가 실제로 달라진다. */
export interface SituationCopy {
  deeperQuestion: string;
  ctaLabel: string;
  paywallTitle: string;
  paywallItems: string[];
}

export interface FortuneCandidate {
  id: FortuneInterestId;
  label: string;
  /** 왜 이 사람에게 이 후보가 관련 있는지 — 실제 근거 기반, 전문용어 없이 */
  reason: string;
  /** 무료 16섹션에서 이미 중심적으로 다룬 영역이면 true(단순 완료 표시용, 가짜 진행률 아님) */
  alreadyCovered: boolean;
  bornWay: string;
  currentFlow: string;
  nextShift: string;
  /** 손금에서 안전하게 비교할 수 있는 근거가 실제로 있을 때만 채워진다 —
   * 없으면 null(억지 비교 없음) */
  compareNote: string | null;
  futureScene: string;
  situation: { question: string; options: SituationOption[] };
  situationCopy: Record<string, SituationCopy>;
}

/** 대운 십성(stemTenGod)이 실제로 어떤 결의 10년인지 — 표준 명리 이론의
 * 십성 성격을 그대로 옮긴 것으로, 이번 라운드에 새로 지어낸 판정이 아니다.
 * 지지 십성(branchTenGod)만 있는 경우를 위해 두 값 다 조회해서 쓴다.
 * real-world-personalization.ts의 buildNextMove/buildTimingShift도 이
 * 테이블을 그대로 재사용한다 — 대운 결을 두 군데서 다르게 말하지 않기 위해. */
export const DAEUN_FLAVOR: Record<string, string> = {
  비견: "스스로의 힘으로 밀고 나가는",
  겁재: "경쟁하거나 나눠 가지는 일이 자주 생기는",
  식신: "차분하게 만들고 누리는",
  상관: "표현하고 부딪히는 일이 많아지는",
  편재: "여러 곳에서 기회가 오갔다 하는",
  정재: "꾸준하고 안정적으로 쌓이는",
  편관: "부담이 있지만 그만큼 단련되는",
  정관: "규칙과 책임 안에서 인정받는",
  편인: "혼자 깊이 파고들고 싶어지는",
  정인: "배우고 도움받는 일이 많아지는",
};

export function daeunFlavor(daeun: DaeunFact): string {
  return DAEUN_FLAVOR[daeun.stemTenGod] ?? DAEUN_FLAVOR[daeun.branchTenGod] ?? "여러 기운이 섞인";
}

/** 재성+식상(스스로 벌이는 힘) vs 비겁+관성(체계 안에서 크는 힘) 상대비교.
 * buildFortuneCandidates 내부에 있던 로직을 그대로 뽑아 export만 한
 * 것 — 판정 자체는 바뀌지 않는다(selectPrimaryCandidate가 재사용). */
export function deriveCareerLeaning(facts: SajuFacts): "business" | "stable" | "balanced" {
  const activeGap = facts.wealthStarCount + facts.outputStarCount - (facts.peerStarCount + facts.officerStarCount);
  return activeGap >= 2 ? "business" : activeGap <= -2 ? "stable" : "balanced";
}

/** 현재→다음 대운 사이에 십성이 실제로 바뀌는지. buildFortuneCandidates
 * 내부에 있던 로직을 그대로 뽑아 export만 한 것. */
export function deriveDaeunShift(facts: SajuFacts): boolean {
  const { currentDaeun, nextDaeun } = facts;
  return Boolean(
    currentDaeun && nextDaeun && (currentDaeun.stemTenGod !== nextDaeun.stemTenGod || currentDaeun.branchTenGod !== nextDaeun.branchTenGod),
  );
}

export function buildFortuneCandidates(facts: SajuFacts, onnxLines?: OnnxPalmLines | null): FortuneCandidate[] {
  const {
    wealthStarCount,
    officerStarPillars,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    currentDaeun,
    nextDaeun,
  } = facts;

  // ---------- 재물의 다음 흐름 ----------
  const wealthHeartCurve = onnxLines?.heartLine.detected ? onnxLines.heartLine.curve : null;
  const wealthTiming: FortuneCandidate = {
    id: "wealth_timing",
    label: "재물의 다음 흐름",
    reason:
      wealthOpportunityDaeunCount > 0
        ? "평생 대운을 보면 재물 기운이 겹치는 시기가 여러 차례 옵니다. 그 시기를 미리 짚어두면 도움이 됩니다."
        : "재물이 원국에 직접 드러나 있지는 않지만, 그래서 오히려 시기와 방식을 잡아드리는 게 더 중요합니다.",
    alreadyCovered: true,
    bornWay:
      wealthStarCount === 0
        ? "이 사주는 재물이 저절로 들어오는 구조가 아닙니다. 본업이나 전문성으로 번 돈이 쌓이는 흐름에 가깝습니다."
        : "이 사주는 재물을 다루는 힘을 타고났습니다.",
    currentFlow: currentDaeun
      ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(currentDaeun)} 시기입니다. 돈이 들어오고 나가는 흐름 자체가 평소와 다르게 느껴질 수 있습니다.`
      : "출생시간이 없어 현재 대운은 짚어드리기 어렵습니다.",
    nextShift: nextDaeun
      ? `다음 대운(${nextDaeun.ageRange}세부터)으로 넘어가면 ${daeunFlavor(nextDaeun)} 쪽으로 결이 바뀝니다. 지금까지 돈을 대하던 방식 하나가 자연스럽게 낡고, 새로운 방식이 그 자리를 채우게 됩니다.`
      : "다음 대운은 아직 계산되지 않았습니다.",
    compareNote:
      wealthHeartCurve === null
        ? null
        : wealthHeartCurve === "완만한 곡선"
          ? "손의 감정선도 완만한 곡선입니다. 돈과 관련된 결정에서도 관계와 감정이 함께 작용하는 편입니다."
          : "손의 감정선이 직선에 가깝습니다. 감정보다 원칙 위주로 판단하는 결입니다.",
    futureScene: "큰돈을 움직이거나 중요한 선택을 앞뒀을 때는, 움직일 때와 지킬 때를 구분하는 것이 중요합니다.",
    situation: {
      question: "지금 재물 상황이 어떠세요?",
      options: [
        { label: "안정적으로 유지 중", value: "stable" },
        { label: "변화가 필요하다고 느낌", value: "need_change" },
        { label: "새로운 기회를 찾는 중", value: "seeking" },
        { label: "그냥 앞으로가 궁금함", value: "curious" },
      ],
    },
    situationCopy: {
      stable: {
        deeperQuestion: "지금처럼 안정적으로 유지하는 것과 별개로, 이 흐름을 더 키우려면 지금 뭘 해야 할까요?",
        ctaLabel: "지금 흐름, 어떻게 키울지 보기",
        paywallTitle: "그래서 지금 이 흐름을 어떻게 더 키워야 할까요",
        paywallItems: ["지금 흐름을 키우는 데 실제로 도움 되는 행동", "무리하지 않고 시도해볼 만한 다음 단계", "흐름이 달라지는 시기"],
      },
      need_change: {
        deeperQuestion: "변화가 필요하다고 느끼는 지금, 무엇부터 바꾸고 어떤 기준으로 움직여야 할까요?",
        ctaLabel: "뭐부터 바꿔야 할지 보기",
        paywallTitle: "그래서 저는 지금 뭐부터 바꿔야 할까요",
        paywallItems: ["지금 상황에 맞는 변화 방향", "먼저 정리하면 좋을 것", "흐름이 달라지는 시기"],
      },
      seeking: {
        deeperQuestion: "새 기회를 찾는 지금, 어떤 기준으로 고르고 무엇을 준비해야 할까요?",
        ctaLabel: "이 기회, 잡아도 될지 보기",
        paywallTitle: "지금 이 기회를 어떤 기준으로 판단해야 할까요",
        paywallItems: ["기회를 판단하는 기준", "먼저 준비해두면 좋을 것", "흐름이 달라지는 시기"],
      },
      curious: {
        deeperQuestion: "그래서 지금 나는 이 흐름을 어떻게 활용해야 할까요?",
        ctaLabel: "내가 지금 뭘 해야 할지 보기",
        paywallTitle: "그래서 지금 저는 뭘 해야 할까요",
        paywallItems: ["지금 흐름을 실제로 활용하는 방식", "먼저 준비하면 좋을 것과 피해야 할 행동 패턴", "흐름이 달라지는 시기"],
      },
    },
  };

  // ---------- 직장·사업의 흐름 ----------
  // 차이가 작으면(-1~1) 단정하지 않고 균형형으로 본다.
  const careerLeaning = deriveCareerLeaning(facts);
  const careerHead = onnxLines?.headLine.detected ? onnxLines.headLine.curve : null;
  const careerBusiness: FortuneCandidate = {
    id: "career_business",
    label: "직장·사업의 흐름",
    reason:
      careerLeaning === "business"
        ? "스스로 판을 짜는 쪽에 가까운 신호가 뚜렷합니다. 그 힘을 언제 어떻게 쓰면 좋을지 짚어드릴 수 있습니다."
        : careerLeaning === "stable"
          ? "정해진 체계 안에서 크는 쪽 신호가 뚜렷합니다. 그 안에서 어떻게 움직이면 좋을지 짚어드릴 수 있습니다."
          : "스스로 벌이는 힘과 체계 안에서 크는 힘이 비슷하게 섞여 있습니다. 지금 어느 쪽에 무게를 둬야 하는지가 관건입니다.",
    alreadyCovered: false,
    bornWay:
      careerLeaning === "business"
        ? "이 사주는 직장에 오래 묶여 있기보다, 성과가 바로 결과로 연결되는 일이 더 맞습니다. 조직 안에 있더라도 스스로 기획하고 밀어붙이는 역할일 때 성과가 따라옵니다."
        : careerLeaning === "stable"
          ? `이 사주는 안정적인 틀 안에서 신뢰를 쌓아가는 쪽이 더 맞습니다. ${officerStarPillars.length > 0 ? "역할과 책임이 분명한 환경일수록 오히려 힘이 붙습니다." : "정해진 규칙과 역할이 있는 환경에서 크게 성장합니다."}`
          : "이 사주는 혼자 판을 짜는 쪽도, 체계에 기대는 쪽도 아닙니다. 지금 맡은 역할이 어느 쪽에 가까운지에 따라 결과가 갈립니다.",
    currentFlow: currentDaeun
      ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(currentDaeun)} 시기입니다. 일에서 체감하는 압박이나 기회의 종류가 평소와는 다른 결로 다가올 수 있습니다.`
      : "출생시간이 없어 현재 대운은 짚어드리기 어렵습니다.",
    nextShift: nextDaeun
      ? `다음 대운(${nextDaeun.ageRange}세부터)으로 넘어가면 ${daeunFlavor(nextDaeun)} 쪽으로 결이 바뀝니다. 지금 맞다고 느끼는 일하는 방식 하나가 그때부턴 오히려 안 맞을 수 있습니다.`
      : "다음 대운은 아직 계산되지 않았습니다.",
    compareNote:
      careerHead === null
        ? null
        : careerHead === "완만한 곡선"
          ? "손의 두뇌선도 완만한 곡선입니다. 정해진 틀보다 유연하게 판단하는 결입니다."
          : "손의 두뇌선이 직선에 가깝습니다. 계산하고 따지는 결입니다.",
    futureScene: "새로운 제안이나 독립을 앞뒀을 때는, 밀고 나가는 게 맞는지 기다리는 게 맞는지가 관건이 됩니다.",
    situation: {
      question: "지금 일 관련해서 어떤 상황에 가까우세요?",
      options: [
        { label: "현재 직장 유지", value: "keep_job" },
        { label: "이직 고민", value: "considering_move" },
        { label: "독립·사업 고민", value: "considering_independent" },
        { label: "새로운 역할·제안", value: "new_offer" },
        { label: "단순히 앞으로가 궁금함", value: "curious" },
      ],
    },
    situationCopy: {
      keep_job: {
        deeperQuestion: "지금 자리를 지키기로 한 만큼, 그 안에서 어떻게 움직여야 이 흐름을 제대로 쓸 수 있을까요?",
        ctaLabel: "이 자리에서 뭘 노려야 할지 보기",
        paywallTitle: "지금 이 자리에서 저는 뭘 노려야 할까요",
        paywallItems: ["지금 자리에서 취할 행동 전략", "인정받는 타이밍을 판단하는 기준", "흐름이 달라지는 시기"],
      },
      considering_move: {
        deeperQuestion: "이직을 고민 중인 지금, 무엇을 준비하고 어떤 기준으로 움직여야 할까요?",
        ctaLabel: "이직, 지금이 맞는 타이밍인지 보기",
        paywallTitle: "이직, 지금 움직이는 게 맞을까요",
        paywallItems: ["이직 타이밍을 판단하는 기준", "지금부터 준비하면 좋을 것", "흐름이 달라지는 시기"],
      },
      considering_independent: {
        deeperQuestion: "독립을 고민 중인 지금, 어떤 준비가 먼저 필요할까요?",
        ctaLabel: "독립, 뭐부터 준비할지 보기",
        paywallTitle: "독립하려면 뭐부터 준비해야 할까요",
        paywallItems: ["먼저 준비해야 할 것", "피해야 할 행동 패턴", "흐름이 달라지는 시기"],
      },
      new_offer: {
        deeperQuestion: "새로운 제안을 받은 지금, 어떤 기준으로 받아들이거나 미뤄야 할까요?",
        ctaLabel: "이 제안, 받아도 될지 보기",
        paywallTitle: "이 제안, 저는 받는 게 맞을까요",
        paywallItems: ["제안을 받아들일지 판단하는 기준", "지금 상황에 맞춘 행동 전략", "흐름이 달라지는 시기"],
      },
      curious: {
        deeperQuestion: "그래서 지금 나는 이 일의 흐름을 어떻게 써야 할까요?",
        ctaLabel: "내가 지금 뭘 해야 할지 보기",
        paywallTitle: "그래서 지금 저는 일을 어떻게 풀어가야 할까요",
        paywallItems: ["지금 상황에 맞춘 행동 전략", "기회를 판단하는 기준", "흐름이 달라지는 시기"],
      },
    },
  };

  // ---------- 변화·기회의 흐름 ----------
  const daeunShift = deriveDaeunShift(facts);
  const changeOpportunity: FortuneCandidate = {
    id: "change_opportunity",
    label: "변화·기회의 흐름",
    reason:
      peakStagePillars.length > 0
        ? "기회를 감지하는 힘을 원국에 타고났습니다. 그 타이밍을 미리 짚어두면 도움이 됩니다."
        : "변화가 꾸준히 이어지는 구조입니다. 지금이 어떤 시점인지 짚어드릴 수 있습니다.",
    alreadyCovered: false,
    bornWay:
      peakStagePillars.length > 0
        ? "이 사주는 정점의 기운이 뚜렷한 자리가 있어, 기회가 왔을 때 몸이 먼저 반응합니다."
        : "이 사주는 순발력보다 꾸준함으로 기회를 만들어가는 쪽입니다.",
    currentFlow: currentDaeun
      ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운은 ${daeunFlavor(currentDaeun)} 시기입니다. 평소라면 그냥 지나쳤을 제안이나 만남이 유독 눈에 걸릴 수 있습니다.`
      : "출생시간이 없어 현재 대운은 짚어드리기 어렵습니다.",
    nextShift:
      daeunShift && nextDaeun
        ? `다음 대운(${nextDaeun.ageRange}세부터)으로 넘어가면 ${daeunFlavor(nextDaeun)} 쪽으로 결이 바뀝니다. 구간마다 흐름이 뚜렷하게 갈리는 사주입니다.`
        : "지금 흐름이 비교적 꾸준하게 이어지는 사주입니다.",
    // 생명선 두께(depthStrength)로 활력·변화 대응력을 추론하지 않는다(§5).
    // 생명선에 안전하게 쓸 수 있는 다른 손금 근거가 없어 이 축은 비교를
    // 만들지 않는다 — 억지로 일치·차이를 만드는 것보다 정직하다.
    compareNote: null,
    futureScene: "예상치 못한 제안이나 선택의 갈림길에 섰을 때는, 그 타이밍이 진짜 기회인지 아닌지를 보는 게 중요해집니다.",
    situation: {
      question: "지금 변화에 대해 어떻게 느끼세요?",
      options: [
        { label: "새로운 기회를 기다리는 중", value: "waiting" },
        { label: "변화가 다가오는 걸 느낌", value: "sensing_change" },
        { label: "지금이 움직일 때인지 고민 중", value: "considering_timing" },
        { label: "그냥 앞으로가 궁금함", value: "curious" },
      ],
    },
    situationCopy: {
      waiting: {
        deeperQuestion: "기회를 기다리는 지금, 무엇을 준비해두면 놓치지 않을까요?",
        ctaLabel: "이 기회, 놓치지 않으려면 보기",
        paywallTitle: "이 기회, 놓치지 않으려면 뭘 준비해야 할까요",
        paywallItems: ["기회를 판단하는 기준", "미리 준비해두면 좋을 것", "흐름이 달라지는 시기"],
      },
      sensing_change: {
        deeperQuestion: "변화가 다가오는 걸 느끼는 지금, 무엇부터 준비해야 할까요?",
        ctaLabel: "이 변화, 놓치지 않으려면 보기",
        paywallTitle: "다가오는 이 변화, 저는 뭐부터 준비해야 할까요",
        paywallItems: ["지금 먼저 준비하면 좋을 것", "피해야 할 행동 패턴", "흐름이 달라지는 시기"],
      },
      considering_timing: {
        deeperQuestion: "움직일 때인지 고민 중인 지금, 어떤 기준으로 판단해야 할까요?",
        ctaLabel: "지금이 그 타이밍인지 보기",
        paywallTitle: "지금이 정말 움직일 때가 맞을까요",
        paywallItems: ["움직일 타이밍을 판단하는 기준", "먼저 점검해두면 좋을 것", "흐름이 달라지는 시기"],
      },
      curious: {
        deeperQuestion: "그래서 지금 나는 이 변화·기회를 어떻게 써야 할까요?",
        ctaLabel: "내가 지금 뭘 해야 할지 보기",
        paywallTitle: "그래서 지금 저는 이 변화를 어떻게 써야 할까요",
        paywallItems: ["기회를 판단하는 기준", "지금 먼저 준비하면 좋을 것", "흐름이 달라지는 시기"],
      },
    },
  };

  return [wealthTiming, careerBusiness, changeOpportunity];
}

/** 3개 후보 중 "지금 가장 중요한 흐름" 1개를 고른다. 새 가중치를 만들지
 * 않고, 각 후보를 만들 때 이미 쓰던 신호(재물 대운 존재/직장·사업 기울기/
 * 대운 전환 또는 정점 자리)를 그대로 재사용해 첫 번째로 걸리는 걸 고른다.
 * 셋 다 안 걸리면 wealthTiming을 기본값으로 — "재물"이 이 서비스의
 * 핵심 질문이라 기본 우선순위로 둔다. 사용자는 이후 화면에서 다른 후보로
 * 언제든 바꿔 볼 수 있다(추천은 순서만 바꿀 뿐 선택지를 줄이지 않는다). */
export function selectPrimaryCandidate(facts: SajuFacts, candidates: FortuneCandidate[]): FortuneCandidate {
  const strongSignal: Record<FortuneInterestId, boolean> = {
    wealth_timing: facts.wealthOpportunityDaeunCount > 0,
    career_business: deriveCareerLeaning(facts) !== "balanced",
    change_opportunity: deriveDaeunShift(facts) || facts.peakStagePillars.length > 0,
  };
  return candidates.find((c) => strongSignal[c.id]) ?? candidates[0];
}
