// 무료 사주 V2의 17섹션 구조. 기존 Interpretation(유료 업셀용, timing/action
// 등 "정밀 시기" 지향)과는 목적이 달라 별도 스키마로 둔다 — 이쪽은 "이번
// 생애 전반의 성향/패턴"을 완결된 형태로 설명하는 데 집중한다.
// 모든 문단은 "결론(생활언어) -> 구체적 행동/패턴 -> 자기확인 질문성 문장
// -> 마지막에만 전문용어 근거" 순서를 따르되, 문단마다 도입/마무리 방식과
// 문장 리듬을 다르게 해서 같은 패턴이 반복되지 않아야 한다(mock/LLM 공통).

import { z } from "zod";

const evidenceItem = z.object({
  title: z.string().min(2),
  detail: z.string().min(10),
  evidence: z.string().min(2),
});

export const FreeSajuReportSchema = z.object({
  snapshot: z.string().min(10), // ① 한눈에 보는 나
  temperament: z.string().min(10), // ② 타고난 성향
  wealthStructure: z.string().min(10), // ③ 재물운/돈복의 큰 구조
  earningStyle: z.string().min(10), // ④ 돈을 버는 방식
  keepingStyle: z.string().min(10), // ⑤ 돈을 지키는 방식
  leakPattern: z.string().min(10), // ⑥ 돈을 놓치는 반복 패턴
  bigMoneyAffinity: z.string().min(10), // ⑦ 큰돈/기회와 관계된 성향
  jobOrientation: z.string().min(10), // ⑧ 직장형/사업형 성향
  teamStrength: z.string().min(10), // ⑨ 조직에서 강한 부분
  soloStrength: z.string().min(10), // ⑩ 독립적으로 움직일 때 강한 부분
  peopleAndMoney: z.string().min(10), // ⑪ 사람과 돈
  decisionStyle: z.string().min(10), // ⑫ 의사결정 스타일
  opportunityStyle: z.string().min(10), // ⑬ 기회를 잡는 방식
  strengths: z.array(evidenceItem).min(3), // ⑭ 강점 3개 이상
  cautions: z.array(evidenceItem).min(3), // ⑮ 조심할 점 3개 이상
  selfCheckQuestions: z.array(z.string().min(5)).min(2).max(5), // ⑯ 실제 경험 비교 질문
  evidenceExplainer: z.string().min(10), // ⑰ 왜 이런 결과가 나왔는지
  /** 결제 직전 Bridge 화면의 문구를 개인화하는 데만 쓰는 3단 분류 — 이미
   * 계산된 실제 신호(재성+식상 vs 비겁+관성 우세, 흉신 존재)를 재사용할
   * 뿐 새로 지어내는 값이 아니다. */
  bridgeProfile: z.enum(["business", "stable", "leak"]),
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

  const d = parsed.data;
  const fullText = [
    d.snapshot,
    d.temperament,
    d.wealthStructure,
    d.earningStyle,
    d.keepingStyle,
    d.leakPattern,
    d.bigMoneyAffinity,
    d.jobOrientation,
    d.teamStrength,
    d.soloStrength,
    d.peopleAndMoney,
    d.decisionStyle,
    d.opportunityStyle,
    ...d.strengths.map((s) => s.detail),
    ...d.cautions.map((c) => c.detail),
    d.evidenceExplainer,
  ].join("\n");

  const violations = BANNED_PATTERNS.filter((re) => re.test(fullText)).map((re) => `banned phrase: ${re.source}`);
  return { ok: violations.length === 0, violations, data: parsed.data };
}
