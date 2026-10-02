import type {
  RealityAnswerDomain,
  RealityAnswerIntent,
  RealityTimeScope,
} from "@/lib/reality-answer-contract";
import { parseRealityQuestion } from "@/lib/reality-question";
import {
  realityDomainForSajuFocus,
  type SajuFocus,
} from "@/lib/saju-focus";

export type QuestionTopic =
  | "business_start"
  | "partnership"
  | "career_move"
  | "career_growth"
  | "money_flow"
  | "investment"
  | "saving"
  | "love_timing"
  | "marriage"
  | "reunion"
  | "relationship_conflict"
  | "wellbeing_rhythm"
  | "overall_change"
  | "general";

export type QuestionTimingStrategy =
  | "explicit_scope"
  | "near_term"
  | "current_and_next"
  | "long_term";

export type QuestionSignalKey =
  | "saju.current_daeun"
  | "saju.next_daeun"
  | "saju.year_month_timing"
  | "saju.wealth_stars"
  | "saju.output_stars"
  | "saju.officer_stars"
  | "saju.peer_stars"
  | "saju.resource_stars"
  | "saju.relationships"
  | "saju.five_elements"
  | "palm.head"
  | "palm.heart"
  | "palm.life"
  | "palm.fate"
  | "palm.sun"
  | "palm.wealth"
  | "palm.bilateral";

export interface QuestionFollowUp {
  label: string;
  question: string;
  focus: SajuFocus;
}

export interface QuestionEnginePlan {
  version: "v0";
  raw: string;
  resolvedQuestion: string;
  domain: RealityAnswerDomain;
  focus: SajuFocus;
  intent: RealityAnswerIntent;
  topic: QuestionTopic;
  confidence: "high" | "medium" | "low";
  inheritedContext: boolean;
  previousQuestion: string | null;
  timeScope: RealityTimeScope | null;
  timingStrategy: QuestionTimingStrategy;
  selectedSignals: QuestionSignalKey[];
  answerFrame: string[];
  nextQuestions: QuestionFollowUp[];
}

