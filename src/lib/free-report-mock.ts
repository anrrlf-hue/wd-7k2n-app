// 무료 사주 V2의 결정론적(deterministic) 생성기. API 키 없이도 17섹션 전체를
// 항상 완결된 형태로 만든다. be-realdeveloper/saju의 "근거 사전 + 궁위론"
// 패턴(코드가 아니라 구조를 REUSE)과, lguz/humanize-writing-skill·
// boraoztunc/skills(stop-slop, MIT) 조사에서 확인한 "반복 구조 제거" 원칙을
// 함께 적용한다: 모든 문단이 같은 리듬으로 끝나지 않도록, 섹션마다
// (도입부/자기확인 방식/근거 배치)를 다르게 조합해서 만든다.
//
// 절대 규칙: 콘텐츠(주장/근거)는 오직 SajuFacts에서만 나온다. compose()가
// 하는 일은 같은 사실을 다른 문장 구조에 담는 것뿐, 사실 자체를 바꾸지 않는다.

import type { SajuFacts, PillarFact } from "@/lib/saju-facts";
import type { FreeSajuReport } from "@/lib/free-report-schema";
import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { MbtiSelfReport } from "@/lib/mbti-facts";
import { dayStrengthLabel, dayStrengthShort, elementTemperamentPhrase } from "@/lib/saju-labels";
import { buildPersonalityComparisonText } from "@/lib/personality-reconcile";

// ---------- 문장 구조 다양화 유틸 ----------

/** 종성(받침) 유무로 이/가, 은/는을 자동 선택한다. "목이(가)" 같은 미완성
 * 플레이스홀더가 그대로 노출되는 문제를 막는다(실제 스크린샷 검수에서 발견). */
