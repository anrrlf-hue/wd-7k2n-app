// 무료 사주 V2의 결정론적(deterministic) 생성기. API 키 없이도 12섹션 전체를
// 항상 완결된 형태로 만든다. be-realdeveloper/saju의 "근거 사전 + 궁위론"
// 패턴(코드가 아니라 구조를 REUSE)을 따라, 같은 필드라도 어느 자리(궁위)에
// 있는지로 문장을 분기한다.
// 모든 문단은 결론(생활언어) -> 구체적 행동/패턴 -> 자기확인 질문 -> 마지막
// 전문용어 근거 순서를 지킨다.

import type { SajuFacts, PillarFact } from "@/lib/saju-facts";
import type { FreeSajuReport } from "@/lib/free-report-schema";
import { dayStrengthLabel, dayStrengthShort, elementTemperamentPhrase } from "@/lib/saju-labels";

function levelOf(count: number): "없음" | "적음" | "보통" | "강함" {
  if (count === 0) return "없음";
  if (count === 1) return "적음";
  if (count <= 2) return "보통";
  return "강함";
}

function pillarNamesKo(pillars: PillarFact["pillar"][]): string {
  const label: Record<PillarFact["pillar"], string> = { year: "연주", month: "월주", day: "일지", hour: "시주" };
  return pillars.map((p) => label[p]).join(", ");
}

