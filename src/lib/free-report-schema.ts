// 무료 사주 V2의 17섹션 구조. 기존 Interpretation(유료 업셀용, timing/action
// 등 "정밀 시기" 지향)과는 목적이 달라 별도 스키마로 둔다 — 이쪽은 "이번
// 생애 전반의 성향/패턴"을 완결된 형태로 설명하는 데 집중한다.
// 모든 문단은 "결론(생활언어) -> 구체적 행동/패턴 -> 자기확인 질문성 문장"
// 순서를 따르되, 문단마다 도입/마무리 방식과 문장 리듬을 다르게 해서 같은
// 패턴이 반복되지 않아야 한다(mock/LLM 공통).
//
// text/evidence 분리: 이전에는 "재성 2개", "비겁+관성", "격국", "건록·제왕"
// 같은 전문 계산근거를 본문 문장 끝에 그대로 붙여서 보여줬다. 이번 라운드
// 요구사항은 "전문용어를 몰라도 이해 가능"해야 한다는 것이라, 모든 서술형
// 필드를 { text, evidence }로 나눈다 — text는 생활 언어로만 쓰고(전문
// 계산근거 없이도 이해 가능해야 함), evidence는 "왜 이렇게 봤나요?" 같은
// 보조 펼침영역에서만 보여준다(UI에서 기본 접힘).

import { z } from "zod";

const paragraph = z.object({
  /** 생활 언어로만 쓴 본문 — 재성/식상/관성/비겁/격국/용신/건록·제왕 같은
   * 전문 계산근거 용어를 직접 포함하지 않는다. */
  text: z.string().min(10),
  /** "왜 이렇게 봤나요?" 보조 펼침영역에만 노출하는 전문 계산근거. */
  evidence: z.string().min(2),
});
export type ReportParagraph = z.infer<typeof paragraph>;

const evidenceItem = z.object({
  title: z.string().min(2),
  /** 생활 언어 설명 — evidence 없이도 이해 가능해야 한다. */
  detail: z.string().min(10),
  evidence: z.string().min(2),
});

export const FreeSajuReportSchema = z.object({
  snapshot: paragraph, // ① 한눈에 보는 나
  temperament: paragraph, // ② 타고난 성향
  wealthStructure: paragraph, // ③ 재물운/돈복의 큰 구조
  earningStyle: paragraph, // ④ 돈을 버는 방식
  keepingStyle: paragraph, // ⑤ 돈을 지키는 방식
  leakPattern: paragraph, // ⑥ 돈을 놓치는 반복 패턴
  bigMoneyAffinity: paragraph, // ⑦ 큰돈/기회와 관계된 성향
  jobOrientation: paragraph, // ⑧ 직장형/사업형 성향
  teamStrength: paragraph, // ⑨ 조직에서 강한 부분
  soloStrength: paragraph, // ⑩ 독립적으로 움직일 때 강한 부분
  peopleAndMoney: paragraph, // ⑪ 사람과 돈
  decisionStyle: paragraph, // ⑫ 의사결정 스타일
  opportunityStyle: paragraph, // ⑬ 기회를 잡는 방식
  strengths: z.array(evidenceItem).min(3), // ⑭ 강점 3개 이상
  cautions: z.array(evidenceItem).min(3), // ⑮ 조심할 점 3개 이상
  selfCheckQuestions: z.array(z.string().min(5)).min(2).max(5), // ⑯ 실제 경험 비교 질문
  /** ⑰ 왜 이런 결과가 나왔는지 — 이 필드 자체가 이미 "펼쳐서 보는 근거"
   * 성격이라 전문용어를 포함해도 된다(방법론 요약이 목적). UI에서도 항상
   * 접힌 상태로 시작하는 전체 리포트용 보조 섹션으로 다룬다. */
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

/** text 필드에는 절대 들어가면 안 되는 전문 계산근거 용어. evidence
 * 필드에는 당연히 나와도 된다(거긴 원래 근거를 담는 자리) — 그래서 이
 * 검사는 text만 대상으로 한다. */
const JARGON_IN_TEXT_PATTERNS: RegExp[] = [
  /재성\s*\d/,
  /식상\s*\d/,
  /관성\s*\d/,
  /비겁\s*\d/,
  /인성\s*\d/,
  /비겁\+관성/,
  /재성\+식상/,
  /건록·제왕/,
  /격국/,
  /용신/,
  /ONNX/i,
  /MediaPipe/i,
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
  const paragraphTexts = [
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
  ].map((p) => p.text);

  const fullText = [...paragraphTexts, ...d.strengths.map((s) => s.detail), ...d.cautions.map((c) => c.detail)].join(
    "\n",
  );

  const bannedViolations = BANNED_PATTERNS.filter((re) => re.test(fullText)).map((re) => `banned phrase: ${re.source}`);
  const jargonViolations = JARGON_IN_TEXT_PATTERNS.filter((re) => re.test(fullText)).map(
    (re) => `jargon leaked into plain text: ${re.source}`,
  );
  const violations = [...bannedViolations, ...jargonViolations];
  return { ok: violations.length === 0, violations, data: parsed.data };
}