export interface QuestionEngineContext {
  focusHint?: SajuFocus | null;
  previousQuestion?: string | null;
  previousDomain?: RealityAnswerDomain | null;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function focusForDomain(domain: RealityAnswerDomain): SajuFocus {
  if (domain === "love" || domain === "relationship") return "love_relationship";
  if (domain === "career" || domain === "work_business") return "work";
  if (domain === "money") return "money";
  if (domain === "wellbeing") return "wellbeing";
  return "overall";
}

function topicFor(raw: string, domain: RealityAnswerDomain): QuestionTopic {
  const text = normalize(raw);

  if (domain === "work_business") {
    if (/(동업|파트너|공동사업|같이\s*사업|함께\s*사업)/.test(text)) return "partnership";
    if (/(사업|창업|독립|장사|새\s*일)/.test(text)) return "business_start";
    return "career_growth";
  }
  if (domain === "career") {
    if (/(이직|퇴사|취업|면접|직장\s*옮|직업\s*바꾸)/.test(text)) return "career_move";
    return "career_growth";
  }
  if (domain === "money") {
    if (/(투자|주식|코인|부동산|매수|매도)/.test(text)) return "investment";
    if (/(저축|모이|지출|아끼|남기)/.test(text)) return "saving";
    return "money_flow";
  }
  if (domain === "love") {
    if (/(결혼|혼인|배우자)/.test(text)) return "marriage";
    if (/(재회|헤어진|다시\s*만나)/.test(text)) return "reunion";
    return "love_timing";
  }
  if (domain === "relationship") return "relationship_conflict";
  if (domain === "wellbeing") return "wellbeing_rhythm";
  if (domain === "overall") return "overall_change";
  return "general";
}

function timingStrategyFor(
  raw: string,
  intent: RealityAnswerIntent,
  timeScope: RealityTimeScope | null,
): QuestionTimingStrategy {
  if (timeScope) return "explicit_scope";
  const text = normalize(raw);
  if (intent === "timing" || /(언제|시기|몇\s*년|몇\s*월)/.test(text)) return "near_term";
  if (/(앞으로|미래|향후|장기|인생|몇년간)/.test(text)) return "long_term";
  return "current_and_next";
}

const SIGNALS_BY_DOMAIN: Record<RealityAnswerDomain, QuestionSignalKey[]> = {
  love: [
    "saju.current_daeun",
    "saju.next_daeun",
    "saju.year_month_timing",
    "saju.relationships",
    "saju.peer_stars",
    "saju.officer_stars",
    "saju.resource_stars",
    "palm.heart",
    "palm.bilateral",
  ],
  career: [
    "saju.current_daeun",
    "saju.next_daeun",
    "saju.year_month_timing",
    "saju.officer_stars",
    "saju.output_stars",
    "saju.peer_stars",
    "saju.resource_stars",
    "palm.head",
    "palm.fate",
    "palm.sun",
    "palm.bilateral",
  ],
  work_business: [
    "saju.current_daeun",
    "saju.next_daeun",
    "saju.year_month_timing",
    "saju.officer_stars",
    "saju.output_stars",
    "saju.peer_stars",
    "saju.wealth_stars",
    "palm.head",
    "palm.fate",
    "palm.sun",
    "palm.wealth",
    "palm.bilateral",
  ],
  money: [
    "saju.current_daeun",
    "saju.next_daeun",
    "saju.year_month_timing",
    "saju.wealth_stars",
    "saju.output_stars",
    "saju.peer_stars",
    "palm.head",
    "palm.life",
    "palm.fate",
    "palm.wealth",
    "palm.bilateral",
  ],
  relationship: [
    "saju.current_daeun",
    "saju.next_daeun",
    "saju.relationships",
    "saju.peer_stars",
    "saju.resource_stars",
    "palm.heart",
    "palm.head",
    "palm.bilateral",
  ],
  wellbeing: [
    "saju.current_daeun",
    "saju.next_daeun",
    "saju.five_elements",
    "palm.life",
    "palm.head",
    "palm.bilateral",
  ],
  overall: [
    "saju.current_daeun",
    "saju.next_daeun",
    "saju.year_month_timing",
    "saju.wealth_stars",
    "saju.output_stars",
    "saju.officer_stars",
    "saju.peer_stars",
    "saju.resource_stars",
    "saju.relationships",
    "palm.head",
    "palm.heart",
    "palm.life",
    "palm.fate",
    "palm.sun",
    "palm.wealth",
    "palm.bilateral",
  ],
};

function resolvedQuestionFor(
  domain: RealityAnswerDomain,
  topic: QuestionTopic,
  intent: RealityAnswerIntent,
): string {
  if (topic === "partnership") return "동업이 맞는지, 역할을 어떻게 나누는 게 좋은지, 시작 시기를 함께 본다.";
  if (topic === "business_start") return "사업을 시작하거나 키우는 흐름과 돈이 붙는 시기, 혼자 할지 함께 할지를 본다.";
  if (topic === "career_move") return "현재 직장을 유지할지 이직할지와 변화가 들어오는 시기를 본다.";
  if (topic === "career_growth") return "일에서 역할·성과·방향이 어떻게 바뀌는지와 시기를 본다.";
  if (topic === "investment") return "투자 결과를 단정하지 않고 돈의 흐름과 판단 성향, 조심할 시기를 본다.";
  if (topic === "saving") return "돈이 들어오고 남는 구조와 지출·저축 패턴, 변화 시기를 본다.";
  if (topic === "money_flow") return "앞으로 돈·재물 흐름이 언제 어떻게 달라지는지와 돈을 만드는 방식을 본다.";
  if (topic === "marriage") return "관계가 결혼 단계로 이어질 가능성과 현실 조건, 시기 흐름을 본다.";
  if (topic === "reunion") return "재회 흐름과 관계가 다시 이어질 때 반복될 문제, 시기를 본다.";
  if (topic === "love_timing") return "연애·인연이 들어오는 흐름과 관계가 움직이는 시기를 본다.";
  if (topic === "relationship_conflict") return "사람관계에서 반복되는 갈등 패턴과 관계 변화 시기를 본다.";
  if (topic === "wellbeing_rhythm") return "생활 리듬과 에너지 변화가 언제 두드러지는지 본다.";
  if (topic === "overall_change") return "현재 이후 가장 크게 바뀌는 흐름과 그 시기를 넓게 본다.";

  const intentText: Record<RealityAnswerIntent, string> = {
    decide: "결정할 때 무엇을 우선해서 봐야 하는지",
    timing: "언제가 상대적으로 중요한지",
    why: "왜 이런 흐름이 반복되는지",
    how: "어떤 방식으로 나타나는지",
    prepare: "무엇을 먼저 준비해서 볼지",
    continue_or_stop: "이어갈지 바꿀지",
    open_question: "앞으로 어떤 흐름이 두드러지는지",
  };
  return `${domain} 영역에서 ${intentText[intent]} 본다.`;
}

const ANSWER_FRAME_BY_INTENT: Record<RealityAnswerIntent, string[]> = {
  decide: ["직접 답", "결정의 핵심 기준", "시기", "반대 선택을 볼 때의 주의점"],
  timing: ["가장 먼저 볼 시기", "그때 나타날 수 있는 변화", "두 번째 시기", "주의점"],
  why: ["반복되는 패턴", "현재 흐름과 연결", "바뀌는 시기", "현실에서 달라질 변수"],
  how: ["어떤 방식으로 나타나는지", "현재 흐름", "시기", "주의점"],
  prepare: ["지금 무엇을 봐야 하는지", "준비 흐름", "시기", "현실 변수"],
  continue_or_stop: ["이어갈 때", "바꿀 때", "시기", "판단 기준"],
  open_question: ["직접 답", "현재 흐름", "앞으로 시기", "다음에 더 볼 질문"],
};

function followUpsFor(topic: QuestionTopic, domain: RealityAnswerDomain): QuestionFollowUp[] {
  if (topic === "partnership") {
    return [
      { label: "동업 역할", question: "동업한다면 역할은 어떻게 나누는 게 좋을까요?", focus: "work" },
      { label: "동업 시기", question: "동업을 시작하기 좋은 시기는 언제인가요?", focus: "work" },
      { label: "혼자 vs 동업", question: "혼자 하는 것과 동업 중 어느 흐름을 더 봐야 하나요?", focus: "work" },
    ];
  }
  if (topic === "business_start" || domain === "work_business") {
    return [
      { label: "사업 시작 시기", question: "사업을 시작하거나 키우기 좋은 시기는 언제인가요?", focus: "work" },
      { label: "혼자 vs 동업", question: "사업은 혼자 하는 것과 동업 중 어느 쪽을 더 봐야 하나요?", focus: "work" },
      { label: "돈이 붙는 시기", question: "사업에서 돈 흐름이 좋아지는 시기는 언제인가요?", focus: "money" },
    ];
  }
  if (topic === "career_move" || domain === "career") {
    return [
      { label: "이직 시기", question: "이직이나 직업 변화는 언제가 가장 눈에 띄나요?", focus: "work" },
      { label: "유지 vs 이동", question: "지금 직장을 유지하는 것과 옮기는 것 중 무엇을 더 봐야 하나요?", focus: "work" },
      { label: "직업과 돈", question: "직업 변화가 돈 흐름과 연결되는 시기는 언제인가요?", focus: "money" },
    ];
  }
  if (domain === "money") {
    return [
      { label: "돈이 좋아지는 시기", question: "앞으로 돈 흐름이 좋아지는 시기는 언제인가요?", focus: "money" },
      { label: "돈 버는 방식", question: "저는 어떤 방식으로 돈을 만드는 흐름이 강한가요?", focus: "money" },
      { label: "조심할 시기", question: "돈 문제에서 특히 조심해서 볼 시기는 언제인가요?", focus: "money" },
    ];
  }
  if (topic === "marriage") {
    return [
      { label: "결혼 시기", question: "결혼 흐름이 가장 강해지는 시기는 언제인가요?", focus: "love_relationship" },
      { label: "관계 현실성", question: "결혼으로 이어질 때 가장 중요하게 볼 현실 조건은 무엇인가요?", focus: "love_relationship" },
      { label: "돈과 결혼", question: "결혼 시기와 돈 흐름은 어떻게 같이 봐야 하나요?", focus: "money" },
    ];
  }
  if (domain === "love" || domain === "relationship") {
    return [
      { label: "인연 시기", question: "관계나 인연이 크게 움직이는 시기는 언제인가요?", focus: "love_relationship" },
      { label: "반복되는 관계", question: "관계에서 제가 반복하기 쉬운 패턴은 무엇인가요?", focus: "love_relationship" },
      { label: "이어갈지 보기", question: "지금 관계를 이어갈 때 가장 중요하게 볼 점은 무엇인가요?", focus: "love_relationship" },
    ];
  }
  if (domain === "wellbeing") {
    return [
      { label: "리듬 변화 시기", question: "생활 리듬이 크게 바뀌는 시기는 언제인가요?", focus: "wellbeing" },
      { label: "스트레스 패턴", question: "제가 스트레스를 받을 때 반복되는 생활 패턴은 무엇인가요?", focus: "wellbeing" },
      { label: "회복 흐름", question: "생활이 다시 안정되는 흐름은 언제 눈에 띄나요?", focus: "wellbeing" },
    ];
  }

  return [
    { label: "일 흐름", question: "앞으로 일과 사업 흐름은 어떻게 바뀌나요?", focus: "work" },
    { label: "돈 흐름", question: "앞으로 돈 흐름은 언제 좋아지나요?", focus: "money" },
    { label: "관계 흐름", question: "앞으로 관계와 인연 흐름은 언제 바뀌나요?", focus: "love_relationship" },
  ];
}

export function buildQuestionEnginePlan(
  raw: string,
  context: QuestionEngineContext = {},
): QuestionEnginePlan {
  const parse = parseRealityQuestion(raw);
  const inheritedContext = !parse.domain && Boolean(context.previousDomain);

  let domain: RealityAnswerDomain;
  if (parse.domain) {
    domain = context.focusHint
      ? realityDomainForSajuFocus(context.focusHint, parse.domain)
      : parse.domain;
  } else if (context.previousDomain) {
    domain = context.previousDomain;
  } else if (context.focusHint) {
    domain = realityDomainForSajuFocus(context.focusHint, null);
  } else {
    domain = "overall";
  }

  const focus = focusForDomain(domain);
  const topic = topicFor(raw, domain);
  const timingStrategy = timingStrategyFor(raw, parse.intent, parse.timeScope);

  return {
    version: "v0",
    raw: raw.trim(),
    resolvedQuestion: resolvedQuestionFor(domain, topic, parse.intent),
    domain,
    focus,
    intent: parse.intent,
    topic,
    confidence: inheritedContext ? "medium" : parse.confidence,
    inheritedContext,
    previousQuestion: context.previousQuestion?.trim() || null,
    timeScope: parse.timeScope,
    timingStrategy,
    selectedSignals: SIGNALS_BY_DOMAIN[domain],
    answerFrame: ANSWER_FRAME_BY_INTENT[parse.intent],
    nextQuestions: followUpsFor(topic, domain),
  };
}
