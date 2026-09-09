// 실제 LLM API 키가 없을 때 쓰는 결정론적(deterministic) 대체 해석기.
// "AI 해석 프로토타입"의 파이프라인(계산→구조화→해석→검증)을 키 없이도
// 끝까지 검증할 수 있도록, SajuFacts 조합에 따라 문장을 조립한다.
// 절대 하드코딩된 "일간 10종 고정 문장"이 아니라, 여러 필드의 조합으로
// 문장을 구성하므로 같은 일간이라도 다른 필드(대운/재성/식상 등)가 다르면
// 결과가 달라진다 — 이게 이번 요구사항(개인화 테스트)의 핵심 조건이다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { Interpretation } from "@/lib/interpretation-schema";
import { dayStrengthLabel, dayStrengthShort } from "@/lib/saju-labels";

function wealthLevel(count: number): "없음" | "보통" | "강함" {
  if (count === 0) return "없음";
  if (count <= 2) return "보통";
  return "강함";
}

export function buildMockInterpretation(facts: SajuFacts): Interpretation {
  const {
    dayStemKo,
    dayElement,
    dayStrength,
    geukguk,
    dominantElement,
    wealthStarCount,
    peerStarCount,
    outputStarCount,
    hyungsin,
    currentDaeun,
    nextDaeun,
  } = facts;

  const wLevel = wealthLevel(wealthStarCount);
  // 식상(활동력) vs 비겁(경쟁력) 비교. 둘 다 0이면 "더 많다/우세하다"고 말할
  // 근거 자체가 없으므로 별도 문구를 쓴다 (그 반대로 텍스트를 만들면 사실과
  // 어긋나는 문장이 나온다 — 실제 테스트 케이스 E에서 발견된 버그).
  const activeCompare: "output" | "peer" | "tie" =
    outputStarCount === peerStarCount ? "tie" : outputStarCount > peerStarCount ? "output" : "peer";

  const summary =
    `일간 ${dayStemKo}(${dayElement}) 기준으로 ${dayStrengthLabel(dayStrength)}이고, 격국은 ${geukguk}예요. ` +
    `원국에서 가장 강한 오행은 ${dominantElement}이고, 재성(재물을 뜻하는 십성)은 ${wLevel} 수준(${wealthStarCount}개)이에요. ` +
    `혹시 실제로도 ${activeCompare === "peer" ? "묵묵히 반복해서 자리를 잡는" : "일단 벌여놓고 결과로 증명하는"} 편이라는 말을 주변에서 듣나요?`;

  const money_style =
    wLevel === "없음"
      ? "원국에 재성이 뚜렷하게 보이지 않아요. 돈을 직접 좇기보다, 본업/전문성에서 나온 결과물이 자연스럽게 돈으로 바뀌는 흐름에 가까워요."
      : wLevel === "보통"
        ? `재성이 ${wealthStarCount}개로 적당히 있어요. 돈이 완전히 낯설지도, 너무 익숙하지도 않은 균형점에서 관계를 맺는 편이에요.`
        : `재성이 ${wealthStarCount}개로 원국에 뚜렷하게 자리하고 있어요. 돈의 흐름을 감지하고 다루는 감각 자체가 원국의 핵심 축 중 하나예요.`;

  const earning_style =
    activeCompare === "output"
      ? `식상(활동력을 뜻하는 십성)이 ${outputStarCount}개로 비겁(${peerStarCount}개)보다 많아요. 뭔가를 만들어내거나 표현하는 활동이 곧 돈으로 이어지는 구조예요.`
      : activeCompare === "peer"
        ? `비겁(직접 경쟁하고 실행하는 힘)이 ${peerStarCount}개로 식상(${outputStarCount}개)보다 우세해요. 남과 비교되는 자리, 직접 부딪히는 자리에서 오히려 돈 버는 힘이 커지는 편이에요.`
        : `식상과 비겁이 각각 ${outputStarCount}개로 원국에 뚜렷하게 드러나 있지 않아요. 벌어들이는 힘이 이 두 축보다는 재성·용신 쪽에서 더 크게 작동하는 구조에 가까워요.`;

  const keeping_style =
    dayStrength === "strong"
      ? "일간이 강한 편이라 자기 기준이 뚜렷하고, 쉽게 흔들리지 않아요. 다만 그 확신이 지나치면 남의 조언을 안 듣고 밀어붙이다 지키는 힘을 스스로 깎아먹기도 해요."
      : dayStrength === "weak"
        ? "일간이 약한 편이라 주변 상황에 영향을 잘 받아요. 혼자 판단하기보다 믿을 만한 기준(사람이든 시스템이든)을 곁에 두는 게 지키는 힘으로 직결돼요."
        : "일간이 중화에 가까워요. 한쪽으로 치우치기보다, 상황에 따라 유연하게 지키는 방식을 바꾸는 편이에요.";

  const risk_pattern =
    hyungsin.length > 0
      ? `원국에 ${hyungsin.join(", ")} 같은 흉신이 보여요. 급하게 밀어붙이거나 감정적으로 판단하는 순간에 손해로 이어지는 패턴을 조심할 필요가 있어요.`
      : `뚜렷한 흉신은 안 보이지만, 재성 ${wealthStarCount}개·비겁 ${peerStarCount}개의 균형이 무너질 때(재성이 갑자기 몰리거나 비겁이 재성을 압도할 때)가 위험 신호예요.`;

  const career_business =
    geukguk.includes("재") || geukguk.includes("식상")
      ? `격국이 ${geukguk}예요. 정해진 틀 안에서 일하기보다, 성과가 곧바로 보이는 구조(사업/프리랜서/성과제)에서 재물운이 더 크게 열리는 편이에요.`
      : `격국이 ${geukguk}예요. 안정적인 체계 안에서 신뢰를 쌓아가는 직장형 구조에서 재물이 더 안정적으로 늘어나는 편이에요.`;

  const timing = currentDaeun
    ? `지금은 ${currentDaeun.ageRange}세, ${currentDaeun.ganzhi}(${currentDaeun.stemTenGod}/${currentDaeun.branchTenGod}) 대운이에요. ` +
      (nextDaeun
        ? `다음 대운(${nextDaeun.ageRange}세, ${nextDaeun.ganzhi})으로 넘어가면 십성 구성이 ${nextDaeun.stemTenGod}/${nextDaeun.branchTenGod}로 바뀌면서 돈을 대하는 방식 자체가 한 번 전환될 시기예요.`
        : "이 대운이 지금 재물 흐름의 기본 배경이 되고 있어요.")
    : "대운 정보가 계산되지 않았어요.";

  const action =
    wLevel === "없음"
      ? "돈을 직접 좇기보다, 지금 하고 있는 일의 전문성부터 한 단계 더 좁고 깊게 파보는 게 재물로 이어지는 더 빠른 길이에요."
      : activeCompare === "output"
        ? "지금 벌여놓은 것 중 하나를 골라 '완결'짓는 데 이번 주 시간을 써보세요. 새로 벌이는 것보다 마무리가 지금 필요한 행동이에요."
        : activeCompare === "peer"
          ? "혼자 판단하지 말고, 이번 결정 하나만큼은 믿을 만한 사람에게 먼저 물어보고 진행해보세요."
          : "새로운 걸 벌이기 전에, 지금 가진 재성(용신 방향)을 어디에 쓸지부터 한 줄로 정리해보세요.";

  // 화면에 그대로 칩으로 노출되므로 짧고 읽기 좋은 형태로 쓴다.
  // (JSON.stringify나 영문 enum을 그대로 넣지 않는다 — 실제 스크린샷 검수에서
  // "강약: 'neutral'" 처럼 디버그 로그 같은 문구가 노출되는 문제를 발견해 수정.)
  const evidence = [
    `일간 ${dayStemKo}(${dayElement}) · ${dayStrengthShort(dayStrength)}`,
    `격국 ${geukguk}`,
    `오행 최다 ${dominantElement}`,
    `재성 ${wealthStarCount}개 · 비겁 ${peerStarCount}개 · 식상 ${outputStarCount}개`,
    currentDaeun ? `현재 대운 ${currentDaeun.ganzhi}(${currentDaeun.stemTenGod})` : "대운 정보 없음",
  ];

  return {
    summary,
    money_style,
    earning_style,
    keeping_style,
    risk_pattern,
    career_business,
    timing,
    action,
    evidence,
  };
}
