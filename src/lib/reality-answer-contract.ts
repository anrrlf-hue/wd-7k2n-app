/**
 * 사용자가 묻는 사주 질문의 출력 계약.
 * 답변의 중심은 행동계획이 아니라 "직접 답 + 눈여겨볼 시기 + 풀이"다.
 */

export const REALITY_ANSWER_DOMAINS = [
  "love",
  "career",
  "work_business",
  "money",
  "relationship",
  "wellbeing",
  "overall",
] as const;

export type RealityAnswerDomain = (typeof REALITY_ANSWER_DOMAINS)[number];

export const REALITY_ANSWER_DOMAIN_LABELS: Record<RealityAnswerDomain, string> = {
  love: "연애·결혼",
  career: "취업·이직",
  work_business: "직장·사업",
  money: "돈·재물",
  relationship: "인간관계",
  wellbeing: "생활·건강",
  overall: "전체 흐름",
};

export const REALITY_ANSWER_INTENTS = [
  "decide",
  "timing",
  "why",
  "how",
  "prepare",
  "continue_or_stop",
  "open_question",
] as const;

export type RealityAnswerIntent = (typeof REALITY_ANSWER_INTENTS)[number];

export interface RealityQuestion {
  raw: string;
  domain: RealityAnswerDomain;
  intent: RealityAnswerIntent;
  decisionPoint: string;
}

export type RealityEvidenceSource =
  | "saju"
  | "daeun"
  | "palm"
  | "self_report"
  | "user_context";

export interface RealityEvidence {
  source: RealityEvidenceSource;
  label: string;
  detail: string;
}

/** 과거 브라우저 저장기록을 읽기 위한 호환 타입. 새 답변에서는 생성하지 않는다. */
export interface RealityAction {
  title: string;
  detail: string;
  doneWhen: string;
}

export interface RealityTimingWindow {
  label: string;
  /** 짧은 시기 요약. 과거 저장기록 호환용으로 유지한다. */
  reason: string;
  /** 이 시기에 질문과 관련해 어떤 변화가 들어올 수 있는지. */
  meaning?: string;
  /** 흐름이 자연스럽게 풀릴 때 기대해볼 수 있는 모습. */
  positive?: string;
  /** 같은 시기에 과하게 해석하거나 서두르지 않기 위해 볼 점. */
  caution?: string;
}

export interface RealityTiming {
  now: string;
  nextCheckpoint: string;
  precision: "daeun_only" | "yearly" | "seun" | "monthly";
  windows?: RealityTimingWindow[];
  basis?: string;
}

export interface RealityNarrativeReport {
  questionReading: string;
  currentFlow: string;
  solutionReading: string;
  timingReading?: string;
}

export interface RealityAnswer {
  question: RealityQuestion;
  /** 사용자가 물어본 내용에 바로 답하는 한 문장. */
  headline: string;
  report?: RealityNarrativeReport;
  /** 현재 흐름의 짧은 요약. */
  whyNow: string;
  /** 질문에서 반복해서 드러나는 흐름이나 성향. */
  repeatingPattern: string;
  /** 답을 과하게 단정하지 않기 위해 함께 봐야 할 주의점. */
  avoid: string;
  /** 이 질문에서 가장 중요하게 볼 핵심. */
  choose: string;
  timing: RealityTiming;
  /** 실제 결과를 바꿀 수 있는 사주 밖의 변수. */
  realityChecks: string[];
  /** 내부 검증용 근거. 고객 화면에는 노출하지 않는다. */
  evidence: RealityEvidence[];
  uncertainty: string[];
  safetyNote?: string;
  /** V1 저장기록 하위호환 전용. 새 엔진은 생성하지 않는다. */
  actions?: RealityAction[];
}

export interface RealityAnswerValidation {
  ok: boolean;
  errors: string[];
}

export function validateRealityAnswer(answer: RealityAnswer): RealityAnswerValidation {
  const errors: string[] = [];

  if (!answer.question.raw.trim()) errors.push("질문 원문이 비어 있습니다.");
  if (!answer.question.decisionPoint.trim()) errors.push("질문의 핵심이 비어 있습니다.");
  if (!answer.headline.trim()) errors.push("핵심 답변이 비어 있습니다.");

  if (!answer.report) {
    errors.push("실제 사주 리포트 본문이 비어 있습니다.");
  } else {
    if (answer.report.questionReading.trim().length < 80) errors.push("질문 풀이 본문이 너무 짧습니다.");
    if (answer.report.currentFlow.trim().length < 80) errors.push("현재 흐름 본문이 너무 짧습니다.");
    if (answer.report.solutionReading.trim().length < 80) errors.push("답변 해석 본문이 너무 짧습니다.");
    const reportText = [
      answer.report.questionReading,
      answer.report.currentFlow,
      answer.report.solutionReading,
      answer.report.timingReading ?? "",
    ].join("\n");
    if (/(근거를 골라|원국.?대운.?자가응답|판단에 연결했|분석 방법|해석 방법)/.test(reportText)) {
      errors.push("리포트 본문에 분석 방법 설명이 노출됐습니다.");
    }
  }

  if (answer.evidence.length === 0) errors.push("내부 사주 근거가 최소 1개 필요합니다.");
  if (answer.realityChecks.length === 0) errors.push("현실에서 달라질 수 있는 변수가 최소 1개 필요합니다.");

  const generatedText = [
    answer.headline,
    answer.report?.questionReading ?? "",
    answer.report?.currentFlow ?? "",
    answer.report?.solutionReading ?? "",
    answer.report?.timingReading ?? "",
    answer.whyNow,
    answer.repeatingPattern,
    answer.avoid,
    answer.choose,
    answer.timing.now,
    answer.timing.nextCheckpoint,
    ...(answer.timing.windows ?? []).flatMap((window) => [
      window.label,
      window.reason,
      window.meaning ?? "",
      window.positive ?? "",
      window.caution ?? "",
    ]),
  ].join("\n");

  if (
    answer.timing.precision === "daeun_only" &&
    /(?:20\d{2}년\s*)?\d{1,2}월(?:\s*\d{1,2}일)?|(?:이번|다음)\s*\d{1,2}월/.test(generatedText)
  ) {
    errors.push("대운 수준 답변에서 특정 월·날짜를 생성했습니다.");
  }

  if (/(반드시|무조건|틀림없이|100\s*%)/.test(generatedText)) {
    errors.push("확정적 예측 표현이 포함되어 있습니다.");
  }

  if (answer.question.domain === "wellbeing" && !answer.safetyNote) {
    errors.push("생활·건강 답변에는 safetyNote가 필요합니다.");
  }

  return { ok: errors.length === 0, errors };
}
