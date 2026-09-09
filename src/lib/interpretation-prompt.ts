// 실제 LLM(Claude 등)에 보낼 프롬프트를 구성한다.
// 원칙: LLM은 여기 주어진 SajuFacts 바깥의 사실을 추측하지 않는다.
// 확정적 미래예측/보장 표현을 쓰지 않는다.
// 사용자가 "이거 내 얘기인데?" 하고 느끼도록, 자기 경험과 비교하게 만드는
// 질문형 문장을 최소 1개 이상 포함한다.

import type { SajuFacts } from "@/lib/saju-facts";

export const INTERPRETATION_SYSTEM_PROMPT = `당신은 사주(四柱) 원국 데이터를 "재물/돈" 관점으로 해석하는 카피라이터입니다.

절대 규칙:
1. 아래에 주어진 계산 결과(SajuFacts) 바깥의 사실을 지어내지 마세요. 계산에 없는 대운/신살/오행을 언급하지 마세요.
2. "부자가 된다", "성공한다", "수익을 보장한다" 같은 확정적 미래·보장 표현을 쓰지 마세요.
3. "누구에게나 맞는 말"을 쓰지 마세요. 반드시 주어진 필드(일간, 오행 분포, 십성, 대운 등)를 구체적으로 근거로 삼아 문장을 만드세요.
4. summary 또는 money_style 중 최소 한 곳에는, 사용자가 자기 경험과 비교하게 만드는 질문형 문장을 1개 이상 넣으세요. 예: "실제로도 시작은 빠른데 유지가 어렵다는 말을 듣는 편인가요?"
5. 반드시 요청된 JSON 스키마로만 응답하세요. 다른 텍스트를 덧붙이지 마세요.
6. evidence 배열에는 이번 해석에서 실제로 근거로 사용한 SajuFacts 필드명과 값을 최소 3개 이상 적으세요 (예: "일간 庚(경금), 강약: strong(80)").
7. "재미로 보는 콘텐츠"라는 톤을 유지하되, 진부하지 않고 구체적으로 쓰세요.`;

export function buildInterpretationUserPrompt(facts: SajuFacts): string {
  return `다음은 한 사람의 사주 원국 계산 결과입니다. 이 데이터만 근거로 "재물/돈" 해석을 만들어주세요.

## 원국 요약 (라이브러리 계산 원문)
${facts.compactText}

## 이번 해석에서 특히 참고할 구조화 필드
- 일간: ${facts.dayStemKo}(${facts.dayElement}) / 강약: ${facts.dayStrength}(${facts.dayStrengthScore})
- 격국: ${facts.geukguk} / 용신: ${facts.yongsin.join(", ")}
- 오행 분포: ${JSON.stringify(facts.fiveElements)} (가장 강한 오행: ${facts.dominantElement})
- 재성(편재+정재) 개수: ${facts.wealthStarCount} (${facts.wealthStarTypes.join(", ") || "없음"})
- 비겁(비견+겁재) 개수: ${facts.peerStarCount}
- 식상(식신+상관) 개수: ${facts.outputStarCount}
- 주요 합충형파해원진: ${facts.keyRelations.join(", ") || "특이 관계 없음"}
- 길신: ${facts.gilsin.join(", ") || "없음"} / 흉신: ${facts.hyungsin.join(", ") || "없음"}
- 공망: ${facts.gongmang.join(", ")}
- 현재 대운: ${facts.currentDaeun ? `${facts.currentDaeun.ageRange}세 ${facts.currentDaeun.ganzhi} (${facts.currentDaeun.stemTenGod}/${facts.currentDaeun.branchTenGod})` : "정보 없음"}
- 다음 대운: ${facts.nextDaeun ? `${facts.nextDaeun.ageRange}세 ${facts.nextDaeun.ganzhi} (${facts.nextDaeun.stemTenGod}/${facts.nextDaeun.branchTenGod})` : "정보 없음"}
- 출생시간 입력 여부: ${facts.hasTimeInput ? "있음 (시주 포함)" : "없음 (시주 제외, 일반적 해석)"}

## 요청 스키마 (JSON만 응답)
{
  "summary": "핵심 성향 한 문단",
  "money_style": "사람과 돈의 관계 + 핵심 재물 스타일",
  "earning_style": "돈 버는 방식",
  "keeping_style": "돈 지키는 방식 / 돈을 놓치는 패턴",
  "risk_pattern": "위험/실수 패턴",
  "career_business": "직업형인지 사업형인지, 왜 그런지",
  "timing": "앞으로의 흐름 힌트 (현재/다음 대운 근거)",
  "action": "지금 필요한 행동 한 가지",
  "evidence": ["근거로 사용한 필드 3개 이상"]
}`;
}
