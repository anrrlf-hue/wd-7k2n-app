import {
  REALITY_ANSWER_DOMAINS,
  type RealityAnswerDomain,
  type RealityAnswerIntent,
} from "@/lib/reality-answer-contract";

export interface RealityQuestionParseResult {
  raw: string;
  domain: RealityAnswerDomain | null;
  intent: RealityAnswerIntent;
  decisionPoint: string | null;
  confidence: "high" | "medium" | "low";
  matchedKeywords: string[];
}

const DOMAIN_KEYWORDS: Record<RealityAnswerDomain, string[]> = {
  love: [
    "연애", "결혼", "재회", "헤어", "이별", "남자친구", "여자친구", "남친", "여친",
    "소개팅", "썸", "배우자", "연인", "사랑", "만나는 사람", "교제",
  ],
  career: [
    "취업", "이직", "퇴사", "면접", "지원", "합격", "채용", "직무", "커리어", "연봉",
  ],
  work_business: [
    "사업", "창업", "독립", "직장", "회사", "승진", "상사", "팀장", "역할", "제안",
    "고객", "매출", "장사",
  ],
  money: [
    "돈", "재물", "저축", "지출", "투자", "대출", "부채", "소득", "수입", "재산",
    "월급", "현금",
  ],
  relationship: [
    "인간관계", "친구", "가족", "동료", "사람", "갈등", "싸움", "관계", "팀원",
  ],
  wellbeing: [
    "건강", "피곤", "피로", "수면", "잠", "스트레스", "지쳐", "아파", "병원", "생활",
    "휴식", "리듬",
  ],
  overall: [
    "앞으로", "전체 흐름", "변화", "바꿔야", "움직일 때", "움직여야", "전환", "운세",
    "올해 흐름", "내년 흐름",
  ],
};

const DOMAIN_PRIORITY: RealityAnswerDomain[] = [
  "love",
  "career",
  "work_business",
  "money",
  "relationship",
  "wellbeing",
  "overall",
];

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function classifyDomain(raw: string): {
  domain: RealityAnswerDomain | null;
  matchedKeywords: string[];
  score: number;
} {
  const text = normalize(raw);
  let best: RealityAnswerDomain | null = null;
  let bestScore = 0;
  let bestMatched: string[] = [];

  // "전체 흐름"은 구체 분야가 전혀 잡히지 않을 때만 사용한다.
  // 예: "취업이 안 되는데 뭘 바꿔야 할까요?"에서 "바꿔야" 때문에
  // overall이 career를 덮어쓰면 안 된다.
  for (const domain of DOMAIN_PRIORITY.filter((item) => item !== "overall")) {
    const matched = DOMAIN_KEYWORDS[domain].filter((keyword) => text.includes(keyword));
    const score = matched.reduce((sum, keyword) => sum + Math.max(1, Math.min(keyword.length, 4)), 0);
    if (score > bestScore) {
      best = domain;
      bestScore = score;
      bestMatched = matched;
    }
  }

  if (best) return { domain: best, matchedKeywords: bestMatched, score: bestScore };

  const overallMatched = DOMAIN_KEYWORDS.overall.filter((keyword) => text.includes(keyword));
  const overallScore = overallMatched.reduce(
    (sum, keyword) => sum + Math.max(1, Math.min(keyword.length, 4)),
    0,
  );
  return {
    domain: overallScore > 0 ? "overall" : null,
    matchedKeywords: overallMatched,
    score: overallScore,
  };
}

function classifyIntent(raw: string): RealityAnswerIntent {
  const text = normalize(raw);

  if (/(언제|시기|타이밍|몇월|몇 월|몇년|몇 년)/.test(text)) return "timing";
  if (/(왜|이유|원인)/.test(text)) return "why";
  if (/(준비|뭐부터|무엇부터)/.test(text)) return "prepare";
  if (/(계속|그만|헤어|끝내|유지|이어가|재회)/.test(text)) return "continue_or_stop";
  if (/(해야|할까|할까요|맞을까|맞나요|받아야|가야|옮겨야|시작해도|해도 될)/.test(text)) return "decide";
  if (/(어떻게|방법|뭘 해야|무엇을 해야)/.test(text)) return "how";
  return "open_question";
}

function decisionPointFor(raw: string, domain: RealityAnswerDomain | null): string | null {
  const text = normalize(raw);
  if (!domain) return null;

  if (domain === "career") {
    if (text.includes("이직") || text.includes("퇴사")) {
      return "퇴사부터 할지, 재직 상태에서 다음 직장을 준비할지";
    }
    if (text.includes("취업") || text.includes("면접") || text.includes("지원")) {
      return "지원 수를 늘릴지, 직무와 준비의 병목을 먼저 좁혀 보완할지";
    }
    return "현재 커리어를 유지할지, 다음 기회를 준비할지";
  }

  if (domain === "work_business") {
    if (text.includes("사업") || text.includes("창업") || text.includes("독립")) {
      return "바로 독립할지, 실제 유료 수요를 먼저 검증할지";
    }
    if (text.includes("제안") || text.includes("역할") || text.includes("승진")) {
      return "새 역할을 바로 받을지, 권한·보상·경력가치를 확인한 뒤 결정할지";
    }
    return "현재 방식대로 갈지, 일하는 방식이나 역할을 바꿀지";
  }

  if (domain === "love") {
    if (text.includes("재회")) return "다시 연락을 시도할지, 관계를 정리할지";
    if (text.includes("헤어") || text.includes("계속") || text.includes("만나")) {
      return "관계를 계속 이어갈지, 반복되는 문제를 기준으로 다시 판단할지";
    }
    if (text.includes("결혼")) return "관계를 결혼 단계로 진전할지, 현실 조건을 더 확인할지";
    return "관계를 더 진전할지, 현재 상태를 지켜보며 판단할지";
  }

  if (domain === "money") {
    if (/(안 모|모이지|저축)/.test(text)) {
      return "수입을 더 늘리기보다, 먼저 지출과 남기는 구조를 바꿀지";
    }
    if (text.includes("투자")) {
      return "사주로 투자결과를 예측하지 않고, 실제 자금조건과 감당 가능한 범위를 먼저 확인할지";
    }
    return "돈과 관련해 지금 바꿔야 할 우선순위를 무엇으로 둘지";
  }

  if (domain === "relationship") {
    return "상대를 바꾸려 하기보다, 반복되는 갈등에서 내가 조정할 행동과 지켜야 할 경계를 무엇으로 둘지";
  }

  if (domain === "wellbeing") {
    return "사주로 건강을 단정하지 않고, 생활 리듬을 먼저 조정할지 의료 확인이 필요한지 구분할지";
  }

  return "지금 바로 큰 변화를 만들지, 작은 실험으로 방향을 확인한 뒤 확대할지";
}

export function parseRealityQuestion(raw: string): RealityQuestionParseResult {
  const cleaned = raw.trim();
  const classified = classifyDomain(cleaned);
  const intent = classifyIntent(cleaned);
  const decisionPoint = decisionPointFor(cleaned, classified.domain);

  const confidence =
    classified.score >= 6 ? "high" : classified.score >= 2 ? "medium" : "low";

  return {
    raw: cleaned,
    domain: classified.domain,
    intent,
    decisionPoint,
    confidence,
    matchedKeywords: classified.matchedKeywords,
  };
}

export function isRealityAnswerDomain(value: string): value is RealityAnswerDomain {
  return (REALITY_ANSWER_DOMAINS as readonly string[]).includes(value);
}
