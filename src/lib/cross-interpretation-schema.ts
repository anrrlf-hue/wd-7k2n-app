import { z } from "zod";

export const CrossInterpretationSchema = z.object({
  /** 사주와 손금에서 공통으로 보이는 성향 */
  common: z.string().min(10),
  /** 사주와 손금에서 서로 다르게 나타나는 부분 */
  differences: z.string().min(10),
  /** 돈/일/결정 스타일과 연결한 해석 */
  moneyConnection: z.string().min(10),
  /** 자기 경험과 비교하게 만드는 질문 */
  selfComparisonQuestion: z.string().min(5),
  /** 손금 분석의 한계/불확실성을 명시하는 문장 */
  uncertaintyNote: z.string().min(10),
});

export type CrossInterpretation = z.infer<typeof CrossInterpretationSchema>;

const BANNED_PATTERNS: RegExp[] = [
  /반드시\s*(성공|부자|대박)/,
  /100\s*%/,
  /무조건\s*(성공|보장)/,
  /확실히\s*(부자|성공)/,
  /(수익|돈)\s*(을|를)?\s*보장/,
  /틀림없이/,
  /운명(적으)?으로\s*정해져/,
  /['"](strong|weak|neutral|left|right)['"]/i,
];

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

export function validateCrossInterpretation(raw: unknown): ValidationResult & { data?: CrossInterpretation } {
  const parsed = CrossInterpretationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, violations: parsed.error.issues.map((i) => `schema: ${i.path.join(".")} ${i.message}`) };
  }
  const fullText = Object.values(parsed.data).join("\n");
  const violations = BANNED_PATTERNS.filter((re) => re.test(fullText)).map((re) => `banned phrase: ${re.source}`);
  return { ok: violations.length === 0, violations, data: parsed.data };
}
