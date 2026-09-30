/**
 * 사주 현실답변 V1 — 유료 답변 엔진의 출력 계약.
 *
 * 이 파일은 아직 화면/결제에 연결하지 않는다.
 * 기존 사주 계산을 바꾸지 않고, 다음 구현이 따라야 할 공통 타입과 검수 규칙만 고정한다.
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
  overall: "전체 흐름·변화",
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
  /** 사용자가 실제로 결정해야 할 한 문장. 예: "퇴사부터 할지, 재직 중 이직 준비를 할지" */
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

export interface RealityAction {
  /** 실제로 할 수 있는 동사로 시작. */
  title: string;
  /** 언제/어디서/무엇을 확인할지 구체화. */
  detail: string;
  /** 실행 완료를 사용자가 스스로 확인할 수 있는 기준. */
  doneWhen: string;
}

export interface RealityTimingWindow {
  label: string;
  reason: string;
}

export interface RealityTiming {
  now: string;
  nextCheckpoint: string;
  precision: "daeun_only" | "yearly" | "seun" | "monthly";
  /** 세운·월운 계산이 있을 때 사용자가 실제로 궁금해하는 시기 구간. */
  windows?: RealityTimingWindow[];
  /** 시기 산정 방식과 한계를 짧게 설명. */
  basis?: string;
}

/**
 * 사용자가 실제로 읽는 유료 리포트 본문.
 * evidence/방법론 설명과 분리하고 생활 언어의 해석만 둔다.
 */
export interface RealityNarrativeReport {
  /** 이 질문과 연결된 타고난 성향·선택 방식. */
  questionReading: string;
  /** 현재 대운과 질문이 맞물려 현실에서 어떻게 느껴질 수 있는지. */
  currentFlow: string;
  /** 질문에 대한 답을 현실적으로 어떻게 이해할지. 행동지침이 중심이 아니다. */
  solutionReading: string;
  /** 시기 질문일 때 세운·월운 구간을 풀어 설명. */
  timingReading?: string;
}

export interface RealityAnswer {
  question: RealityQuestion;

  /** 사용자가 물어본 것에 먼저 답하는 한 문장. 행동 제안보다 답 자체가 우선이다. */
  headline: string;

  /**
   * 실제 리포트 본문. optional은 기존 브라우저에 저장된 V1 기록을
   * 깨뜨리지 않기 위한 하위호환용이며, 새 엔진 출력은 반드시 채운다.
   */
  report?: RealityNarrativeReport;

  /** 현재 흐름을 짧게 요약한 호환 필드. report.currentFlow과 같은 방향을 유지한다. */
  whyNow: string;

  /** 이 사람에게 반복되기 쉬운 선택 패턴. 근거가 없으면 단정하지 않는다. */
  repeatingPattern: string;

  /** 현재 상황에서 피해야 할 행동 하나. */
  avoid: string;

  /** 현재 상황에서 우선할 선택 하나. */
  choose: string;

  /**
   * 기존 내 관리와의 하위호환을 위해 3개를 유지한다.
   * 질문 답변의 중심이 아니라 맨 마지막에 두는 현실 참고사항이다.
   */
  actions: [RealityAction, RealityAction, RealityAction];

  timing: RealityTiming;

  /**
   * 사주로 알 수 없는 현실 변수.
   * 상대방 의사, 실제 채용 가능성, 계약조건, 의학적 상태 등은 여기에 분리한다.
   */
  realityChecks: string[];

  /** 답변에 실제로 사용한 근거. */
  evidence: RealityEvidence[];

  /** 근거가 부족한 부분을 솔직히 표시. */
  uncertainty: string[];

  /** 건강/의료 영역일 때 진단·치료 대체가 아님을 표시. */
  safetyNote?: string;
}

export interface RealityAnswerValidation {
  ok: boolean;
  errors: string[];
}

const VAGUE_ACTION = /^(잘|긍정적으로|신중하게|노력|마음을|기다려|운을|기회를)/;

export function validateRealityAnswer(answer: RealityAnswer): RealityAnswerValidation {
  const errors: string[] = [];

  if (!answer.question.raw.trim()) errors.push("질문 원문이 비어 있습니다.");
  if (!answer.question.decisionPoint.trim()) errors.push("현실 결정점이 비어 있습니다.");
  if (!answer.headline.trim()) errors.push("핵심 답변이 비어 있습니다.");
  if (!answer.report) {
    errors.push("실제 사주 리포트 본문이 비어 있습니다.");
  } else {
    if (answer.report.questionReading.trim().length < 80) errors.push("질문 풀이 본문이 너무 짧습니다.");
    if (answer.report.currentFlow.trim().length < 80) errors.push("현재 흐름 본문이 너무 짧습니다.");
    if (answer.report.solutionReading.trim().length < 80) errors.push("현실 해법 본문이 너무 짧습니다.");
    const reportText = [
      answer.report.questionReading,
      answer.report.currentFlow,
      answer.report.solutionReading,
    ].join("\n");
    if (/(질문과 직접 관련된|근거를 골라|원국.?대운.?자가응답|판단에 연결했|분석 방법|해석 방법)/.test(reportText)) {
      errors.push("리포트 본문에 분석 방법 설명이 노출됐습니다.");
    }
  }
  if (answer.actions.length !== 3) errors.push("행동은 정확히 3개여야 합니다.");
  if (answer.evidence.length === 0) errors.push("사주/대운/손금/자가응답 근거가 최소 1개 필요합니다.");
  if (answer.realityChecks.length === 0) errors.push("사주로 알 수 없는 현실 확인사항이 최소 1개 필요합니다.");

  answer.actions.forEach((action, index) => {
    if (!action.title.trim() || !action.detail.trim() || !action.doneWhen.trim()) {
      errors.push(`행동 ${index + 1}은 title/detail/doneWhen이 모두 필요합니다.`);
    }
    if (VAGUE_ACTION.test(action.title.trim())) {
      errors.push(`행동 ${index + 1}이 추상적입니다: "${action.title}"`);
    }
  });

  const generatedText = [
    answer.headline,
    answer.report?.questionReading ?? "",
    answer.report?.currentFlow ?? "",
    answer.report?.solutionReading ?? "",
    answer.whyNow,
    answer.repeatingPattern,
    answer.avoid,
    answer.choose,
    answer.timing.now,
    answer.timing.nextCheckpoint,
    ...(answer.timing.windows ?? []).flatMap((window) => [window.label, window.reason]),
    ...answer.actions.flatMap((action) => [action.title, action.detail, action.doneWhen]),
  ].join("\n");

  if (answer.timing.precision === "daeun_only" && /(?:20\d{2}년\s*)?\d{1,2}월(?:\s*\d{1,2}일)?|(?:이번|다음)\s*\d{1,2}월/.test(generatedText)) {
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
