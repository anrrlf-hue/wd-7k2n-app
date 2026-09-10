// "내 운세 지도" — 무료 통합 리포트 이후, 사용자가 지금 가장 궁금한 운
// 하나를 직접 고르게 하는 화면의 데이터 레이어. TRUTH RULE: 전환에 좋은
// 문구를 먼저 정하고 거기 맞춰 사주 해석을 짜내지 않는다 — 이미 SajuFacts에
// 있는 실제 값(재성/식상/관성/인성 개수, 궁위, 길신, 대운 전환, 합충 관계)
// 만 재사용해서 후보별 관련도·문구를 만든다. 새 사주 사실을 지어내지 않는다.
//
// 4개 후보는 전부 이미 이 프로젝트에 있는 실제 필드로 뒷받침된다:
//  - wealth_timing: 재성 개수/궁위, 대운 중 재성 겹침 횟수 (이미 17섹션
//    무료 리포트의 중심 주제라 "이미 확인함" 표시를 붙인다)
//  - career_business: 재성+식상 vs 비겁+관성 우세 비교, 관성 궁위 (jobOrientation과
//    같은 근거)
//  - relationship: 관성+인성 개수(사회적 관계 신호), 실제 합/충 관계 존재
//    (연애 예측이 아니라 "사람을 대하는 방식·관계 흐름"으로 한정 — 근거
//    없는 배우자궁/도화 같은 필드는 이 엔진에 없어서 쓰지 않는다)
//  - change_opportunity: 12운성 정점 궁위, 길신 개수, 현재→다음 대운의
//    십신 전환 여부

import type { SajuFacts, PillarFact } from "@/lib/saju-facts";
import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { MbtiSelfReport } from "@/lib/mbti-facts";
import type { OnnxPalmLines } from "@/lib/palm-facts";

export type FortuneInterestId = "wealth_timing" | "career_business" | "relationship" | "change_opportunity";

export interface FortuneCandidate {
  id: FortuneInterestId;
  label: string;
  /** 왜 이 사람에게 이 후보가 관련 있는지 — 실제 근거 기반 한 줄 */
  reason: string;
  /** 무료 17섹션에서 이미 중심적으로 다룬 영역이면 true(단순 완료 표시용, 가짜 진행률 아님) */
  alreadyCovered: boolean;
  miniReading: string;
  futureScene: string;
  deeperQuestion: string;
  /** 미니리딩 화면의 두 번째 자발적 CTA("더 보기") 문구 — 결제창 CTA와는 다른 문구 */
  deeperCTA: string;
  paywallTitle: string;
  paywallItems: string[];
  paywallCTA: string;
}

function pillarNamesKo(pillars: PillarFact["pillar"][]): string {
  const label: Record<PillarFact["pillar"], string> = { year: "연주", month: "월주", day: "일지", hour: "시주" };
  return pillars.map((p) => label[p]).join(", ");
}

