// 간접체험(indirect-experience)에서 재물유형과 함께 상황을 개인화하는 보조
// 축. 새 손금 분류를 만들지 않는다 — 이미 계산되고 화면에도 노출되는
// PalmFacts.handShape를 그대로 재사용한다(src/lib/palm-facts.ts).

import type { PalmFacts, HandShape } from "@/lib/palm-facts";

export type PalmKeyword = HandShape;

/** palmFacts가 없거나(손금 스킵) 손 모양을 못 읽었으면 "unknown" —
 * indirect-experience-data.ts는 이 경우 성향 묘사 문장을 아예 생략한다. */
export function derivePalmKeyword(palmFacts: PalmFacts | null): PalmKeyword {
  if (!palmFacts) return "unknown";
  return palmFacts.handShape;
}
