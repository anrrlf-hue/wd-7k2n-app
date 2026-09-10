// "정밀 심리검사"가 아니라 개인화 보조정보 + 실제 돈습관을 함께 얻는
// 아주 짧은 자기정보 체크. REUSE-FIRST 조사 결과 이 6개 축을 한 번에 묻는
// 기존 공개·상업사용 가능 척도는 찾지 못했다 — 가장 근접한 DOSPERT(위험감수
// 척도)는 상업적 사용을 명시적으로 금지한다(비상업 인용만 허용). 그래서
// 이 6문항은 GAP-BUILD로 직접 만들었다: 단일 문항 양극 슬라이더(1~5) 형태의
// 아주 단순한 자기보고이며, 화면에는 "정밀 검사"가 아니라 "간단 자기정보 체크"
// 라고만 표기한다.
//
// 이전 라운드까지는 이 6문항(성향)과 별도로 후반부에 MoneyCheckStep(지출
// 파악/저축/충동구매/자산목표 4문항)을 또 물어봐서 사용자가 총 10개 질문에
// 답해야 했다. 이번 라운드에서 MoneyCheckStep을 없애고, 그 4문항 중 실제
// 필요한 정보(지출 파악도, 저축·목표관리 습관)를 아래 5·6번 축으로 흡수했다
// — 질문 총량은 그대로 6개를 유지하면서 개인화 + 돈습관 정보를 함께 얻는다.
// 판정 목적이 아니라 사주/손금 데이터와 비교해 개인화 체감을 높이는 용도다.

export interface PersonalityCheckItem {
  id: string;
  leftLabel: string;
  rightLabel: string;
}

// 라벨은 320px 화면에서 좌우 두 줄로 나란히 놓인다 — 원래 문장형 라벨이
// 길어서(예: "돈이 어디로 나가는지 잘 모르는 편" 18자) 작은 화면에서
// 지저분하게 줄바꿈됐다. 뜻은 그대로 두고 8~9자 안팎의 짧은 구로 줄였다.
export const PERSONALITY_CHECK_ITEMS: PersonalityCheckItem[] = [
  { id: "speed", leftLabel: "빠르게 결정", rightLabel: "신중하게 결정" },
  { id: "plan", leftLabel: "계획적으로 움직임", rightLabel: "즉흥적으로 움직임" },
  { id: "risk", leftLabel: "기회·위험 감수", rightLabel: "안정 우선" },
  { id: "autonomy", leftLabel: "혼자 결정", rightLabel: "관계·의견 영향받음" },
  { id: "spendAwareness", leftLabel: "지출을 잘 파악", rightLabel: "지출이 잘 안 보임" },
  { id: "savingConsistency", leftLabel: "저축이 일정함", rightLabel: "저축이 들쭉날쭉" },
];

export type PersonalityCheckLevel = "왼쪽" | "중간" | "오른쪽";

export interface PersonalityCheckFacts {
  answers: Record<string, number>;
  levels: Record<string, PersonalityCheckLevel>;
}

function levelOf(v: number): PersonalityCheckLevel {
  if (v <= 2) return "왼쪽";
  if (v >= 4) return "오른쪽";
  return "중간";
}

/** answers: 문항 id -> 1~5 응답(1=왼쪽 라벨, 5=오른쪽 라벨). */
export function scorePersonalityCheck(answers: Record<string, number>): PersonalityCheckFacts {
  const levels: Record<string, PersonalityCheckLevel> = {};
  for (const item of PERSONALITY_CHECK_ITEMS) {
    levels[item.id] = levelOf(answers[item.id] ?? 3);
  }
  return { answers, levels };
}

/** MBTI + 6문항을 함께 실어 나르는 입력 묶음. free-report-mock.ts의
 * realWorldPersonalization이 이 둘을 우선순위를 두고 조합한다 — 둘 다
 * 없으면(스킵) null로 둔다. */
export interface PersonalityInput {
  mbti: import("@/lib/mbti-facts").MbtiType | null;
  check: PersonalityCheckFacts | null;
}
