// ssaju가 반환하는 영문/한자 원문 값을 화면·문장에 그대로 노출하면
// "강약: 'neutral'" 같은 디버그 로그처럼 보인다. 사람이 읽는 문장/칩에는
// 항상 이 라벨을 거쳐서 쓴다.

import type { SajuFacts } from "@/lib/saju-facts";

export function dayStrengthLabel(strength: SajuFacts["dayStrength"]): string {
  switch (strength) {
    case "strong":
      return "기운이 강한 편";
    case "weak":
      return "기운이 약한 편";
    default:
      return "기운이 중화에 가까운 편";
  }
}

export function dayStrengthShort(strength: SajuFacts["dayStrength"]): string {
  switch (strength) {
    case "strong":
      return "강함";
    case "weak":
      return "약함";
    default:
      return "중화";
  }
}

/** 궁위론: 십성이 어느 자리(연/월/일/시)에 있는지에 따른 생활 영역 의미.
 * be-realdeveloper/saju의 "궁위론" 구조를 참고해 자체 구현. */
export function pillarLifeAreaLabel(pillar: "year" | "month" | "day" | "hour"): string {
  switch (pillar) {
    case "year":
      return "어릴 때/가족·기반";
    case "month":
      return "사회생활/직업 활동";
    case "day":
      return "나 자신/가장 가까운 관계";
    case "hour":
      return "말년/실행한 결과가 드러나는 자리";
  }
}

/** 오행별 전통적 기질 키워드. 특정 일간 하나에 고정된 문장이 아니라
 * dayElement와 dayStrength를 조합해 문장을 만드는 재료로만 쓴다. */
export function elementTemperamentPhrase(element: string): string {
  switch (element) {
    case "목":
      return "새로운 걸 벌이고 성장시키는 방향으로 에너지가 향하는 편";
    case "화":
      return "반응이 빠르고 사람 앞에서 에너지가 살아나는 편";
    case "토":
      return "중심을 잡고 오래 지속하는 쪽으로 안정을 추구하는 편";
    case "금":
      return "기준이 분명하고 맺고 끊는 게 확실한 편";
    case "수":
      return "상황에 맞춰 유연하게 흐름을 타는 편";
    default:
      return "고유한 방향성을 가진 편";
  }
}
