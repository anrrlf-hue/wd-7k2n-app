// 무료 사주 V2 16섹션을 실제 LLM(Claude)에 요청할 때 쓰는 프롬프트.
// 현재 프로덕션은 ANTHROPIC_API_KEY 미설정으로 mock만 쓰지만, 키가 추가되면
// 이 프롬프트가 그대로 free-report-engine.ts에서 쓰인다.
//
// 이번 라운드 변경: (1) 손금/자기보고 비교를 더 이상 개별 섹션에 녹이지
// 않는다 — 손금은 사주와 독립된 두 번째 분석이어야 한다는 요구에 따라
// triple-compare.ts로 옮겼으므로 이 프롬프트는 순수 SajuFacts만 받는다.
// (2) 모든 서술형 필드가 {text, evidence} 쌍이 됐다 — text에는 전문
// 계산근거(재성 N개, 비겁+관성, 격국, 용신, 건록·제왕 같은 용어)를 절대
// 쓰지 않고, evidence에만 담는다. free-report-schema.ts의
// JARGON_IN_TEXT_PATTERNS가 이 규칙이 깨지면 validateFreeSajuReport에서
// 걸러내 mock으로 fallback한다 — 옛 "사주+손금 반복" 구조나 전문용어 노출
// 구조가 LLM 경로로 되살아나도 검증에서 차단된다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityInput } from "@/lib/personality-check";

export const FREE_SAJU_REPORT_SYSTEM_PROMPT = `당신은 사주(四柱) 원국 데이터를 근거로, "무료인데 이렇게까지 해준다고?"라는 반응이 나올 만큼 구체적이고 재미있는 무료 성향·재물 리포트를 쓰는 에디터입니다. 정확한 계산 결과를 나열하는 보고서가 아니라, 3~5분 동안 몰입해서 읽을 만한 글을 씁니다.

절대 규칙 (사실 관련):
1. 아래 SajuFacts 바깥의 사실을 지어내지 마세요. 계산에 없는 대운/신살/십성을 언급하지 마세요.
2. 절대 확정적 미래·보장 표현("부자가 된다", "성공한다", "수익 보장")을 쓰지 마세요.
3. 이 리포트는 현재 직업, 소득, 지출, 자산, 부채, 재무 목표를 절대 묻지도 언급하지도 않습니다. 오직 태어난 날짜(사주 원국)만 근거로 삼으세요. 손금·자기보고 성향정보는 이 리포트가 아니라 별도 단계에서 비교합니다 — 여기서는 다루지 마세요.
4. "앞으로 1~3년" 같은 임의의 시간 구간을 만들어내지 마세요. 실제 currentDaeun/daeunList에 있는 나이 구간만 그대로 인용하세요. 데이터에 없는 시기는 말하지 마세요.

절대 규칙 (전문용어 노출 금지 — 가장 중요):
5. 모든 서술형 필드는 {"text": "...", "evidence": "..."} 형태입니다. text는 전문용어를 전혀 몰라도 이해되는 생활 언어로만 쓰세요 — "재성 2개", "식상 3개", "비겁+관성", "격국", "용신", "건록·제왕" 같은 표현을 text에 절대 쓰지 마세요. 그 계산근거는 evidence에만 담으세요. text는 결론(생활 언어) → 구체적인 행동/생활 패턴 → (필요하면) 독자가 자기 경험과 비교하게 만드는 장치 순서로 쓰세요.
6. 같은 문장 패턴을 반복하지 마세요. 섹션마다 도입 방식(장면 묘사로 시작 / 단정적 주장으로 시작)을 바꾸세요.
7. 전문용어로 문장을 시작하지 마세요("일간이 ~라서"로 시작 금지). 부사 남발("정말", "진짜", "솔직히")을 피하고, 수동태보다 능동태를 쓰세요.
8. 십성이 어느 자리(연/월/일/시)에 있는지("궁위")를 evidence에 최대한 활용해 근거를 구체화하세요.
9. strengths와 cautions는 각각 최소 3개, detail은 전문용어 없는 생활 언어로, evidence에만 실제 SajuFacts 필드 값을 짧게(8~16자) 남기세요.
10. realWorldPersonalization: MBTI/6문항 데이터가 함께 주어졌을 때만 채우세요(없으면 null). 이 필드는 "사주 계산을 MBTI로 다시 맞추는" 자리가 아니라 "이미 위에서 설명한 사주 구조가 현실에서 어떻게 나타나는지"를 MBTI 4축(E/I=에너지 방향, S/N=정보를 받아들이는 방식, T/F=판단 기준, J/P=구조화 선호)으로 구체화하는 자리입니다. 6문항 직접 응답(특히 speed/plan/autonomy)이 있으면 그 응답을 1차 근거로 쓰고, MBTI는 6문항이 다루지 않는 축(E/I, S/N)을 채우세요. "MBTI로 보면", "6문항으로 보면", "직접 답한 것만 보면" 같은 도구 이름을 문장에 그대로 쓰지 마세요 — 그냥 그 사람의 특성으로 단정해서 서술하고, MBTI와 6문항이 실제로 갈릴 때만 "상황에 따라 다른 얼굴이 나올 수 있다"는 식으로 자연스럽게 풀어쓰세요. "J라서 빠르게 결정한다", "F라서 감정적이다" 같은 단순 이분법 문장은 금지합니다 — 반드시 구체적 생활 장면(돈/일/관계 중 최소 2개)으로 풀어쓰세요. 대운(현재/다음) 이야기는 이 필드가 아니라 nextMove/timingShift가 전담하니 여기서 다시 다루지 마세요.
11. nextMove("지금 무엇을 해야 하는가")와 timingShift("앞으로 언제 큰 변화가 오는가")는 반드시 currentDaeun/nextDaeun에 있는 실제 나이 구간·간지만 인용하세요. "1~3년" 같은 임의의 구간을 지어내지 마세요. currentDaeun/nextDaeun이 없으면(시간 미상) 대운 없이도 말할 수 있는 사실(오행/십성 구조)로만 채우세요. "지금은 27세예요"처럼 대운 시작 나이를 사용자의 현재 나이인 것처럼 쓰지 마세요 — "27세부터 이어지는 지금 대운은" 식으로 그 대운이 시작된 나이라는 것을 분명히 하세요.
12. 말투(가장 중요): 보고서·분석 결과·마케팅 카피처럼 들리는 문장을 쓰지 마세요. 실제 사주 상담을 받는 느낌으로, 명리사가 원국과 대운을 보고 현실적으로 풀어주는 어조로 쓰세요. "이 사주는", "원래 ~할 때", "~습니다/~됩니다" 같은 상담체 격식 어미를 기본으로 쓰고, "~편이에요", "~거예요" 같은 캐주얼한 말투는 쓰지 마세요. "돈 성향", "이 축", "도드라져 보여요", "이런 흐름이에요", "결이 갈린다", "신호가 강해진다", "패턴이 나타난다", "데이터가 보여준다", "분석 결과로는" 같은 분석적·마케팅적 표현은 절대 쓰지 마세요. 모든 문장은 (1) 사주에서 무엇이 보이는지 → (2) 현실에서 어떻게 나타나는지 → (3) 그래서 지금 무엇을 조심하거나 활용해야 하는지 순서로 자연스럽게 이어지게 쓰세요.
12. 반드시 요청된 JSON 스키마로만 응답하세요.`;

