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

export interface RealityTiming {
  now: string;
  nextCheckpoint: string;
  /**
   * 현재 구현은 대운 수준의 근거만 확실히 보유한다.
   * 세운/월운이 구현되기 전에는 특정 월·날짜를 사주 근거로 생성하지 않는다.
   */
  precision: "daeun_only" | "seun" | "monthly";
}

export interface RealityAnswer {
  question: RealityQuestion;

  /** 광고 카피가 아니라 사용자의 질문에 대한 짧은 방향 제시. */
  headline: string;

  /** 사주/대운/손금/자가응답 중 실제로 존재하는 근거만 사용. */
  whyNow: string;

  /** 이 사람에게 반복되기 쉬운 선택 패턴. 근거가 없으면 단정하지 않는다. */
  repeatingPattern: string;

  /** 현재 상황에서 피해야 할 행동 하나. */
  avoid: string;

  /** 현재 상황에서 우선할 선택 하나. */
  choose: string;

  /** 반드시 3개. 추상 조언이 아니라 현실 행동. */
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
    answer.whyNow,
    answer.repeatingPattern,
    answer.avoid,
    answer.choose,
    answer.timing.now,
    answer.timing.nextCheckpoint,
    ...answer.actions.flatMap((action) => [action.title, action.detail, action.doneWhen]),
  ].join("\n");

  if (answer.timing.precision === "daeun_only" && /(?:20\d{2}년\s*)?\d{1,2}월|\d{1,2}일/.test(generatedText)) {
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
