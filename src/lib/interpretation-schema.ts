// LLM(또는 mock)이 반드시 이 스키마를 채워야 한다. 자유 문장 하나가 아니라
// 필드별로 구조화해, 사용 전 검증(banned-phrase, 필드 누락)을 걸 수 있게 한다.

import { z } from "zod";

export const InterpretationSchema = z.object({
  summary: z.string().min(10),
  money_style: z.string().min(10),
  earning_style: z.string().min(10),
  keeping_style: z.string().min(10),
  risk_pattern: z.string().min(10),
  career_business: z.string().min(10),
  timing: z.string().min(10),
  action: z.string().min(10),
  /** 각 해석 문장이 참조한 계산 필드(근거). 최소 3개 이상 요구해 "뻔한 말"을 방지한다. */
  evidence: z.array(z.string()).min(3),
});

export type Interpretation = z.infer<typeof InterpretationSchema>;

// 확정적 미래예측/보장 표현 금지 목록. 하나라도 걸리면 해석을 반려한다.
const BANNED_PATTERNS: RegExp[] = [
  /반드시\s*(성공|부자|대박)/,
  /100\s*%/,
  /무조건\s*(성공|보장)/,
  /확실히\s*(부자|성공)/,
  /(수익|돈)\s*(을|를)?\s*보장/,
  /틀림없이/,
  /운명(적으)?으로\s*정해져/,
];

export interface ValidationResult {
  ok: boolean;
  violations: string[];
}

/** 스키마 통과 + 금지 표현 검사를 함께 수행한다. */
export function validateInterpretation(raw: unknown): ValidationResult & { data?: Interpretation } {
  const parsed = InterpretationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, violations: parsed.error.issues.map((i) => `schema: ${i.path.join(".")} ${i.message}`) };
  }

  const fullText = Object.entries(parsed.data)
    .filter(([key]) => key !== "evidence")
    .map(([, v]) => v)
    .join("\n");

  const violations = BANNED_PATTERNS.filter((re) => re.test(fullText)).map((re) => `banned phrase: ${re.source}`);

  return { ok: violations.length === 0, violations, data: parsed.data };
}