export function buildFreeSajuReport(facts: SajuFacts): FreeSajuReport {
  const {
    dayStemKo,
    dayElement,
    dayStrength,
    geukguk,
    dominantElement,
    wealthStarCount,
    wealthStarPillars,
    peerStarCount,
    outputStarCount,
    outputStarPillars,
    officerStarCount,
    resourceStarCount,
    hyungsin,
    gilsin,
    gwimunRelations,
    currentDaeun,
    daeunList,
  } = facts;

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
  const temperament =
    `${elementTemperamentPhrase(dayElement)}이고, ${dayStrengthLabel(dayStrength)}이라 ` +
    `${dayStrength === "strong" ? "한번 정한 방향은 잘 안 바뀌는 편" : dayStrength === "weak" ? "주변 분위기나 상황에 맞춰 스스로를 조정하는 편" : "상황 따라 유연하게 태도를 바꾸는 편"}이에요. ` +
    `실제로도 ${dayStrength === "strong" ? "남들이 '고집 있다'는 말을 종종 하지 않나요" : "혼자 결정하기보다 주변 반응을 살피고 나서 움직이는 편 아닌가요"}? ` +
    `이건 일간 ${dayStemKo}(${dayElement}) 기준 신강신약 판단(${dayStrengthShort(dayStrength)})과 오행 중 ${dominantElement}이 가장 강한 데서 나온 해석이에요.`;

  // ③ 돈을 버는 방식
  const earningStyle =
    activeCompare === "output"
      ? `아이디어를 내거나 뭔가를 만들어서 그게 돈으로 바뀌는 방식이 잘 맞는 사람이에요. ` +
        `특히 ${pillarNamesKo(outputStarPillars)} 자리에 그 힘이 있어서, ${outputStarPillars.includes("month") ? "실제 사회생활/업무에서" : outputStarPillars.includes("day") ? "본인 성향 자체에서" : "삶의 배경이 되는 부분에서"} 이 활동력이 두드러져요. ` +
        `벌여놓은 일을 하나 골라 마무리 짓는 주에 돈이 따라오는 편일 가능성이 커요. ` +
        `이 해석은 식상(식신+상관) ${outputStarCount}개, 그 위치(${pillarNamesKo(outputStarPillars) || "없음"})를 근거로 했어요.`
      : activeCompare === "peer"
        ? `직접 경쟁하거나 스스로 실행해야 돈이 붙는 방식이에요. 남이 대신 해주는 일보다, 본인이 직접 판단하고 부딪히는 일에서 결과가 더 좋은 편이에요. ` +
          `실제로도 남에게 맡기느니 직접 하는 게 마음이 편하지 않나요? ` +
          `이 해석은 비겁(비견+겁재) ${peerStarCount}개를 근거로 했어요.`
        : `식상과 비겁이 뚜렷하게 우세하지 않아서, 벌어들이는 힘은 재성·용신 쪽에서 더 크게 작동하는 편이에요. ` +
          `정해진 활동력보다는 상황과 타이밍에 맞춰 버는 방식이 유연하게 바뀌는 편일 수 있어요. ` +
          `이 해석은 식상 ${outputStarCount}개·비겁 ${peerStarCount}개, 용신(${facts.yongsin.join(", ") || "특이 없음"})을 근거로 했어요.`;

  // ④ 돈을 지키는 방식
  const keepingStyle =
    dayStrength === "strong"
      ? `자기 기준이 뚜렷해서 웬만해선 안 흔들려요. 다만 그 확신이 지나치면 주변 조언을 안 듣고 밀어붙이다 지키는 힘 자체를 스스로 깎아먹기도 해요. ` +
        `결정하기 전에 딱 한 번만 다른 사람 의견을 들어보는 걸 시도해보면 좋아요. ` +
        `혹시 "이미 마음먹었는데 왜 물어봐" 싶을 때가 많지 않나요? ` +
        `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})과 격국 ${geukguk}을 근거로 한 해석이에요.`
      : dayStrength === "weak"
        ? `혼자 판단하기보다 믿을 만한 기준(사람이든 시스템이든)을 곁에 둘 때 돈이 더 잘 지켜져요. 자동이체·정기저축처럼 스스로 안 흔들려도 되는 장치를 만들어두는 게 실질적으로 도움이 돼요. ` +
          `누군가 옆에서 같이 챙겨줄 때 훨씬 안정적으로 느껴지지 않나요? ` +
          `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})을 근거로 한 해석이에요.`
        : `한쪽으로 치우치기보다 상황에 맞게 지키는 방식을 바꾸는 편이에요. 다만 기준이 유연한 만큼, 명확한 규칙 하나 정도는 고정해두는 게 흔들림을 줄여줘요. ` +
          `상황에 따라 소비 기준이 꽤 달라지는 편 아닌가요? ` +
          `일간 ${dayStemKo}(중화)을 근거로 한 해석이에요.`;

  // ⑤ 돈을 놓치는 반복 패턴 (항상 무료)
  const leakPattern =
    hyungsin.length > 0
      ? `${hyungsin.join(", ")} 같은 신호가 원국에 있어서, 급하게 밀어붙이거나 감정이 앞선 순간에 손해로 이어지는 패턴이 반복될 수 있어요. ` +
        `큰 결정 앞에서는 하루만 미루고 다시 보는 습관을 들이면 이 패턴이 확실히 줄어들어요. ` +
        `돌아보면 "그때 조금만 더 침착했으면" 싶었던 순간이 몇 번 있지 않았나요? ` +
        `이 해석은 흉신(${hyungsin.join(", ")})을 근거로 했어요.`
      : `뚜렷한 흉신은 없지만, 재성 ${wealthStarCount}개와 비겁 ${peerStarCount}개의 균형이 무너질 때(재성이 갑자기 몰리거나 비겁이 재성을 압도할 때)가 돈이 새는 신호예요. ` +
        `평소보다 결정을 빨리 내리고 있다면 그게 신호일 수 있어요, 한 박자 늦춰보세요. ` +
        `바쁠 때 오히려 돈 관리가 헐거워지는 패턴, 익숙하지 않나요? ` +
        `이 해석은 재성 ${wealthStarCount}개·비겁 ${peerStarCount}개 균형을 근거로 했어요.`;

  // ⑥ 직장형/사업형 성향 (현재 직업 안 물어봄, 원국만으로 추론)
  const workStyle =
    wealthStarCount + outputStarCount > peerStarCount + officerStarCount
      ? `정해진 틀보다 성과가 직접 보이는 구조(사업/프리랜서/성과 기반)에서 진짜 힘을 발휘하는 편이에요. 매인 조직 안에 있더라도, 스스로 결과를 만들어내는 역할을 맡을 때 만족도가 훨씬 높아요. ` +
        `지시받은 일보다 스스로 기획한 일이 더 잘 풀린다고 느낀 적 많지 않나요? ` +
        `이 해석은 재성+식상(${wealthStarCount + outputStarCount}개)이 비겁+관성(${peerStarCount + officerStarCount}개)보다 우세한 원국 구조를 근거로 했어요.`
      : `안정적인 체계 안에서 신뢰를 쌓아가는 방식에서 재물이 더 안정적으로 늘어나는 편이에요. 완전히 혼자 판을 짜기보다, 명확한 규칙과 역할이 있는 환경에서 오히려 더 크게 성장해요. ` +
        `자유롭게 알아서 하라고 하면 오히려 막막할 때가 있지 않나요? ` +
        `이 해석은 비겁+관성(${peerStarCount + officerStarCount}개)이 재성+식상(${wealthStarCount + outputStarCount}개)보다 우세한 원국 구조를 근거로 했어요.`;

  // ⑦ 사람과 돈
  const peopleAndMoney =
    socialCompare === "officer"
      ? `조직이나 규칙, 정해진 관계 안에서 돈이 도는 걸 편하게 느끼는 편이에요. 이런 구조가 있는 자리에서 돈 관련 결정도 더 안정적으로 내려요. ` +
        `믿을 만한 시스템이나 계약이 있어야 마음이 놓이지 않나요? ` +
        `관성(편관+정관) ${officerStarCount}개를 근거로 한 해석이에요.`
      : socialCompare === "resource"
        ? `정보나 조언을 얻은 뒤에 돈 관련 결정을 내리는 편이에요. 믿을 만한 사람의 말 한마디가 실제 선택에 큰 영향을 줘요. ` +
          `중요한 결정 전에 꼭 누군가에게 물어보고 나서 움직이지 않나요? ` +
          `인성(편인+정인) ${resourceStarCount}개를 근거로 한 해석이에요.`
        : `사람에게 크게 기대지도, 완전히 혼자 판단하지도 않는 균형 잡힌 편이에요. 상황에 따라 조언을 참고하되 최종 결정은 스스로 내리는 쪽에 가까워요. ` +
          `관성 ${officerStarCount}개·인성 ${resourceStarCount}개의 균형을 근거로 한 해석이에요.`;

  // ⑧ 의사결정 스타일
  const decisionStyle =
    dayStrength === "strong"
      ? `직관적으로 빠르게 결정하고 밀어붙이는 편이에요. 속도는 강점이지만, 중요한 결정일수록 하루 정도 시간을 두고 다시 보면 실수가 확 줄어요. ` +
        `결정하고 나서 되돌아보면 "조금 더 생각해볼걸" 싶을 때가 있지 않나요? ` +
        `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})을 근거로 한 해석이에요.`
      : `신중하게 정보를 모으고 나서 결정하는 편이에요. 다만 너무 오래 재다가 타이밍을 놓치는 경우도 있어서, 결정 기한을 스스로 정해두는 게 도움이 돼요. ` +
        `고민이 길어질 때 결국 기한이 정해져야 움직이는 편 아닌가요? ` +
        `일간 ${dayStemKo}(${dayStrengthShort(dayStrength)})을 근거로 한 해석이에요.`;

  // ⑨ 강점 3개 (실제 근거 기반 랭킹)
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
      detail: `${gilsin.join(", ")} 같은 길신이 있어서, 결정적인 순간에 사람이나 상황의 도움을 받는 경우가 많아요.`,
      evidence: `길신 ${gilsin.join(", ")}`,
      score: gilsin.length * 2,
    },
    {
      title: "안정적으로 신뢰를 쌓는 힘",
      detail: `관성이 ${officerStarCount}개로, 정해진 틀 안에서 꾸준히 신뢰를 쌓아 결과를 만들어내는 힘이 있어요.`,
      evidence: `관성 ${officerStarCount}개`,
      score: officerStarCount,
    },
  ];
  const strengths = [...strengthCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑩ 조심할 점 3개 (근거 기반)
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
      detail: `${gwimunRelations.join(", ")} 같은 관계가 있어서, 생각이 복잡해지고 예민해지는 시기에 돈 관련 결정을 미루는 게 나아요.`,
      evidence: gwimunRelations.length > 0 ? `귀문 ${gwimunRelations.join(", ")}` : "귀문 관계 없음",
      score: gwimunRelations.length > 0 ? 3 : 0,
    },
    {
      title: "벌여놓고 마무리를 못 짓는 패턴",
      detail: `식상 ${outputStarCount}개로 새로 벌이는 힘은 있지만, 벌인 만큼 마무리가 따라가지 않으면 힘이 분산돼요.`,
      evidence: `식상 ${outputStarCount}개`,
      score: outputStarCount >= 2 ? 2 : 0,
    },
  ];
  const cautions = [...cautionCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ title, detail, evidence }) => ({ title, detail, evidence }));

  // ⑪ 자기 경험 비교 질문
  const selfCheckQuestions = [
    `실제로도 ${dayStrength === "strong" ? "한번 정하면 잘 안 바뀐다는 말을 듣는" : "결정하기 전에 여러 번 생각하는"} 편인가요?`,
    `${activeCompare === "output" ? "뭔가를 벌이는 건 잘하는데 마무리가 약하다는 말을 들어본 적" : "직접 해야 마음이 편하다는 느낌을 받은 적"} 있나요?`,
    hyungsin.length > 0
      ? "돌아보면, 급하게 결정했다가 후회한 순간이 몇 번쯤 있었나요?"
      : "바쁠 때 오히려 돈 관리가 느슨해지는 걸 느낀 적 있나요?",
  ];

  // ⑫ 왜 이런 결과가 나왔나 (근거 총정리, 마지막 배치)
  const daeunFlowNote =
    daeunList.length > 0
      ? `이번 생애 대운은 총 ${daeunList.length}단계로 흘러가고, 지금은 그중 ${currentDaeun ? `${currentDaeun.ageRange}세 ${currentDaeun.ganzhi}` : "특정 시점"} 구간이에요. 정확한 시기별 흐름은 유료 리포트에서 더 자세히 볼 수 있어요.`
      : "대운 정보는 이번 계산에서 확인되지 않았어요.";

  const evidenceExplainer =
    `이 결과는 태어난 날의 하늘 기운(일간) ${dayStemKo}(${dayElement})을 중심에 두고, 원국 전체 여덟 글자의 오행 균형과 십성(재성·비겁·식상·관성·인성) 개수, 격국(${geukguk})과 용신(${facts.yongsin.join(", ") || "특이 없음"})까지 함께 봐서 만들었어요. ` +
    `쉽게 말하면, "나"를 뜻하는 글자(일간)가 얼마나 힘이 있는지(${dayStrengthShort(dayStrength)}), 그 주변에 돈(재성)·경쟁(비겁)·활동(식상)·조직(관성)·정보(인성)를 뜻하는 글자가 몇 개씩 있는지를 보고 성향을 읽은 거예요. ` +
    `${daeunFlowNote} ` +
    `오행 분포는 ${Object.entries(facts.fiveElements).map(([k, v]) => `${k} ${v}개`).join(", ")}였고, 그중 ${dominantElement}이 가장 강했어요.`;

  return {
    snapshot,
    temperament,
    earningStyle,
    keepingStyle,
    leakPattern,
    workStyle,
    peopleAndMoney,
    decisionStyle,
    strengths,
    cautions,
    selfCheckQuestions,
    evidenceExplainer,
  };
}
