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

export const PERSONALITY_CHECK_ITEMS: PersonalityCheckItem[] = [
  { id: "speed", leftLabel: "빠르게 결정하는 편", rightLabel: "충분히 생각한 후 결정하는 편" },
  { id: "plan", leftLabel: "계획적으로 움직이는 편", rightLabel: "즉흥적으로 움직이는 편" },
  { id: "risk", leftLabel: "새로운 기회·위험을 감수하는 편", rightLabel: "안정을 우선하는 편" },
  { id: "autonomy", leftLabel: "혼자 결정하는 편", rightLabel: "사람 의견·관계에 영향받는 편" },
  { id: "spendAwareness", leftLabel: "소비·지출을 잘 파악하는 편", rightLabel: "돈이 어디로 나가는지 잘 모르는 편" },
  { id: "savingConsistency", leftLabel: "저축·목표관리가 일정한 편", rightLabel: "남으면 하거나 계획이 약한 편" },
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
