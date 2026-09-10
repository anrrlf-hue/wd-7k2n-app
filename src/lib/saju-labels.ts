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

/** 일간 10종 물상(物像) + 핵심 기질. be-realdeveloper/saju의
 * interpretation.md 해석 사전(제2장 "일간 10종 — 타고난 본질")을 그대로
 * 옮겼다 — 새로 지어낸 이미지가 아니라 실제 명리학 레퍼런스다.
 * elementTemperamentPhrase(5개 오행)는 갑/을처럼 같은 오행 안의 두 일간을
 * 구분하지 못했다 — 실제 사주 서비스 벤치마크(예시 리딩)를 보면 "태양처럼",
 * "호랑이의 기상"처럼 일간 단위 물상으로 문장을 여는 경우가 많았는데,
 * 우리는 오행 단위로만 뭉뚱그려서 갑목과 을목이 똑같은 문장을 받았다.
 * 이 함수는 10개 일간 각각의 물상으로 그 차이를 살린다. */
export function dayStemImagery(dayStemKo: string): { image: string; core: string } {
  const table: Record<string, { image: string; core: string }> = {
    갑: { image: "큰 나무", core: "곧고 진취적으로 앞장서는" },
    을: { image: "화초·덩굴", core: "유연하게 적응하며 살아남는" },
    병: { image: "태양", core: "밝고 화통하게 표현하는" },
    정: { image: "촛불·등불", core: "섬세하게 몰입하고 헌신하는" },
    무: { image: "산·대지", core: "듬직하게 포용하고 중심을 잡는" },
    기: { image: "논밭·정원", core: "섬세하게 챙기고 관리하는" },
    경: { image: "원석·도끼", core: "강직하게 밀어붙이고 결단하는" },
    신: { image: "보석·칼", core: "예리하고 세련되게 기준을 세우는" },
    임: { image: "바다·강", core: "큰 그릇으로 통찰하고 유연한" },
    계: { image: "비·이슬", core: "총명하고 섬세하게 감지하는" },
  };
  return table[dayStemKo] ?? { image: "고유한 결", core: "자기만의 방향을 가진" };
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