function hasJongseong(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1) - 0xac00;
  if (ch < 0 || ch > 11171) return false;
  return ch % 28 !== 0;
}
function 이가(word: string): string {
  return `${word}${hasJongseong(word) ? "이" : "가"}`;
}
function 은는(word: string): string {
  return `${word}${hasJongseong(word) ? "은" : "는"}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** claim(핵심 결론) + scene(생활 속 구체적 모습) + evidence(근거 문구)를
 * 받아, seed에 따라 서로 다른 문장 순서/자기확인 방식으로 조립한다.
 * "~편이에요 + ~하지 않나요? + ~근거로 했어요"가 모든 섹션에서 반복되는
 * 것을 막는 게 목적이다. */
function compose(seed: number, parts: { claim: string; scene: string; evidence: string }): string {
  const { claim, scene, evidence } = parts;
  const variant = seed % 5;
  switch (variant) {
    case 0:
      return `${scene} ${claim} 이건 ${evidence}에서 드러나는 부분이에요.`;
    case 1:
      return `${claim} 이를테면 ${scene} ${selfCheck(seed)}`;
    case 2:
      return `${scene} 여기엔 이유가 있는데, ${evidence} 때문이에요. ${claim}`;
    case 3:
      return `${claim} ${scene} (${evidence})`;
    default:
      return `${evidence}를 보면 짐작 가능한 부분인데, ${claim} ${scene}`;
  }
}

const SELF_CHECK_POOL = [
  "문득 스스로도 이런 편이라고 느낀 적 있지 않나요?",
  "주변에서도 비슷한 얘기, 한 번쯤 들어봤을 거예요.",
  "최근에 있었던 일 하나를 떠올려보면 바로 확인될 거예요.",
  "실제로도 이렇게 움직이는 편인가요?",
  "이 모습, 스스로도 이미 알고 있었을 수 있어요.",
  "가까운 사람이라면 고개를 끄덕일 대목이에요.",
];
function selfCheck(seed: number): string {
  return SELF_CHECK_POOL[seed % SELF_CHECK_POOL.length];
}

/** "~을/를 근거로 했어요/한 해석이에요"가 13곳 전부에서 똑같이 반복되는 걸
 * humanize-writing 스킬로 실제 생성 문단을 검토하다 발견함(모든 문단이
 * 같은 마무리 문구로 끝나는 전형적인 AI 패턴). 네 문구 모두 앞의 명사가
 * "을/를"로 끝난 뒤에 그대로 붙는 동사구라 particle을 다시 계산할 필요
 * 없이 안전하게 교체 가능하다. */
const EVIDENCE_TAIL_POOL = ["근거로 했어요.", "근거로 한 해석이에요.", "기준으로 판단했어요.", "보고 내린 해석이에요."];
function evidenceTail(seed: number): string {
  return EVIDENCE_TAIL_POOL[seed % EVIDENCE_TAIL_POOL.length];
}

function pillarNamesKo(pillars: PillarFact["pillar"][]): string {
  const label: Record<PillarFact["pillar"], string> = { year: "연주", month: "월주", day: "일지", hour: "시주" };
  return pillars.map((p) => label[p]).join(", ");
}

function levelOf(count: number): "없음" | "적음" | "보통" | "강함" {
  if (count === 0) return "없음";
  if (count === 1) return "적음";
  if (count <= 2) return "보통";
  return "강함";
}

// ---------- 본체 ----------

export function buildFreeSajuReport(
  facts: SajuFacts,
  personality?: { check: PersonalityCheckFacts | null; mbti: MbtiSelfReport | null },
): FreeSajuReport {
  const {
    dayStemKo,
    dayElement,
    dayStrength,
    geukguk,
    dominantElement,
    missingElements,
    wealthStarCount,
    wealthStarPillars,
    peerStarCount,
    outputStarCount,
    outputStarPillars,
    officerStarCount,
    officerStarPillars,
    resourceStarCount,
    hyungsin,
    gilsin,
    gwimunRelations,
    currentDaeun,
    daeunList,
    wealthOpportunityDaeunCount,
    peakStagePillars,
    yongsin,
    fiveElements,
  } = facts;

  const baseSeed = hashStr(
    `${dayStemKo}${dayStrength}${geukguk}${wealthStarCount}${peerStarCount}${outputStarCount}${officerStarCount}${resourceStarCount}${gwimunRelations.length}`,
  );
  // hashStr(`${baseSeed}:${i}`)를 쓰는 이유: 이전에는 baseSeed + i*7이었는데,
  // compose()가 seed % 5로 변주를 고르다 보니 7과 5가 서로소라 i가 5 차이나는
  // 두 섹션(예: i=3과 i=13)은 baseSeed와 무관하게 *항상* 같은 문장 변주를
  // 받는 구조적 버그가 있었다(stop-slop 스킬로 실제 생성 문단을 검토하다
  // "~를 보면 짐작 가능한 부분인데" 커넥터가 wealthStructure/opportunityStyle에
  // 토씨 하나 안 틀리고 반복되는 걸 발견하고 역추적함). 해시로 섞으면 이 선형
  // 충돌이 사라진다.
  const seedFor = (i: number) => hashStr(`${baseSeed}:${i}`);

  const wLevel = levelOf(wealthStarCount);
  const activeCompare: "output" | "peer" | "tie" =
    outputStarCount === peerStarCount ? "tie" : outputStarCount > peerStarCount ? "output" : "peer";
  const socialCompare: "officer" | "resource" | "tie" =
    officerStarCount === resourceStarCount ? "tie" : officerStarCount > resourceStarCount ? "officer" : "resource";

  // ① 한눈에 보는 나
  const snapshot =
    `${dayStrengthLabel(dayStrength)}에 ${elementTemperamentPhrase(dayElement)} 사람이에요. ` +
    `재물 신호는 ${wLevel === "없음" ? "원국에 직접 드러나 있진 않고" : `${wealthStarCount}개로 ${wLevel} 수준으로 보이고`}${wealthStarPillars.length > 0 ? `(${pillarNamesKo(wealthStarPillars)} 자리)` : ""}, ` +
    `${activeCompare === "output" ? "뭔가를 만들어내는 활동이 곧 돈이 되는" : activeCompare === "peer" ? "직접 부딪히고 경쟁하는 자리에서 돈이 붙는" : "재성·용신 쪽 흐름이 더 크게 작동하는"} 구조예요. ` +
    `이 요약은 일간 ${dayStemKo}(${dayElement}), 격국 ${geukguk}, 재성 ${wealthStarCount}개를 근거로 정리했어요.`;

  // ② 타고난 성향
  const temperament = compose(seedFor(2), {
    claim: `${elementTemperamentPhrase(dayElement)}인데, ${dayStrengthLabel(dayStrength)}이라 ${dayStrength === "strong" ? "한번 정한 방향은 잘 안 바뀌는 편이에요" : dayStrength === "weak" ? "주변 분위기나 상황에 맞춰 스스로를 조정하는 편이에요" : "상황 따라 유연하게 태도를 바꾸는 편이에요"}.`,
    scene:
      dayStrength === "strong"
        ? "회의에서 방향이 흔들릴 때 오히려 중심을 잡는 쪽에 서게 되는 경우가 많아요."
        : dayStrength === "weak"
          ? "혼자 결정하기보다 분위기를 먼저 살피고 나서 움직이는 편이에요."
          : "어제와 오늘의 태도가 다를 수 있는데, 그게 오히려 자연스러운 유형이에요.",
    evidence: `일간 ${dayStemKo}(${dayElement}) · 신강신약 ${dayStrengthShort(dayStrength)}, 오행 최다 ${dominantElement}`,
  });

  // ③ 재물운/돈복의 큰 구조
  const wealthStructure = compose(seedFor(3), {
    claim:
      wLevel === "없음"
        ? "재물이 저절로 굴러들어오는 구조는 아니고, 본업이나 전문성이 돈으로 바뀌는 흐름에 가까워요."
        : wLevel === "강함"
          ? "원국 자체에 재물을 다루는 축이 뚜렷하게 자리 잡고 있어요."
          : "재물이 완전히 낯설지도, 아주 익숙하지도 않은 균형점에 있어요.",
    scene:
      missingElements.length > 0
        ? `오행 중 ${이가(missingElements.join(", "))} 원국에 아예 없어서, 그 기운이 필요한 상황에서는 외부(사람·환경)에서 채워야 균형이 맞는 편이에요.`
        : `오행 다섯 가지가 어느 정도 골고루 있어서, 극단적으로 한쪽에 쏠리는 재물 패턴은 아니에요.`,
    evidence: `재성 ${wealthStarCount}개, 용신 ${yongsin.join(", ") || "특이 없음"}`,
  });

  // ④ 돈을 버는 방식
  const earningStyle =
    activeCompare === "output"
      ? `아이디어를 내거나 뭔가를 만들어서 그게 돈으로 바뀌는 방식이 잘 맞는 사람이에요. ` +
        `특히 ${pillarNamesKo(outputStarPillars)} 자리에 그 힘이 있어서, ${outputStarPillars.includes("month") ? "실제 사회생활·업무에서" : outputStarPillars.includes("day") ? "본인 성향 자체에서" : "삶의 배경이 되는 부분에서"} 이 활동력이 두드러져요. ` +
        `벌여놓은 일을 하나 골라 마무리 짓는 주에 돈이 따라오는 편일 가능성이 커요. ` +
        `이 해석은 식상(식신+상관) ${outputStarCount}개, 그 위치(${pillarNamesKo(outputStarPillars) || "없음"})를 ${evidenceTail(seedFor(20))}`
      : activeCompare === "peer"
        ? `직접 경쟁하거나 스스로 실행해야 돈이 붙는 방식이에요. 남이 대신 해주는 일보다, 본인이 직접 판단하고 부딪히는 일에서 결과가 더 좋은 편이에요. ` +
          selfCheck(seedFor(4)) +
          ` 이 해석은 비겁(비견+겁재) ${peerStarCount}개를 ${evidenceTail(seedFor(21))}`
        : `식상과 비겁이 뚜렷하게 우세하지 않아서, 벌어들이는 힘은 재성·용신 쪽에서 더 크게 작동하는 편이에요. ` +
          `정해진 활동력보다는 상황과 타이밍에 맞춰 버는 방식이 유연하게 바뀌는 편일 수 있어요. ` +
          `이 해석은 식상 ${outputStarCount}개·비겁 ${peerStarCount}개, 용신(${yongsin.join(", ") || "특이 없음"})을 ${evidenceTail(seedFor(22))}`;

  // ⑤ 돈을 지키는 방식
  const keepingStyle =
    dayStrength === "strong"
      ? `자기 기준이 뚜렷해서 웬만해선 안 흔들려요. 다만 그 확신이 지나치면 주변 조언을 안 듣고 밀어붙이다 지키는 힘 자체를 스스로 깎아먹기도 해요. ` +
        `결정하기 전에 딱 한 번만 다른 사람 의견을 들어보는 걸 시도해보면 좋아요. 이미 마음을 정한 뒤에는 의견을 구해도 잘 안 듣게 되니, 결정하기 전이 핵심이에요. ` +
        `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})과 격국 ${geukguk}을 ${evidenceTail(seedFor(23))}`
      : dayStrength === "weak"
        ? `혼자 판단하기보다 믿을 만한 기준(사람이든 시스템이든)을 곁에 둘 때 돈이 더 잘 지켜져요. 자동이체·정기저축처럼 스스로 안 흔들려도 되는 장치를 만들어두는 게 실질적으로 도움이 돼요. ` +
          `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})을 ${evidenceTail(seedFor(24))}`
        : `한쪽으로 치우치기보다 상황에 맞게 지키는 방식을 바꾸는 편이에요. 다만 기준이 유연한 만큼, 명확한 규칙 하나 정도는 고정해두는 게 흔들림을 줄여줘요. ` +
          `일간 ${dayStemKo}(중화)을 ${evidenceTail(seedFor(25))}`;

  // ⑥ 돈을 놓치는 반복 패턴
  const leakPattern = compose(seedFor(6), {
    claim:
      hyungsin.length > 0
        ? `${hyungsin.join(", ")} 같은 신호가 원국에 있어서, 급하게 밀어붙이거나 감정이 앞선 순간에 손해로 이어지는 패턴이 반복될 수 있어요.`
        : `뚜렷한 흉신은 없지만, 재성 ${wealthStarCount}개와 비겁 ${peerStarCount}개의 균형이 무너질 때가 돈이 새는 신호예요.`,
    scene:
      hyungsin.length > 0
        ? "큰 결정 앞에서는 하루만 미루고 다시 보는 습관을 들이면 이 패턴이 확실히 줄어들어요."
        : "평소보다 결정을 빨리 내리고 있다면, 그게 바로 신호일 수 있어요.",
    evidence: hyungsin.length > 0 ? `흉신 ${hyungsin.join(", ")}` : `재성 ${wealthStarCount}개·비겁 ${peerStarCount}개 균형`,
  });

  // ⑦ 큰돈/기회와 관계된 성향
  const bigMoneyAffinity = compose(seedFor(7), {
    claim:
      wealthOpportunityDaeunCount === 0
        ? "인생 전체 대운 흐름 중 재성이 뚜렷하게 겹치는 구간은 없지만, 그렇다고 큰돈과 무관하다는 뜻은 아니에요. 재성 없이도 다른 축(식상·비겁)으로 돈을 만드는 유형이에요."
        : wealthOpportunityDaeunCount <= 2
          ? `평생 대운 중 재성이 함께 오는 구간이 ${wealthOpportunityDaeunCount}번 있어요. 그 시기가 아니어도 꾸준히 관리하는 게 기본기가 돼요.`
          : `평생 대운 중 재성이 함께 오는 구간이 ${wealthOpportunityDaeunCount}번이나 있어서, 인생 전체로 보면 기회 자체는 여러 번 찾아오는 유형이에요.`,
    scene:
      peakStagePillars.length > 0 && wealthStarPillars.some((p) => peakStagePillars.includes(p))
        ? "특히 재성이 놓인 자리가 기운이 정점에 달하는 자리와 겹쳐서, 기회가 왔을 때 힘 있게 받아낼 수 있는 조건이에요."
        : "다만 기회가 왔을 때 그걸 잡을 준비(정보력, 실행력)가 함께 있어야 실제로 이어져요.",
    evidence: `대운 중 재성 겹침 ${wealthOpportunityDaeunCount}회, 정점 12운성 자리 ${pillarNamesKo(peakStagePillars) || "없음"}`,
  });

  // ⑧ 직장형/사업형 성향
  const jobOrientation =
    wealthStarCount + outputStarCount > peerStarCount + officerStarCount
      ? `정해진 틀보다 성과가 직접 보이는 구조(사업/프리랜서/성과 기반)에서 진짜 힘을 발휘하는 편이에요. 매인 조직 안에 있더라도, 스스로 결과를 만들어내는 역할을 맡을 때 만족도가 훨씬 높아져요. ` +
        `지시받은 일보다 스스로 기획한 일이 더 잘 풀린다고 느낀 적 많지 않나요? ` +
        `이 해석은 재성+식상(${wealthStarCount + outputStarCount}개)이 비겁+관성(${peerStarCount + officerStarCount}개)보다 우세한 원국 구조를 ${evidenceTail(seedFor(26))}`
      : `안정적인 체계 안에서 신뢰를 쌓아가는 방식에서 재물이 더 안정적으로 늘어나는 편이에요. 완전히 혼자 판을 짜기보다, 명확한 규칙과 역할이 있는 환경에서 오히려 더 크게 성장해요. ` +
        `자유롭게 알아서 하라고 하면 오히려 막막할 때가 있지 않나요? ` +
        `이 해석은 비겁+관성(${peerStarCount + officerStarCount}개)이 재성+식상(${wealthStarCount + outputStarCount}개)보다 우세한 원국 구조를 ${evidenceTail(seedFor(27))}`;

  // ⑨ 조직에서 강한 부분
  const teamStrength = compose(seedFor(9), {
    claim:
      officerStarCount === 0
        ? "관성(조직·규율을 뜻하는 십성)이 원국에 없어서, 조직 안에서도 정해진 규칙보다 스스로 만든 기준으로 움직일 때 더 강해요."
        : `관성이 ${officerStarCount}개로, 조직 안에서 역할과 책임이 분명할 때 오히려 힘이 붙는 편이에요.`,
    scene:
      officerStarPillars.includes("month")
        ? "특히 실제 업무 환경(월주 자리)에 그 힘이 있어서, 회사·조직 생활에서 이 성향이 더 뚜렷하게 드러나요."
        : officerStarCount > 0
          ? "책임을 맡았을 때 회피하지 않고 끝까지 챙기는 쪽에 가까워요."
          : "규칙이 너무 촘촘한 곳보다는, 결과로 평가받는 구조가 더 잘 맞아요.",
    evidence: `관성(편관+정관) ${officerStarCount}개, 위치 ${pillarNamesKo(officerStarPillars) || "없음"}`,
  });

  // ⑩ 독립적으로 움직일 때 강한 부분
  const soloStrength = compose(seedFor(10), {
    claim:
      peerStarCount + outputStarCount >= 3
        ? "비겁과 식상이 함께 강해서, 혼자 판단하고 혼자 실행하는 상황에서 오히려 능력치가 올라가는 유형이에요."
        : "혼자 움직일 때 아주 도드라지는 유형은 아니지만, 필요할 때는 스스로 책임지고 마무리하는 힘이 있어요.",
    scene:
      peerStarCount + outputStarCount >= 3
        ? "누가 시키지 않아도 스스로 일을 벌이고, 끝까지 밀어붙이는 모습을 자주 보였을 거예요."
        : "여럿이 헤매는 상황에서 조용히 자기 몫부터 정리하는 쪽에 가까워요.",
    evidence: `비겁 ${peerStarCount}개 + 식상 ${outputStarCount}개`,
  });

  // ⑪ 사람과 돈
  const peopleAndMoney =
    socialCompare === "officer"
      ? `조직이나 규칙, 정해진 관계 안에서 돈이 도는 걸 편하게 느끼는 편이에요. 이런 구조가 있는 자리에서 돈 관련 결정도 더 안정적으로 내려요. ` +
        `믿을 만한 시스템이나 계약이 있어야 마음이 놓이지 않나요? ` +
        `관성(편관+정관) ${officerStarCount}개를 ${evidenceTail(seedFor(28))}`
      : socialCompare === "resource"
        ? `정보나 조언을 얻은 뒤에 돈 관련 결정을 내리는 편이에요. 믿을 만한 사람의 말 한마디가 실제 선택에 큰 영향을 줘요. ` +
          `중요한 결정 전에 꼭 누군가에게 물어보고 나서 움직이지 않나요? ` +
          `인성(편인+정인) ${resourceStarCount}개를 ${evidenceTail(seedFor(29))}`
        : `사람에게 크게 기대지도, 완전히 혼자 판단하지도 않는 균형 잡힌 편이에요. 상황에 따라 조언을 참고하되 최종 결정은 스스로 내리는 쪽에 가까워요. ` +
          `관성 ${officerStarCount}개·인성 ${resourceStarCount}개의 균형을 ${evidenceTail(seedFor(30))}`;

  // ⑫ 의사결정 스타일
  const decisionStyle =
    dayStrength === "strong"
      ? `직관적으로 빠르게 결정하고 밀어붙이는 편이에요. 속도는 강점이지만, 중요한 결정일수록 하루 정도 시간을 두고 다시 보면 실수가 확 줄어요. ` +
        `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})을 ${evidenceTail(seedFor(31))}`
      : `신중하게 정보를 모으고 나서 결정하는 편이에요. 다만 너무 오래 재다가 타이밍을 놓치는 경우도 있어서, 결정 기한을 스스로 정해두는 게 도움이 돼요. ` +
        `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})을 ${evidenceTail(seedFor(32))}`;

  // ⑬ 기회를 잡는 방식
  const opportunityStyle = compose(seedFor(13), {
    claim:
      peakStagePillars.length >= 2
        ? "12운성 기준으로 힘이 정점에 오른 자리가 여러 곳이라, 기회를 감지하는 순간 몸이 먼저 반응하는 편이에요."
        : peakStagePillars.length === 1
          ? "정점의 기운이 한 자리에 뚜렷해서, 특정 영역에서만큼은 기회를 놓치지 않는 유형이에요."
          : "정점 기운이 뚜렷하지 않아서, 순발력보다는 꾸준함으로 기회를 만드는 편에 가까워요.",
    scene:
      gilsin.length > 0
        ? `${gilsin.join(", ")} 같은 길신도 있어서, 결정적 순간에 예상치 못한 도움을 받을 때가 있어요.`
        : "화려한 귀인의 도움보다는, 스스로 준비해온 것이 기회와 만나는 쪽에 가까워요.",
    evidence: `정점(건록·제왕) 자리 ${pillarNamesKo(peakStagePillars) || "없음"}, 길신 ${gilsin.join(", ") || "없음"}`,
  });

  // ⑭ 강점 3개 이상 (실제 근거 기반 랭킹)
  const strengthCandidates: { title: string; detail: string; evidence: string; score: number }[] = [
    {
      title: "재물을 알아보는 감각",
      detail: `원국에 재성이 ${wealthStarCount}개 있어서, 돈이 될 만한 걸 남들보다 먼저 알아채는 감각이 있어요.`,
      evidence: `재성 ${wealthStarCount}개(${facts.wealthStarTypes.join(", ") || "없음"})`,
      score: wealthStarCount,
    },
    {
      title: "직접 밀어붙이는 추진력",
      detail: `비겁이 ${peerStarCount}개로, 남에게 미루지 않고 직접 부딪혀서 해결하는 실행력이 강점이에요.`,
      evidence: `비겁 ${peerStarCount}개`,
      score: peerStarCount,
    },
    {
      title: "만들어내고 표현하는 힘",
      detail: `식상이 ${outputStarCount}개로, 아이디어를 실제 결과물로 바꾸는 표현력·실행력이 있어요.`,
      evidence: `식상 ${outputStarCount}개`,
      score: outputStarCount,
    },
    {
      title: "귀인의 도움을 받는 힘",
      detail: `${gilsin.join(", ") || "길신"} 같은 신호가 있어서, 결정적인 순간에 사람이나 상황의 도움을 받는 경우가 많아요.`,
      evidence: `길신 ${gilsin.join(", ") || "없음"}`,
      score: gilsin.length * 2,
    },
    {
      title: "안정적으로 신뢰를 쌓는 힘",
      detail: `관성이 ${officerStarCount}개로, 정해진 틀 안에서 꾸준히 신뢰를 쌓아 결과를 만들어내는 힘이 있어요.`,
      evidence: `관성 ${officerStarCount}개`,
      score: officerStarCount,
    },
    {
      title: "기회를 놓치지 않는 순발력",
      detail: `12운성 정점 자리가 ${peakStagePillars.length}곳이라, 기회가 왔을 때 반응 속도가 빠른 편이에요.`,
      evidence: `정점 자리 ${peakStagePillars.length}곳`,
      score: peakStagePillars.length * 2,
    },
  ];
  const strengths = [...strengthCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑮ 조심할 점 3개 이상 (근거 기반)
  const cautionCandidates: { title: string; detail: string; evidence: string; score: number }[] = [
    {
      title: "감정이 앞서는 순간",
      detail: `${hyungsin.join(", ") || "특정 흉신"}이 있을 때는 감정적으로 판단해 손해로 이어지기 쉬워요. 결정 전에 한 박자 늦추는 게 도움이 돼요.`,
      evidence: hyungsin.length > 0 ? `흉신 ${hyungsin.join(", ")}` : "흉신 없음(재성·비겁 균형 기준)",
      score: hyungsin.length > 0 ? 3 : 1,
    },
    {
      title: "지나친 확신",
      detail: `일간이 ${dayStrengthLabel(dayStrength)}이라, 스스로 옳다고 믿으면 주변 말이 잘 안 들어와요. 큰 결정일수록 의도적으로 반대 의견을 들어보세요.`,
      evidence: `일간 ${dayStrengthShort(dayStrength)}`,
      score: dayStrength === "strong" ? 3 : 1,
    },
    {
      title: "혼자 판단하다 정보 부족",
      detail: `일간이 ${dayStrengthLabel(dayStrength)}이라, 확신 없이 결정했다가 나중에 정보 부족을 느끼는 경우가 있어요. 미리 정보원을 만들어두면 좋아요.`,
      evidence: `일간 ${dayStrengthShort(dayStrength)}`,
      score: dayStrength === "weak" ? 3 : 1,
    },
    {
      title: "불편한 조합이 만드는 스트레스",
      detail: `${gwimunRelations.join(", ") || "특정 조합"}이 있어서, 생각이 복잡해지고 예민해지는 시기에 돈 관련 결정을 미루는 게 나아요.`,
      evidence: gwimunRelations.length > 0 ? gwimunRelations.join(", ") : "귀문 관계 없음",
      score: gwimunRelations.length > 0 ? 3 : 0,
    },
    {
      title: "벌여놓고 마무리를 못 짓는 패턴",
      detail: `식상 ${outputStarCount}개로 새로 벌이는 힘은 있지만, 벌인 만큼 마무리가 따라가지 않으면 힘이 분산돼요.`,
      evidence: `식상 ${outputStarCount}개`,
      score: outputStarCount >= 2 ? 2 : 0,
    },
    {
      title: "없는 오행이 만드는 공백",
      detail:
        missingElements.length > 0
          ? `오행 중 ${이가(missingElements.join(", "))} 없어서, 그 기운이 필요한 상황(예: 결단·유연성)에서 유독 힘들어질 수 있어요.`
          : "오행이 고르게 있어서 이 항목은 크게 걱정할 필요 없어요.",
      evidence: missingElements.length > 0 ? `없는 오행 ${missingElements.join(", ")}` : "없는 오행 없음",
      score: missingElements.length > 0 ? 2 : 0,
    },
  ];
  const cautions = [...cautionCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑯ 자기 경험 비교 질문
  const selfCheckQuestions = [
    `실제로도 ${dayStrength === "strong" ? "한번 정하면 잘 안 바뀐다는 말을 듣는" : "결정하기 전에 여러 번 생각하는"} 편인가요?`,
    `${activeCompare === "output" ? "뭔가를 벌이는 건 잘하는데 마무리가 약하다는 말을 들어본 적" : "직접 해야 마음이 편하다는 느낌을 받은 적"} 있나요?`,
    hyungsin.length > 0
      ? "돌아보면, 급하게 결정했다가 후회한 순간이 몇 번쯤 있었나요?"
      : "바쁠 때 오히려 돈 관리가 느슨해지는 걸 느낀 적 있나요?",
    wealthOpportunityDaeunCount >= 3
      ? "지금까지 살면서 '이번엔 기회다' 싶었던 순간이 한 번 이상 있었나요?"
      : "큰 기회보다 꾸준함으로 여기까지 왔다고 느끼는 편인가요?",
  ];

  // ⑰ 왜 이런 결과가 나왔나 (근거 총정리, 마지막 배치)
  const daeunFlowNote =
    daeunList.length > 0
      ? `이번 생애 대운은 총 ${daeunList.length}단계로 흘러가고, 지금은 그중 ${currentDaeun ? `${currentDaeun.ageRange}세 ${currentDaeun.ganzhi}` : "특정 시점"} 구간이에요. 정확한 시기별 흐름은 유료 리포트에서 더 자세히 볼 수 있어요.`
      : "대운 정보는 이번 계산에서 확인되지 않았어요.";

  const evidenceExplainer =
    `이 결과는 태어난 날의 하늘 기운(일간) ${dayStemKo}(${dayElement})이 ${dayStrengthShort(dayStrength)}이라는 점, 원국 여덟 글자에서 돈(재성)·경쟁(비겁)·활동(식상)·조직(관성)·정보(인성)를 뜻하는 글자가 몇 개씩 있는지, 격국(${geukguk})과 용신(${yongsin.join(", ") || "특이 없음"}), 그리고 12운성으로 그 힘이 어느 시기에 정점을 찍는지를 함께 봐서 나왔어요. ` +
    `${daeunFlowNote} ` +
    `오행 분포는 ${Object.entries(fiveElements).map(([k, v]) => `${k} ${v}개`).join(", ")}였고, 그중 ${이가(dominantElement)} 가장 강했어요${missingElements.length > 0 ? `, 반대로 ${은는(missingElements.join(", "))} 아예 없었고요` : ""}.`;

  // 성향정보(간단 성향 체크/MBTI) 비교 — 있을 때만
  const personalityComparison = personality
    ? buildPersonalityComparisonText(facts, personality.check, personality.mbti)
    : null;

  return {
    snapshot,
    temperament,
    wealthStructure,
    earningStyle,
    keepingStyle,
    leakPattern,
    bigMoneyAffinity,
    jobOrientation,
    teamStrength,
    soloStrength,
    peopleAndMoney,
    decisionStyle,
    opportunityStyle,
    strengths,
    cautions,
    selfCheckQuestions,
    evidenceExplainer,
    personalityComparison,
  };
}
