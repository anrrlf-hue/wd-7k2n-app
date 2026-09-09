// "정밀 심리검사"가 아니라 개인화 보조정보만 얻는 아주 짧은 성향 체크.
// REUSE-FIRST 조사 결과: 이 6개 축(결정속도/계획성/위험감수/자율성/
// 관계-돈 연동/기회 타이밍)을 한 번에 묻는 기존 공개·상업사용 가능 척도는
// 찾지 못했다 — 가장 근접한 DOSPERT(위험감수 척도)는 상업적 사용을 명시적
// 으로 금지한다(비상업 인용만 허용). 그래서 이 6문항은 GAP-BUILD로 직접
// 만들었다: 단일 문항 양극 슬라이더(1~5) 형태의 아주 단순한 자기보고이며,
// 화면에는 "정밀 Big5 검사"가 아니라 "간단 성향 체크"라고만 표기한다.

export interface PersonalityCheckItem {
  id: string;
  leftLabel: string;
  rightLabel: string;
}

export const PERSONALITY_CHECK_ITEMS: PersonalityCheckItem[] = [
  { id: "speed", leftLabel: "빠르게 결정하는 편", rightLabel: "오래 생각하고 결정하는 편" },
  { id: "plan", leftLabel: "계획을 세우고 움직이는 편", rightLabel: "즉흥적으로 움직이는 편" },
  { id: "risk", leftLabel: "위험을 감수하는 편", rightLabel: "안정성을 우선하는 편" },
  { id: "autonomy", leftLabel: "혼자 결정하는 편", rightLabel: "주변 의견에 영향받는 편" },
  { id: "relationMoney", leftLabel: "사람 관계가 돈 결정에 영향을 주는 편", rightLabel: "사람 관계와 돈 결정은 별개인 편" },
  { id: "opportunity", leftLabel: "새 기회를 먼저 잡는 편", rightLabel: "검증 후 움직이는 편" },
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
