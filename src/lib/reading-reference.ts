import type { RealityAnswer, RealityAnswerDomain } from "@/lib/reality-answer-contract";

/** This edition identifies only the deterministic, domain-level limitation below.
 * Change the edition whenever its wording/meaning changes. It is not a report ID
 * and cannot recover model prose, timing-window cautions or annual editions. */
export const CAUTION_EDITION = "question-caution-2026-10-v1";
export const CAUTION_AREA = "answer.avoid";
export const CAUTION_EVIDENCE = "interpretation-limit";

export interface ReadingReference {
  edition: string;
  area: string;
  evidence: string;
  domain: RealityAnswerDomain;
}

const CAUTIONS: Record<RealityAnswerDomain, { text: string; explanation: string }> = {
  love: {
    text: "상대방의 마음이나 행동을 내 사주만으로 확정할 수는 없습니다.",
    explanation: "이 문장은 상대의 마음을 안다는 뜻이 아닙니다. 상대가 실제로 전한 말과 관계를 이어가려는 의사를 함께 확인해야 한다는 해석의 한계입니다.",
  },
  relationship: {
    text: "상대방의 마음이나 행동을 내 사주만으로 확정할 수는 없습니다.",
    explanation: "한 사람의 사주만으로 다른 사람의 의도를 알 수는 없습니다. 관계를 판단할 때 실제 대화와 서로 기대하는 바를 확인하자는 뜻입니다.",
  },
  career: {
    text: "사주 시기가 실제 합격이나 채용 결과를 보장하는 것은 아닙니다.",
    explanation: "합격 여부에는 채용 수요, 지원 조건, 준비와 면접 등 현실의 변수가 작용합니다. 풀이에서 제시한 시기만으로 결과를 확정하지 말자는 뜻이며, 불합격을 예고한 문장은 아닙니다.",
  },
  work_business: {
    text: "사주 시기가 실제 사업 성공이나 계약 결과를 보장하는 것은 아닙니다.",
    explanation: "사업과 계약에는 수요, 조건, 비용과 상대방의 결정이 함께 작용합니다. 풀이의 시기를 성공의 보증으로 받아들이지 말자는 뜻이며, 실패를 예고한 문장은 아닙니다.",
  },
  money: {
    text: "재물운이 강한 시기와 실제 투자·수익 결과는 같은 뜻이 아닙니다.",
    explanation: "전통적인 재물 흐름 해석은 실제 수익을 검증한 예측이 아닙니다. 이 문장은 특정 투자 결과나 손실을 예고하지 않으며, 돈에 관한 판단에는 실제 조건과 위험을 따로 확인해야 한다는 뜻입니다.",
  },
  wellbeing: {
    text: "사주로 질병이나 치료 결과를 판단하지 않습니다.",
    explanation: "생활 리듬에 관한 풀이로 질병 유무나 치료 결과를 알아낼 수는 없습니다. 증상이나 건강에 관한 판단은 의료진과 확인해야 한다는 한계를 밝힌 문장입니다.",
  },
  overall: {
    text: "좋은 흐름이 보여도 모든 영역이 동시에 같은 결과로 움직인다는 뜻은 아닙니다.",
    explanation: "일, 관계, 생활은 각기 다른 현실 조건의 영향을 받습니다. 전체 흐름에 관한 풀이를 모든 분야의 결과에 그대로 적용하지 말자는 뜻입니다.",
  },
};

export function deterministicCaution(domain: RealityAnswerDomain): string {
  return CAUTIONS[domain].text;
}

export function referenceForCaution(answer: RealityAnswer): ReadingReference | undefined {
  if (answer.avoid !== deterministicCaution(answer.question.domain)) return undefined;
  return { edition: CAUTION_EDITION, area: CAUTION_AREA, evidence: CAUTION_EVIDENCE, domain: answer.question.domain };
}

// Do not catch independent questions such as "그 사람과 연애해도 될까요?".
// A referent to an earlier reading needs its actual passage, not just a topic.
export function refersToReading(raw: string): boolean {
  return /여기서는\s*이것만\s*조심해서\s*보세요|전체\s*풀이의\s*주의점/.test(raw)
    || /(?:방금|아까|앞서|앞에서|위에서|이전(?:에|의)?|지난번|저번|그때).{0,35}(?:말한|말씀|내용|문장|풀이|설명|주의점|조심하라|답변|두\s*번째|첫\s*번째)/.test(raw)
    || /(?:^|\s)(?:위|위의|앞의|직전)\s*(?:문장|풀이|답변|주의점|말|내용|설명)/.test(raw)
    || /(?:구판|작년|옛날).{0,25}(?:리포트|풀이|답변|설명|말씀|말한|주의점)/.test(raw)
    || /(?:그|이)\s*(?:말씀|말|내용|문장|풀이|설명|주의점|답변|조언|경고)(?:은|는|이|가|을|를|의|도|에|부터|[ ?？]|$)/.test(raw)
    || /(?:그건|그게|그거|그것|이건|이게|이것)(?:은|는|이|가|을|를|[ ?？]|$)/.test(raw)
    || /(?:두|세|첫)\s*번째\s*(?:말|내용|주의점|조심할\s*점|는|가)/.test(raw)
    || /^(?:왜요|왜 그런가요|(?:좀 더 |더 |자세히 |쉽게 )?(?:설명해 ?주세요|풀어 ?주세요))[?.!？]*$/.test(raw.trim());
}

export const REFERENCE_CLARIFICATION = "어느 문장이나 항목을 말씀하시는지 알려주시겠어요? ‘그 주의점’만으로는 앞서 보신 내용을 정확히 확인하기 어렵습니다. 보고 계신 항목 이름과 궁금한 점을 구체적으로 적어 주세요.";

export function resolveCautionReference(raw: string, reference: ReadingReference | null | undefined, previousDomain?: RealityAnswerDomain | null) {
  // A deliberately narrow grammar names the single section and asks only for
  // its meaning. Old editions, monthly cautions and mixed questions must clarify.
  const normalized = raw.replace(/["'“”‘’「」『』]/g, "").replace(/\s+/g, " ").trim();
  if (!/^(?:(?:방금|앞서) (?:본 |읽은 |나온 |말한 )?)?(?:여기서는 이것만 조심해서 보세요|전체 풀이의 주의점)(?: 항목| 문장)?(?:은|는|이|가|을|를)? (?:무슨 뜻(?:인가요|이에요)?|어떤 의미(?:인가요|예요)?|왜 (?:그런가요|그렇죠)|(?:다시 |쉽게 )?(?:설명해 ?주세요|풀어 ?주세요))[?.!？]*$/.test(normalized)) return null;
  if (!reference || reference.edition !== CAUTION_EDITION || reference.area !== CAUTION_AREA
    || reference.evidence !== CAUTION_EVIDENCE || reference.domain !== previousDomain
    || !Object.hasOwn(CAUTIONS, reference.domain)) return null;
  return { question: raw, quote: deterministicCaution(reference.domain), explanation: CAUTIONS[reference.domain].explanation };
}

export type CautionExplanation = NonNullable<ReturnType<typeof resolveCautionReference>>;
