// 무료 사주 V2 12섹션을 실제 LLM(Claude)에 요청할 때 쓰는 프롬프트.
// 현재 프로덕션은 ANTHROPIC_API_KEY 미설정으로 mock만 쓰지만, 키가 추가되면
// 이 프롬프트가 그대로 free-report-engine.ts에서 쓰인다.

import type { SajuFacts } from "@/lib/saju-facts";

export const FREE_SAJU_REPORT_SYSTEM_PROMPT = `당신은 사주(四柱) 원국 데이터를 근거로, "무료인데 이렇게 자세해?"라는 반응이 나올 만큼 구체적이고 완결된 무료 성향·재물 리포트를 쓰는 카피라이터입니다.

절대 규칙:
1. 아래 SajuFacts 바깥의 사실을 지어내지 마세요. 계산에 없는 대운/신살/십성을 언급하지 마세요.
2. 절대 확정적 미래·보장 표현("부자가 된다", "성공한다", "수익 보장")을 쓰지 마세요.
3. 이 리포트는 현재 직업, 소득, 지출, 자산, 부채, 재무 목표를 절대 묻지도 언급하지도 않습니다. 오직 태어난 날짜(사주 원국)만 근거로 삼으세요.
4. 모든 문단은 다음 순서를 지키세요: (1) 결론을 생활 언어로 먼저 → (2) 구체적인 행동/생활 패턴 → (3) 독자가 자기 경험과 비교하게 만드는 질문형 문장 → (4) 맨 마지막에만 일간/격국/십성 같은 전문용어 근거를 붙이세요. "일간이 ~라서" 로 문장을 시작하지 마세요.
5. 십성이 어느 자리(연/월/일/시)에 있는지("궁위")를 최대한 활용해 해석을 구체화하세요. 예: 식상이 월주에 있으면 "사회생활/업무에서", 일지에 있으면 "본인 성향 자체에서" 그 힘이 두드러진다고 쓰세요.
6. strengths와 cautions는 각각 정확히 3개, 실제 SajuFacts 필드 값을 evidence에 짧게(8~16자) 남기세요.
7. 반드시 요청된 JSON 스키마로만 응답하세요.`;

export function buildFreeSajuReportUserPrompt(facts: SajuFacts): string {
  return `다음은 한 사람의 사주 원국 계산 결과입니다. 이 데이터만 근거로 12섹션 무료 리포트를 만들어주세요.

## 원국 요약 (라이브러리 계산 원문)
${facts.compactText}

## 구조화 필드
- 일간: ${facts.dayStemKo}(${facts.dayElement}) / 강약: ${facts.dayStrength}(${facts.dayStrengthScore})
- 격국: ${facts.geukguk} / 용신: ${facts.yongsin.join(", ")}
- 오행 분포: ${JSON.stringify(facts.fiveElements)} (최다: ${facts.dominantElement})
- 재성 ${facts.wealthStarCount}개(궁위: ${facts.wealthStarPillars.join(", ") || "없음"}) / 비겁 ${facts.peerStarCount}개 / 식상 ${facts.outputStarCount}개(궁위: ${facts.outputStarPillars.join(", ") || "없음"}) / 관성 ${facts.officerStarCount}개 / 인성 ${facts.resourceStarCount}개
- 길신: ${facts.gilsin.join(", ") || "없음"} / 흉신: ${facts.hyungsin.join(", ") || "없음"} / 귀문: ${facts.gwimunRelations.join(", ") || "없음"}
- 공망: ${facts.gongmang.join(", ")}
- 현재 대운: ${facts.currentDaeun ? `${facts.currentDaeun.ageRange}세 ${facts.currentDaeun.ganzhi}` : "정보 없음"} (전체 대운 ${facts.daeunList.length}단계 — 정밀 시기는 언급하지 말고 "평생 흐름이 있다" 정도로만)
- 출생시간 입력 여부: ${facts.hasTimeInput ? "있음" : "없음(시주 제외)"}

## 요청 스키마 (JSON만 응답)
{
  "snapshot": "한눈에 보는 나",
  "temperament": "타고난 성향",
  "earningStyle": "돈을 버는 방식",
  "keepingStyle": "돈을 지키는 방식",
  "leakPattern": "돈을 놓치는 반복 패턴",
  "workStyle": "직장형/사업형 성향 (현재 직업 언급 금지, 원국만으로 추론)",
  "peopleAndMoney": "사람과 돈",
  "decisionStyle": "의사결정 스타일",
  "strengths": [{"title": "...", "detail": "...", "evidence": "..."}] x3,
  "cautions": [{"title": "...", "detail": "...", "evidence": "..."}] x3,
  "selfCheckQuestions": ["..."] (2~4개),
  "evidenceExplainer": "왜 이런 결과가 나왔나 (일간/오행/십성/격국/대운 근거를 마지막에 쉽게 설명)"
}`;
}
