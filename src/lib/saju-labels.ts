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
