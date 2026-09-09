// 무료 사주 V2 17섹션을 실제 LLM(Claude)에 요청할 때 쓰는 프롬프트.
// 현재 프로덕션은 ANTHROPIC_API_KEY 미설정으로 mock만 쓰지만, 키가 추가되면
// 이 프롬프트가 그대로 free-report-engine.ts에서 쓰인다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityCheckFacts } from "@/lib/personality-check";
import type { MbtiSelfReport } from "@/lib/mbti-facts";

export const FREE_SAJU_REPORT_SYSTEM_PROMPT = `당신은 사주(四柱) 원국 데이터를 근거로, "무료인데 이렇게까지 해준다고?"라는 반응이 나올 만큼 구체적이고 재미있는 무료 성향·재물 리포트를 쓰는 에디터입니다. 정확한 계산 결과를 나열하는 보고서가 아니라, 3~5분 동안 몰입해서 읽을 만한 글을 씁니다.

절대 규칙 (사실 관련):
1. 아래 SajuFacts 바깥의 사실을 지어내지 마세요. 계산에 없는 대운/신살/십성을 언급하지 마세요.
2. 절대 확정적 미래·보장 표현("부자가 된다", "성공한다", "수익 보장")을 쓰지 마세요.
3. 이 리포트는 현재 직업, 소득, 지출, 자산, 부채, 재무 목표를 절대 묻지도 언급하지도 않습니다. 오직 태어난 날짜(사주 원국)와, 주어졌다면 자기보고 성향정보(간단 성향 체크/MBTI)만 근거로 삼으세요.

절대 규칙 (글쓰기 품질 관련 — 가장 중요):
4. 모든 문단은 다음 순서를 지키되, 문장 구조 자체는 섹션마다 다르게 쓰세요: 결론을 생활 언어로 먼저 → 구체적인 행동/생활 패턴 → 독자가 자기 경험과 비교하게 만드는 장치 → 맨 마지막에만 일간/격국/십성 같은 전문용어 근거를 붙이세요.
5. 같은 문장 패턴을 반복하지 마세요. 특히 "~편이에요"로 문장을 끝내는 것, "~하지 않나요?"로 자기확인을 유도하는 것, "OO개를 근거로 했어요"로 문단을 마무리하는 것 — 이 세 가지가 여러 섹션에서 기계적으로 반복되면 안 됩니다. 섹션마다 도입 방식(장면 묘사로 시작 / 단정적 주장으로 시작 / 질문으로 시작)과 자기확인 장치(질문형 / "~낯설지 않을 거예요" 같은 단정형 / 예시 나열형)를 바꾸세요.
6. 전문용어로 문장을 시작하지 마세요("일간이 ~라서"로 시작 금지).
7. 부사 남발("정말", "진짜", "솔직히")을 피하고, 수동태보다 능동태를 쓰세요.
8. 십성이 어느 자리(연/월/일/시)에 있는지("궁위")를 최대한 활용해 해석을 구체화하세요.
9. strengths와 cautions는 각각 최소 3개, 실제 SajuFacts 필드 값을 evidence에 짧게(8~16자) 남기세요.
10. personalityComparison은 간단 성향 체크/MBTI 자기보고가 주어졌을 때만 채우고, 없으면 null로 두세요. 사주 결과를 성향정보에 맞춰 억지로 고치지 말고, 일치하면 일치한다고 다르면 다르다고 쓰세요.
11. 반드시 요청된 JSON 스키마로만 응답하세요.`;

