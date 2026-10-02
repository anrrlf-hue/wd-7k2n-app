import {
  REALITY_ANSWER_DOMAINS,
  type RealityAnswerDomain,
  type RealityAnswerIntent,
  type RealityTimeScope,
} from "@/lib/reality-answer-contract";

export interface RealityQuestionParseResult {
  raw: string;
  domain: RealityAnswerDomain | null;
  intent: RealityAnswerIntent;
  decisionPoint: string | null;
  confidence: "high" | "medium" | "low";
  matchedKeywords: string[];
  timeScope: RealityTimeScope | null;
}

const DOMAIN_KEYWORDS: Record<RealityAnswerDomain, string[]> = {
  love: [
    "연애", "결혼", "재회", "헤어", "이별", "남자친구", "여자친구", "남친", "여친",
    "소개팅", "썸", "배우자", "연인", "사랑", "만나는 사람", "교제", "인연", "호감", "데이트",
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

function currentKst(referenceDate?: Date): { year: number; month: number } {
  const date = referenceDate ?? new Date();
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 };
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function parseRealityTimeScope(raw: string, referenceDate?: Date): RealityTimeScope | null {
  const text = normalize(raw);
  const now = currentKst(referenceDate);

  const explicitYearMonth = text.match(/(20\d{2})년\s*(1[0-2]|0?[1-9])월/);
  if (explicitYearMonth) {
    const year = Number(explicitYearMonth[1]);
    const month = Number(explicitYearMonth[2]);
    return { kind: "month", label: `${year}년 ${month}월`, startYear: year, startMonth: month, endYear: year, endMonth: month };
  }

  const explicitYear = text.match(/(20\d{2})년/);
  if (explicitYear) {
    const year = Number(explicitYear[1]);
    const half = text.includes("상반기") ? 1 : text.includes("하반기") ? 2 : 0;
    if (half === 1) return { kind: "half_year", label: `${year}년 상반기`, startYear: year, startMonth: 1, endYear: year, endMonth: 6 };
    if (half === 2) return { kind: "half_year", label: `${year}년 하반기`, startYear: year, startMonth: 7, endYear: year, endMonth: 12 };
    return { kind: "year", label: `${year}년`, startYear: year, startMonth: 1, endYear: year, endMonth: 12 };
  }

  const yearFromRelative =
    /내후년/.test(text) ? now.year + 2 :
    /(내년|다음\s*해)/.test(text) ? now.year + 1 :
    /(올해|금년)/.test(text) ? now.year :
    now.year;

  if (/상반기/.test(text)) {
    return {
      kind: "half_year",
      label: yearFromRelative === now.year ? "올해 상반기" : `${yearFromRelative}년 상반기`,
      startYear: yearFromRelative,
      startMonth: 1,
      endYear: yearFromRelative,
      endMonth: 6,
    };
  }
  if (/하반기/.test(text)) {
    return {
      kind: "half_year",
      label: yearFromRelative === now.year ? "올해 하반기" : `${yearFromRelative}년 하반기`,
      startYear: yearFromRelative,
      startMonth: 7,
      endYear: yearFromRelative,
      endMonth: 12,
    };
  }

  if (/(이번\s*달|이달)/.test(text)) {
    return { kind: "month", label: "이번 달", startYear: now.year, startMonth: now.month, endYear: now.year, endMonth: now.month };
  }
  if (/(다음\s*달|내달)/.test(text)) {
    const next = addMonths(now.year, now.month, 1);
    return { kind: "month", label: "다음 달", startYear: next.year, startMonth: next.month, endYear: next.year, endMonth: next.month };
  }

  const monthsAhead = text.match(/(?:앞으로\s*)?(\d{1,2})개월\s*(?:안|내|동안)?/);
  if (monthsAhead) {
    const count = Math.max(1, Math.min(24, Number(monthsAhead[1])));
    const end = addMonths(now.year, now.month, count - 1);
    return {
      kind: "month_range",
      label: `앞으로 ${count}개월`,
      startYear: now.year,
      startMonth: now.month,
      endYear: end.year,
      endMonth: end.month,
    };
  }

  if (/(내후년)/.test(text)) {
    return { kind: "year", label: "내후년", startYear: now.year + 2, startMonth: 1, endYear: now.year + 2, endMonth: 12 };
  }
  if (/(내년|다음\s*해)/.test(text)) {
    return { kind: "year", label: "내년", startYear: now.year + 1, startMonth: 1, endYear: now.year + 1, endMonth: 12 };
  }
  if (/(올해|금년)/.test(text)) {
    return { kind: "year", label: "올해", startYear: now.year, startMonth: now.month, endYear: now.year, endMonth: 12 };
  }

  return null;
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

export function decisionPointFor(raw: string, domain: RealityAnswerDomain | null): string | null {
  const text = normalize(raw);
  if (!domain) return null;

  if (domain === "career") {
    if (/(언제|시기|몇월|몇 월|몇년|몇 년)/.test(text)) {
      return "취업·이직 흐름이 상대적으로 강해지는 시기가 언제인지";
    }
    if (text.includes("이직") || text.includes("퇴사")) {
      return "퇴사부터 할지, 재직 상태에서 다음 직장을 준비할지";
    }
    if (text.includes("취업") || text.includes("면접") || text.includes("지원")) {
      return "지원 수를 늘릴지, 직무와 준비의 병목을 먼저 좁혀 보완할지";
    }
    return "현재 커리어를 유지할지, 다음 기회를 준비할지";
  }

  if (domain === "work_business") {
    if (/(언제|시기|몇월|몇 월|몇년|몇 년)/.test(text)) {
      return "직장·사업과 관련된 변화나 기회가 상대적으로 부각되는 시기가 언제인지";
    }
    if (text.includes("사업") || text.includes("창업") || text.includes("독립")) {
      return "바로 독립할지, 실제 유료 수요를 먼저 검증할지";
    }
    if (text.includes("제안") || text.includes("역할") || text.includes("승진")) {
      return "새 역할을 바로 받을지, 권한·보상·경력가치를 확인한 뒤 결정할지";
    }
    return "현재 방식대로 갈지, 일하는 방식이나 역할을 바꿀지";
  }

  if (domain === "love") {
    if (/(언제|시기|몇월|몇 월|몇년|몇 년)/.test(text)) {
      return "연애·인연 흐름이 상대적으로 살아나는 시기가 언제인지";
    }
    if (text.includes("재회")) return "다시 연락을 시도할지, 관계를 정리할지";
    if (text.includes("헤어") || text.includes("계속") || text.includes("만나")) {
      return "관계를 계속 이어갈지, 반복되는 문제를 기준으로 다시 판단할지";
    }
    if (text.includes("결혼")) return "관계를 결혼 단계로 진전할지, 현실 조건을 더 확인할지";
    return "관계를 더 진전할지, 현재 상태를 지켜보며 판단할지";
  }

  if (domain === "money") {
    if (/(언제|시기|몇월|몇 월|몇년|몇 년)/.test(text)) {
      return "재물과 기회 흐름이 상대적으로 강해지는 시기가 언제인지";
    }
    if (/(안 모|모이지|저축)/.test(text)) {
      return "수입을 더 늘리기보다, 먼저 지출과 남기는 구조를 바꿀지";
    }
    if (text.includes("투자")) {
      return "사주로 투자결과를 예측하지 않고, 실제 자금조건과 감당 가능한 범위를 먼저 확인할지";
    }
    return "돈과 관련해 지금 바꿔야 할 우선순위를 무엇으로 둘지";
  }

  if (domain === "relationship") {
    if (/(언제|시기|몇월|몇 월|몇년|몇 년)/.test(text)) {
      return "새로운 인간관계나 관계 변화가 상대적으로 부각되는 시기가 언제인지";
    }
    return "현재 인간관계에서 반복되는 흐름과 관계의 특징이 무엇인지";
  }

  if (domain === "wellbeing") {
    if (/(언제|시기|몇월|몇 월|몇년|몇 년)/.test(text)) {
      return "생활 리듬과 에너지 변화가 상대적으로 크게 느껴지는 시기가 언제인지";
    }
    return "생활 리듬과 스트레스 패턴이 어떤 방식으로 나타나는지";
  }

  if (/(언제|시기|몇월|몇 월|몇년|몇 년)/.test(text)) {
    return "앞으로 흐름의 변화가 상대적으로 크게 부각되는 시기가 언제인지";
  }
  return "앞으로 어떤 흐름이 두드러지고 무엇이 달라질 가능성이 있는지";
}

export function parseRealityQuestion(raw: string): RealityQuestionParseResult {
  const cleaned = raw.trim();
  const classified = classifyDomain(cleaned);
  const intent = classifyIntent(cleaned);
  const decisionPoint = decisionPointFor(cleaned, classified.domain);
  const timeScope = parseRealityTimeScope(cleaned);

  const confidence =
    classified.score >= 6 ? "high" : classified.score >= 2 ? "medium" : "low";

  return {
    raw: cleaned,
    domain: classified.domain,
    intent,
    decisionPoint,
    confidence,
    matchedKeywords: classified.matchedKeywords,
    timeScope,
  };
}

export function isRealityAnswerDomain(value: string): value is RealityAnswerDomain {
  return (REALITY_ANSWER_DOMAINS as readonly string[]).includes(value);
}