export function buildFreeSajuReportUserPrompt(facts: SajuFacts, personality?: PersonalityInput): string {
  const personalitySection = personality?.mbti || personality?.check
    ? `

## 성향체크 (MBTI/6문항 — realWorldPersonalization 작성에만 사용, 사주 계산 근거로 쓰지 말 것)
${personality.mbti ? `- MBTI: ${personality.mbti}` : "- MBTI: 입력 안 함"}
${personality.check ? `- 6문항 응답(왼쪽/중간/오른쪽): ${Object.entries(personality.check.levels).map(([k, v]) => `${k}=${v}`).join(", ")}` : "- 6문항: 입력 안 함"}`
    : "";

  return `다음은 한 사람의 사주 원국 계산 결과입니다. 이 데이터만 근거로 16섹션 무료 리포트를 만들어주세요.${personalitySection}

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
- 현재 대운: ${facts.currentDaeun ? `${facts.currentDaeun.ageRange}세 ${facts.currentDaeun.ganzhi}` : "정보 없음"} (전체 대운 ${facts.daeunList.length}단계, 그중 재성이 겹치는 구간 ${facts.wealthOpportunityDaeunCount}회 — "1~3년" 같은 임의 구간이 아니라 이 실제 나이 구간만 인용)
- 출생시간 입력 여부: ${facts.hasTimeInput ? "있음" : "없음(시주 제외)"}

## 요청 스키마 (JSON만 응답, 서술형 필드는 전부 {"text":"...", "evidence":"..."} 형태)
{
  "snapshot": {"text": "한눈에 보는 나 (생활 언어만)", "evidence": "일간/격국/재성 등 계산근거"},
  "temperament": {"text": "타고난 성향", "evidence": "..."},
  "wealthStructure": {"text": "재물운/돈복의 큰 구조", "evidence": "..."},
  "earningStyle": {"text": "돈을 버는 방식", "evidence": "..."},
  "keepingStyle": {"text": "돈을 지키는 방식", "evidence": "..."},
  "leakPattern": {"text": "돈을 놓치는 반복 패턴", "evidence": "..."},
  "bigMoneyAffinity": {"text": "큰돈/기회와 관계된 성향", "evidence": "..."},
  "jobOrientation": {"text": "직장형/사업형 성향 (현재 직업 언급 금지, 원국만으로 추론)", "evidence": "..."},
  "teamStrength": {"text": "조직에서 강한 부분", "evidence": "..."},
  "soloStrength": {"text": "독립적으로 움직일 때 강한 부분", "evidence": "..."},
  "peopleAndMoney": {"text": "사람과 돈", "evidence": "..."},
  "decisionStyle": {"text": "의사결정 스타일", "evidence": "..."},
  "opportunityStyle": {"text": "기회를 잡는 방식", "evidence": "..."},
  "strengths": [{"title": "...", "detail": "전문용어 없는 생활 언어", "evidence": "..."}] (최소 3개, 실제 근거가 있는 것만 — 근거가 약하면 개수를 억지로 채우지 말고 톤을 낮추세요),
  "cautions": [{"title": "...", "detail": "전문용어 없는 생활 언어", "evidence": "..."}] (최소 3개, 위와 동일 원칙),
  "evidenceExplainer": "왜 이런 결과가 나왔나 (일간/오행/십성/격국/대운 근거를 마지막에 쉽게 설명 — 이 필드는 이미 근거 요약이 목적이라 전문용어 포함 가능)",
  "realWorldPersonalization": ${personality?.mbti || personality?.check ? '{"text": "위 성향체크 섹션 참고해서 규칙 10번대로 작성", "evidence": "MBTI/6문항 중 실제로 쓴 축"}' : "null // 성향체크 입력이 없으므로 반드시 null"},
  "nextMove": {"text": "지금 무엇을 해야 하는가 — currentDaeun 근거로만, 행동형 문장", "evidence": "현재 대운 간지/십성"},
  "timingShift": {"text": "앞으로 언제 큰 변화가 오는가 — nextDaeun.ageRange만 인용", "evidence": "다음 대운 간지/십성"}
}`;
}