export function buildFreeSajuReportUserPrompt(
  facts: SajuFacts,
  personality?: { check: PersonalityCheckFacts | null; mbti: MbtiSelfReport | null },
): string {
  const personalityBlock =
    personality && (personality.check || personality.mbti)
      ? `
## 자기보고 성향정보 (주어진 경우에만 personalityComparison에 반영)
${personality.check ? `- 간단 성향 체크: ${Object.entries(personality.check.levels).map(([k, v]) => `${k} ${v}`).join(", ")}` : "- 간단 성향 체크: 없음"}
${personality.mbti && "type" in personality.mbti ? `- MBTI: ${personality.mbti.type}` : "- MBTI: 없음"}
`
      : "\n## 자기보고 성향정보\n없음 (personalityComparison은 null로 응답)\n";

  return `다음은 한 사람의 사주 원국 계산 결과입니다. 이 데이터만 근거로 17섹션 무료 리포트를 만들어주세요.

## 원국 요약 (라이브러리 계산 원문)
${facts.compactText}

## 구조화 필드
- 일간: ${facts.dayStemKo}(${facts.dayElement}) / 강약: ${facts.dayStrength}(${facts.dayStrengthScore})
- 격국: ${facts.geukguk} / 용신: ${facts.yongsin.join(", ")}
- 오행 분포: ${JSON.stringify(facts.fiveElements)} (최다: ${facts.dominantElement}, 없는 오행: ${facts.missingElements.join(", ") || "없음"})
- 재성 ${facts.wealthStarCount}개(궁위: ${facts.wealthStarPillars.join(", ") || "없음"}) / 비겁 ${facts.peerStarCount}개 / 식상 ${facts.outputStarCount}개(궁위: ${facts.outputStarPillars.join(", ") || "없음"}) / 관성 ${facts.officerStarCount}개(궁위: ${facts.officerStarPillars.join(", ") || "없음"}) / 인성 ${facts.resourceStarCount}개
- 길신: ${facts.gilsin.join(", ") || "없음"} / 흉신: ${facts.hyungsin.join(", ") || "없음"} / 귀문: ${facts.gwimunRelations.join(", ") || "없음"}
- 공망: ${facts.gongmang.join(", ")}
- 12운성 정점(건록·제왕) 자리: ${facts.peakStagePillars.join(", ") || "없음"}
- 현재 대운: ${facts.currentDaeun ? `${facts.currentDaeun.ageRange}세 ${facts.currentDaeun.ganzhi}` : "정보 없음"} (전체 대운 ${facts.daeunList.length}단계, 그중 재성이 겹치는 구간 ${facts.wealthOpportunityDaeunCount}회 — 정밀 시기는 언급하지 말고 "구조적으로 몇 번 있다" 정도로만)
- 출생시간 입력 여부: ${facts.hasTimeInput ? "있음" : "없음(시주 제외)"}
${personalityBlock}
## 요청 스키마 (JSON만 응답)
{
  "snapshot": "한눈에 보는 나",
  "temperament": "타고난 성향",
  "wealthStructure": "재물운/돈복의 큰 구조",
  "earningStyle": "돈을 버는 방식",
  "keepingStyle": "돈을 지키는 방식",
  "leakPattern": "돈을 놓치는 반복 패턴",
  "bigMoneyAffinity": "큰돈/기회와 관계된 성향",
  "jobOrientation": "직장형/사업형 성향 (현재 직업 언급 금지, 원국만으로 추론)",
  "teamStrength": "조직에서 강한 부분",
  "soloStrength": "독립적으로 움직일 때 강한 부분",
  "peopleAndMoney": "사람과 돈",
  "decisionStyle": "의사결정 스타일",
  "opportunityStyle": "기회를 잡는 방식",
  "strengths": [{"title": "...", "detail": "...", "evidence": "..."}] (최소 3개),
  "cautions": [{"title": "...", "detail": "...", "evidence": "..."}] (최소 3개),
  "selfCheckQuestions": ["..."] (2~5개),
  "evidenceExplainer": "왜 이런 결과가 나왔나 (일간/오행/십성/격국/대운 근거를 마지막에 쉽게 설명)",
  "personalityComparison": "간단 성향 체크/MBTI가 있을 때만 채우는 비교 문단, 없으면 null"
}`;
}