export function buildFortuneCandidates(
  facts: SajuFacts,
  personality?: { check: PersonalityCheckFacts | null; mbti: MbtiSelfReport | null },
  onnxLines?: OnnxPalmLines | null,
): FortuneCandidate[] {
  const {
    wealthStarCount,
    wealthStarPillars,
    outputStarCount,
    peerStarCount,
    officerStarCount,
    officerStarPillars,
    resourceStarCount,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    gilsin,
    keyRelations,
    currentDaeun,
    nextDaeun,
  } = facts;

  const check = personality?.check ?? null;

  // ---------- ① 재물의 흐름/시기 ----------
  const wealthScore = wealthStarCount * 2 + wealthOpportunityDaeunCount;
  const wealthHeartLine = onnxLines?.heartLine.detected
    ? " 손금에서도 감정선이 뚜렷하게 보여서, 돈 관련 결정에 감정·관계가 함께 작용하는 흐름이 손에도 나타났어요."
    : "";
  const wealthTiming: FortuneCandidate = {
    id: "wealth_timing",
    label: "재물의 흐름/시기",
    reason: `재성 ${wealthStarCount}개, 대운 중 재성이 겹치는 구간 ${wealthOpportunityDaeunCount}번 — 이미 본 돈 구조를 시기까지 이어보면 궁금해질 만해요.`,
    alreadyCovered: true,
    miniReading:
      (wealthStarCount === 0
        ? `재성이 원국에 직접 보이진 않아도, 대운에서 재성이 겹치는 구간이 ${wealthOpportunityDaeunCount}번 있어요. 평생 흐름으로 보면 돈이 크게 움직이는 시기 자체는 분명히 있는 편이에요.`
        : `재성이 ${pillarNamesKo(wealthStarPillars) || "원국"} 자리에 ${wealthStarCount}개 있고, 대운에서도 그 기운이 ${wealthOpportunityDaeunCount}번 겹쳐요. 타고난 구조와 흐름이 같은 방향을 가리키는 구간이 있다는 뜻이에요.`) +
      wealthHeartLine,
    futureScene: "큰돈을 움직이거나 중요한 선택을 해야 할 때, 움직일 때와 지킬 때의 차이를 보는 것이 중요해질 수 있어요.",
    deeperQuestion: "그렇다면 이 흐름이 실제로 언제 강해지는지, 궁금하지 않아요?",
    deeperCTA: "내 중요한 시기 이어서 보기",
    paywallTitle: "내 재물 흐름은 언제 강해지고, 언제 조심해야 할까요",
    paywallItems: [
      "앞으로 1~3년 재물 흐름이 강해지는 시기",
      "조심해야 할 시기와 이유",
      "지금 시기에 필요한 구체적 행동",
    ],
    paywallCTA: "내 재물운의 시기 열어보기",
  };

  // ---------- ② 직장·사업의 흐름 ----------
  const activeGap = wealthStarCount + outputStarCount - (peerStarCount + officerStarCount);
  const careerScore = Math.abs(activeGap) + officerStarPillars.length;
  const careerLeaning = activeGap > 0 ? "business" : "stable";
  const careerHeadLine = onnxLines?.headLine.detected
    ? onnxLines.headLine.curve === "완만한 곡선"
      ? " 두뇌선도 완만한 곡선이라, 정해진 틀보다 유연하게 판단하는 결이 손에도 보여요."
      : " 두뇌선도 직선에 가까워서, 계산하고 따지는 결이 손에도 보여요."
    : "";
  const careerBusiness: FortuneCandidate = {
    id: "career_business",
    label: "직장·사업의 흐름",
    reason:
      careerLeaning === "business"
        ? `재성+식상(${wealthStarCount + outputStarCount}개)이 비겁+관성(${peerStarCount + officerStarCount}개)보다 우세해서, 스스로 판을 짜는 쪽 신호가 뚜렷해요.`
        : `비겁+관성(${peerStarCount + officerStarCount}개)이 재성+식상(${wealthStarCount + outputStarCount}개)보다 우세해서, 정해진 체계 안에서 크는 쪽 신호가 뚜렷해요.`,
    alreadyCovered: false,
    miniReading:
      (careerLeaning === "business"
        ? `성과가 직접 보이는 구조에서 힘을 발휘하는 쪽이에요. 지금 하는 일이 조직 안이더라도, 스스로 기획하고 밀어붙이는 역할을 맡을 때 결과가 더 잘 따라와요.`
        : `안정적인 틀 안에서 신뢰를 쌓아가는 쪽이 더 잘 맞아요. 관성이 ${pillarNamesKo(officerStarPillars) || "원국"} 자리에 있어서, 역할과 책임이 분명한 환경일수록 오히려 힘이 붙어요.`) +
      careerHeadLine,
    futureScene: "새로운 제안이나 독립적인 선택을 앞뒀을 때, 밀고 나가는 게 맞는지 기다리는 게 맞는지가 더 중요해질 수 있어요.",
    deeperQuestion: "그 타이밍을 미리 알 수 있다면 어떨까요?",
    deeperCTA: "내 직장·사업 흐름 더 깊게 보기",
    paywallTitle: "내 일의 흐름은 언제 움직여야 할까요",
    paywallItems: ["독립·이직·확장에 유리한 시기", "무리하지 말아야 할 시기", "지금 단계에서 필요한 행동"],
    paywallCTA: "내 일의 흐름 더 보기",
  };

  // ---------- ③ 인연·사람의 흐름 ----------
  const relationshipScore = officerStarCount + resourceStarCount + keyRelations.length;
  const relationshipInfluenced = officerStarCount + resourceStarCount >= 3;
  const relationshipAutonomyNote =
    check?.levels.autonomy === "오른쪽"
      ? " 자기정보 체크에서도 사람 의견·관계에 영향받는 편이라고 답해서, 같은 결이 자기보고에서도 보여요."
      : "";
  const relationship: FortuneCandidate = {
    id: "relationship",
    label: "인연·사람의 흐름",
    reason:
      keyRelations.length > 0
        ? `원국에 실제 간지 관계(${keyRelations.slice(0, 2).join(", ")} 등)가 있어서, 사람과 얽히는 흐름이 뚜렷한 편이에요.`
        : `관성+인성이 ${officerStarCount + resourceStarCount}개로, 주변 사람·관계가 결정에 영향을 주는 구조예요.`,
    alreadyCovered: false,
    miniReading:
      (relationshipInfluenced
        ? `관성+인성이 뚜렷해서, 주변 사람이나 조직의 영향을 받는 편이에요. 중요한 결정을 내릴 때 혼자보다 누군가와 함께일 때 오히려 더 힘을 발휘해요.`
        : `관성·인성이 크게 두드러지지 않아서, 사람에게 기대기보다 스스로 판단하고 정리하는 쪽에 가까워요. 관계보다 스스로의 기준이 우선인 편이에요.`) +
      relationshipAutonomyNote,
    futureScene: "새로운 사람이 들어오거나 중요한 관계를 결정해야 할 때, 평소 사람을 대하는 방식과 다른 선택을 하게 되는지도 볼 수 있어요.",
    deeperQuestion: "그 관계가 실제로 언제 크게 움직이는지, 궁금하지 않아요?",
    deeperCTA: "내 인연 흐름의 다음 장 보기",
    paywallTitle: "내 사람과의 흐름은 언제 크게 움직일까요",
    paywallItems: ["관계가 강해지는 시기", "새로운 인연이 들어오는 흐름", "관계에서 조심할 시기"],
    paywallCTA: "내 인연 흐름 더 보기",
  };

  // ---------- ④ 변화·기회의 흐름 ----------
  const daeunShift = Boolean(
    currentDaeun && nextDaeun && (currentDaeun.stemTenGod !== nextDaeun.stemTenGod || currentDaeun.branchTenGod !== nextDaeun.branchTenGod),
  );
  const changeScore = peakStagePillars.length * 2 + gilsin.length + (daeunShift ? 2 : 0);
  const changeLifeLine = onnxLines?.lifeLine.detected
    ? onnxLines.lifeLine.depthStrength === "강함"
      ? " 생명선도 뚜렷하게 나타나서, 변화 앞에서 몸으로 먼저 움직이는 활력이 손에도 보여요."
      : ""
    : "";
  const changeOpportunity: FortuneCandidate = {
    id: "change_opportunity",
    label: "변화·기회의 흐름",
    reason:
      peakStagePillars.length > 0
        ? `12운성 정점(건록·제왕)이 ${pillarNamesKo(peakStagePillars)} 자리에 있어서, 기회를 감지하는 힘이 원국에 뚜렷해요.`
        : `길신 ${gilsin.length}개와 대운 전환 신호를 함께 보면, 변화가 꾸준히 이어지는 구조예요.`,
    alreadyCovered: false,
    miniReading:
      (daeunShift && currentDaeun && nextDaeun
        ? `지금은 ${currentDaeun.ageRange}세 ${currentDaeun.ganzhi} 구간이고, 다음 대운(${nextDaeun.ageRange}세)으로 넘어가면 십성 구성 자체가 바뀌어요. 구간마다 결이 뚜렷하게 갈리는 원국이라는 뜻이에요.`
        : `정점(건록·제왕) 기운이 ${pillarNamesKo(peakStagePillars) || "특정 자리에"} 있어서, 변화가 왔을 때 몸이 먼저 반응하는 편이에요.`) +
      changeLifeLine,
    futureScene: "예상치 못한 제안이나 선택의 갈림길에 섰을 때, 그 타이밍이 진짜 기회인지 아닌지를 보는 게 중요해질 수 있어요.",
    deeperQuestion: "그 변화가 언제 오는지 미리 안다면 어떨까요?",
    deeperCTA: "내 변화의 흐름 더 깊게 보기",
    paywallTitle: "내 변화·기회의 흐름은 언제 올까요",
    paywallItems: ["기회가 뚜렷해지는 시기", "변화가 필요한 시기", "그 타이밍에 필요한 태도"],
    paywallCTA: "내 변화의 흐름 더 보기",
  };

  return [
    { candidate: wealthTiming, score: wealthScore },
    { candidate: careerBusiness, score: careerScore },
    { candidate: relationship, score: relationshipScore },
    { candidate: changeOpportunity, score: changeScore },
  ]
    .sort((a, b) => b.score - a.score)
    .map((x) => x.candidate);
}
