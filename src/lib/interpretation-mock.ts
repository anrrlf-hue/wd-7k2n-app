// 실제 LLM API 키가 없을 때 쓰는 결정론적(deterministic) 대체 해석기.
// "AI 해석 프로토타입"의 파이프라인(계산→구조화→해석→검증)을 키 없이도
// 끝까지 검증할 수 있도록, SajuFacts 조합에 따라 문장을 조립한다.
// 절대 하드코딩된 "일간 10종 고정 문장"이 아니라, 여러 필드의 조합으로
// 문장을 구성하므로 같은 일간이라도 다른 필드(대운/재성/식상 등)가 다르면
// 결과가 달라진다 — 이게 이번 요구사항(개인화 테스트)의 핵심 조건이다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { Interpretation } from "@/lib/interpretation-schema";
import { dayStrengthLabel, dayStrengthShort } from "@/lib/saju-labels";

// oh-my-saju timing으로 받은 대운과 원국 사이의 합충형파해(로컬 계산, 이견
// 없는 고정 클래식 표) — 실제로 걸리는 게 있을 때만 문장을 만든다.
function daeunRelationSentence(relations: { detail: string }[]): string | null {
  if (relations.length === 0) return null;
  return `이 대운은 타고난 사주와 ${relations.map((r) => r.detail).join(", ")}이 걸려 있습니다.`;
}

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
    daeunAnalysis,
  } = facts;

  const wLevel = wealthLevel(wealthStarCount);
  // 식상(활동력) vs 비겁(경쟁력) 비교. 둘 다 0이면 "더 많다/우세하다"고 말할
  // 근거 자체가 없으므로 별도 문구를 쓴다 (그 반대로 텍스트를 만들면 사실과
  // 어긋나는 문장이 나온다 — 실제 테스트 케이스 E에서 발견된 버그).
  const activeCompare: "output" | "peer" | "tie" =
    outputStarCount === peerStarCount ? "tie" : outputStarCount > peerStarCount ? "output" : "peer";

  const summary =
    `이 사주는 ${dayStrengthLabel(dayStrength)}이고, ${geukguk}을 타고났습니다. ` +
    `가장 강한 기운은 ${dominantElement}이고, 재물은 ${wLevel === "없음" ? "직접 드러나 있지는 않습니다" : wLevel === "보통" ? "적당히 자리 잡고 있습니다" : "뚜렷하게 자리 잡고 있습니다"}. ` +
    `원래 ${activeCompare === "peer" ? "묵묵히 반복해서 자리를 잡는" : "일단 벌여놓고 결과로 증명하는"} 쪽에 가깝습니다.`;

  const money_style =
    wLevel === "없음"
      ? "이 사주는 재물이 저절로 들어오는 구조가 아닙니다. 돈을 직접 좇기보다, 본업이나 전문성에서 나온 결과물이 자연스럽게 돈으로 바뀌는 흐름에 가깝습니다."
      : wLevel === "보통"
        ? "이 사주는 돈이 완전히 낯설지도, 너무 익숙하지도 않은 균형점에서 관계를 맺습니다."
        : "이 사주는 돈의 흐름을 감지하고 다루는 감각이 핵심 축 중 하나입니다.";

  const earning_style =
    activeCompare === "output"
      ? "뭔가를 만들어내거나 표현하는 활동이 곧 돈으로 이어지는 구조입니다. 직장에 오래 묶여 있기보다 성과가 바로 돈으로 연결되는 일이 더 맞습니다."
      : activeCompare === "peer"
        ? "남과 비교되는 자리, 직접 부딪히는 자리에서 오히려 돈 버는 힘이 커집니다."
        : "벌어들이는 힘이 활동이나 경쟁보다는 재물 자체를 다루는 쪽에서 더 크게 작동합니다.";

  const keeping_style =
    dayStrength === "strong"
      ? "자기 기준이 뚜렷해 쉽게 흔들리지 않습니다. 다만 그 확신이 지나치면 남의 조언을 듣지 않고 밀어붙이다 지키는 힘을 스스로 깎아먹기 쉽습니다."
      : dayStrength === "weak"
        ? "주변 상황에 영향을 잘 받는 사주입니다. 혼자 판단하기보다 믿을 만한 사람이나 체계를 곁에 두는 것이 지키는 힘으로 이어집니다."
        : "한쪽으로 치우치기보다 상황에 따라 지키는 방식을 유연하게 바꾸는 사주입니다.";

  const risk_pattern =
    hyungsin.length > 0
      ? "급하게 밀어붙이거나 감정적으로 판단하는 순간에 손해로 이어지기 쉬운 사주입니다. 큰 결정 전에는 한 박자 늦추는 것이 낫습니다."
      : "특별히 걸리는 것은 없지만, 벌어들이는 힘과 지키는 힘의 균형이 한쪽으로 쏠릴 때가 위험 신호입니다.";

  const career_business =
    geukguk.includes("재") || geukguk.includes("식상")
      ? "정해진 틀 안에 오래 있기보다, 성과가 곧바로 보이는 사업이나 성과제 쪽에서 재물이 더 크게 열립니다."
      : "안정적인 체계 안에서 신뢰를 쌓아가는 직장형 구조에서 재물이 더 안정적으로 늘어납니다.";

  const currentAnalysis = daeunAnalysis?.find((d) => d.isCurrent) ?? null;
  const nextAnalysis = daeunAnalysis?.find((d) => d.isNext) ?? null;
  const currentRelationSentence = currentAnalysis ? daeunRelationSentence(currentAnalysis.relations) : null;
  const nextRelationSentence = nextAnalysis ? daeunRelationSentence(nextAnalysis.relations) : null;

  const timing = currentDaeun
    ? `${currentDaeun.ageRange}세부터 이어지는 지금 대운(${currentDaeun.ganzhi})에서는 ` +
      (currentRelationSentence ? `${currentRelationSentence} ` : "") +
      (nextDaeun
        ? `다음 대운(${nextDaeun.ageRange}세부터, ${nextDaeun.ganzhi})으로 넘어가면 돈을 대하는 방식이 한 번 전환됩니다.` +
          (nextRelationSentence ? ` ${nextRelationSentence}` : "")
        : "이 대운이 지금 재물 흐름의 기본 배경이 되고 있습니다.")
    : "출생시간이 없어 대운은 계산되지 않았습니다.";

  const action =
    wLevel === "없음"
      ? "돈을 직접 좇기보다, 지금 하는 일의 전문성을 한 단계 더 좁고 깊게 파고드는 것이 재물로 이어지는 더 빠른 길입니다."
      : activeCompare === "output"
        ? "지금 벌여놓은 것 중 하나를 골라 이번 주 안에 마무리 짓는 것이 순서입니다. 새로 벌이는 것보다 완결이 먼저입니다."
        : activeCompare === "peer"
          ? "혼자 판단하지 말고, 이번 결정 하나만큼은 믿을 만한 사람에게 먼저 물어보고 진행하는 것이 낫습니다."
          : "새로운 것을 벌이기 전에, 지금 가진 자원을 어디에 쓸지부터 한 줄로 정리하는 것이 순서입니다.";

  // 화면에 그대로 칩으로 노출되므로 짧고 읽기 좋은 형태로 쓴다.
  // (JSON.stringify나 영문 enum을 그대로 넣지 않는다 — 실제 스크린샷 검수에서
  // "강약: 'neutral'" 처럼 디버그 로그 같은 문구가 노출되는 문제를 발견해 수정.)
  const evidence = [
    `일간 ${dayStemKo}(${dayElement}) · ${dayStrengthShort(dayStrength)}`,
    `격국 ${geukguk}`,
    `오행 최다 ${dominantElement}`,
    `재성 ${wealthStarCount}개 · 비겁 ${peerStarCount}개 · 식상 ${outputStarCount}개`,
    currentDaeun ? `현재 대운 ${currentDaeun.ganzhi}(${currentDaeun.stemTenGod})` : "대운 정보 없음",
    ...(currentAnalysis && currentAnalysis.relations.length > 0
      ? [`현재 대운 합충형파해: ${currentAnalysis.relations.map((r) => r.detail).join(", ")}`]
      : []),
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
