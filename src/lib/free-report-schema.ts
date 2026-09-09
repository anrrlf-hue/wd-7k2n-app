// 무료 사주 V2의 12섹션 구조. 기존 Interpretation(유료 업셀용, timing/action
// 등 "정밀 시기" 지향)과는 목적이 달라 별도 스키마로 둔다 — 이쪽은 "이번
// 생애 전반의 성향/패턴"을 완결된 형태로 설명하는 데 집중한다.
// 모든 문단은 "결론(생활언어) -> 구체적 행동/패턴 -> 자기확인 질문성 문장
// -> 마지막에만 전문용어 근거" 순서를 따라야 한다(mock/LLM 공통 규칙).

import { z } from "zod";

const evidenceItem = z.object({
  title: z.string().min(2),
  detail: z.string().min(10),
  evidence: z.string().min(2),
});

export const FreeSajuReportSchema = z.object({
  snapshot: z.string().min(10),
  temperament: z.string().min(10),
  earningStyle: z.string().min(10),
  keepingStyle: z.string().min(10),
  leakPattern: z.string().min(10),
  workStyle: z.string().min(10),
  peopleAndMoney: z.string().min(10),
  decisionStyle: z.string().min(10),
  strengths: z.array(evidenceItem).length(3),
  cautions: z.array(evidenceItem).length(3),
  selfCheckQuestions: z.array(z.string().min(5)).min(2).max(4),
  evidenceExplainer: z.string().min(10),
});

export type FreeSajuReport = z.infer<typeof FreeSajuReportSchema>;

const BANNED_PATTERNS: RegExp[] = [
  /반드시\s*(성공|부자|대박)/,
  /100\s*%/,
  /무조건\s*(성공|보장)/,
  /확실히\s*(부자|성공)/,
  /(수익|돈)\s*(을|를)?\s*보장/,
  /틀림없이/,
  /운명(적으)?으로\s*정해져/,
  /['"](strong|weak|neutral)['"]/i,
  /강약\s*[:：]\s*(strong|weak|neutral)/i,
];

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

export function validateFreeSajuReport(raw: unknown): ValidationResult & { data?: FreeSajuReport } {
  const parsed = FreeSajuReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, violations: parsed.error.issues.map((i) => `schema: ${i.path.join(".")} ${i.message}`) };
  }

  const fullText = [
    parsed.data.snapshot,
    parsed.data.temperament,
    parsed.data.earningStyle,
    parsed.data.keepingStyle,
    parsed.data.leakPattern,
    parsed.data.workStyle,
    parsed.data.peopleAndMoney,
    parsed.data.decisionStyle,
    ...parsed.data.strengths.map((s) => s.detail),
    ...parsed.data.cautions.map((c) => c.detail),
    parsed.data.evidenceExplainer,
  ].join("\n");

  const violations = BANNED_PATTERNS.filter((re) => re.test(fullText)).map((re) => `banned phrase: ${re.source}`);
  return { ok: violations.length === 0, violations, data: parsed.data };
}
