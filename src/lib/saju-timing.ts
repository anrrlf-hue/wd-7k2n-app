import { calculateSajuSimple } from "@fullstackfamily/manseryeok";
import type { RealityAnswerDomain, RealityTimeScope } from "@/lib/reality-answer-contract";
import type { SajuFacts, TenGodGroup } from "@/lib/saju-facts";
import { TEN_GOD_GROUP } from "@/lib/saju-facts";

const STEMS = {
  甲: { element: "목", yang: true },
  乙: { element: "목", yang: false },
  丙: { element: "화", yang: true },
  丁: { element: "화", yang: false },
  戊: { element: "토", yang: true },
  己: { element: "토", yang: false },
  庚: { element: "금", yang: true },
  辛: { element: "금", yang: false },
  壬: { element: "수", yang: true },
  癸: { element: "수", yang: false },
} as const;

const BRANCH_MAIN_STEM: Record<string, keyof typeof STEMS> = {
  子: "癸",
  丑: "己",
  寅: "甲",
  卯: "乙",
  辰: "戊",
  巳: "丙",
  午: "丁",
  未: "己",
  申: "庚",
  酉: "辛",
  戌: "戊",
  亥: "壬",
};

const PRODUCES: Record<string, string> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const CONTROLS: Record<string, string> = {
  목: "토",
  토: "수",
  수: "화",
  화: "금",
  금: "목",
};

function tenGodFor(dayStem: string, targetStem: string): string | null {
  const day = STEMS[dayStem as keyof typeof STEMS];
  const target = STEMS[targetStem as keyof typeof STEMS];
  if (!day || !target) return null;

  const samePolarity = day.yang === target.yang;

  if (day.element === target.element) return samePolarity ? "비견" : "겁재";
  if (PRODUCES[day.element] === target.element) return samePolarity ? "식신" : "상관";
  if (CONTROLS[day.element] === target.element) return samePolarity ? "편재" : "정재";
  if (CONTROLS[target.element] === day.element) return samePolarity ? "편관" : "정관";
  if (PRODUCES[target.element] === day.element) return samePolarity ? "편인" : "정인";
  return null;
}

function groupForStem(dayStem: string, targetStem: string): TenGodGroup | null {
  const tenGod = tenGodFor(dayStem, targetStem);
  return tenGod ? TEN_GOD_GROUP[tenGod] ?? null : null;
}

function pillarGroups(dayStem: string, ganzhi: string): TenGodGroup[] {
  if (!ganzhi || ganzhi.length < 2) return [];
  const stem = ganzhi[0];
  const branch = ganzhi[1];
  const groups = [
    groupForStem(dayStem, stem),
    groupForStem(dayStem, BRANCH_MAIN_STEM[branch] ?? ""),
  ].filter((x): x is TenGodGroup => Boolean(x));
  return [...new Set(groups)];
}

type DomainWeight = Partial<Record<TenGodGroup, number>>;

function weightsFor(domain: RealityAnswerDomain, gender: "남" | "여"): DomainWeight {
  switch (domain) {
    case "love":
      return gender === "남"
        ? { 재성: 4, 식상: 2, 비겁: 1 }
        : { 관성: 4, 인성: 2, 식상: 1 };
    case "career":
      return { 관성: 4, 인성: 3, 식상: 2 };
    case "work_business":
      return { 식상: 4, 재성: 3, 비겁: 2, 관성: 1 };
    case "money":
      return { 재성: 4, 식상: 3, 관성: 1 };
    case "relationship":
      return { 비겁: 3, 관성: 2, 인성: 2 };
    case "wellbeing":
      return { 인성: 3, 식상: 2 };
    case "overall":
      return { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1 };
  }
}

function scoreGroups(groups: TenGodGroup[], weights: DomainWeight): number {
  return groups.reduce((sum, group) => sum + (weights[group] ?? 0), 0);
}

function currentKstYearMonth(referenceDate?: Date): { year: number; month: number; day: number } {
  const date = referenceDate ?? new Date();
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
  };
}

function hanjaPillarsForDate(year: number, month: number, day: number) {
  const result = calculateSajuSimple(year, month, day);
  return {
    yearPillar: result.yearPillarHanja,
    monthPillar: result.monthPillarHanja,
  };
}

const SIGNAL_LABEL: Record<TenGodGroup, string> = {
  비겁: "사람·협업·경쟁",
  식상: "표현·실행·성과",
  재성: "돈·거래·보상",
  관성: "계약·책임·공식 변화",
  인성: "준비·지원·배움",
};

function signalLabelFor(domain: RealityAnswerDomain, signal: TenGodGroup): string {
  if (domain === "love") {
    if (signal === "재성" || signal === "관성") return "관계의 진전·약속";
    if (signal === "식상") return "연락·표현·대화";
    if (signal === "비겁") return "모임·소개·주변 연결";
    return "마음 정리·도움·소개";
  }
  if (domain === "relationship") {
    if (signal === "비겁") return "사람·모임·관계 변화";
    if (signal === "관성") return "약속·경계·관계 정리";
    if (signal === "인성") return "도움·소개·관계 회복";
    if (signal === "식상") return "대화·표현·교류";
    return "관계 속 이해관계";
  }
  if (domain === "career") {
    if (signal === "관성") return "채용·직책·공식 변화";
    if (signal === "인성") return "준비·자격·지원";
    if (signal === "식상") return "면접·표현·성과";
    return SIGNAL_LABEL[signal];
  }
  if (domain === "work_business") {
    if (signal === "식상") return "실행·성과·시장 반응";
    if (signal === "재성") return "고객·매출·거래";
    if (signal === "비겁") return "협업·경쟁·독립";
    if (signal === "관성") return "계약·책임·조직 변화";
    return "준비·자료·지원";
  }
  if (domain === "money") {
    if (signal === "재성") return "수입·보상·거래";
    if (signal === "식상") return "성과·일거리·수입 기회";
    if (signal === "관성") return "급여·계약·보상 체계";
    if (signal === "인성") return "정보·준비·판단";
    return "사람·협업·분배";
  }
  if (domain === "wellbeing") {
    if (signal === "인성") return "휴식·회복·정리";
    if (signal === "식상") return "활동량·일정 변화";
    return "생활 리듬 변화";
  }
  return SIGNAL_LABEL[signal];
}

function signalPositiveFor(
  domain: RealityAnswerDomain,
  signal: TenGodGroup,
  fallback: string,
  rank: number,
): string {
  if (domain === "love") {
    if (signal === "재성" || signal === "관성") return "연락이나 만남이 실제 약속·관계 진전으로 이어지는지 살펴보세요.";
    if (signal === "식상") return "연락·대화·표현이 자연스럽게 늘고 서로의 마음을 확인할 장면이 생기는지 보세요.";
    if (signal === "비겁") return "모임·지인·소개처럼 사람을 통한 새로운 연결이 생기는지 살펴보세요.";
    if (signal === "인성") return "소개나 도움을 통해 관계가 편안하게 이어지고 마음을 정리할 여지가 생기는지 보세요.";
    return fallback;
  }
  if (domain === "relationship") {
    if (signal === "비겁") return "새 사람을 만나거나 기존 관계의 역할·거리가 자연스럽게 달라지는지 보세요.";
    if (signal === "관성") return "애매했던 약속이나 관계의 경계가 더 분명해지는지 살펴보세요.";
    if (signal === "인성") return "소개·도움·대화를 통해 관계가 회복되거나 새로운 연결이 이어지는지 보세요.";
    if (signal === "식상") return "대화와 교류가 늘면서 오해가 풀리거나 관계의 방향이 선명해지는지 보세요.";
    return fallback;
  }
  if (domain === "career") {
    if (signal === "관성") return "채용·합격·직책·역할 변경처럼 공식적인 변화가 실제로 확인되는지 보세요.";
    if (signal === "인성") return "준비해온 공부·자격·경력이 지원이나 기회와 연결되는지 보세요.";
    if (signal === "식상") return "면접·발표·성과처럼 내가 보여준 것이 실제 반응으로 돌아오는지 보세요.";
    return fallback;
  }
  if (domain === "work_business") {
    if (signal === "식상") return rank === 0
      ? "아이디어·제안·실행이 고객 반응이나 실제 성과로 이어지는지 보세요."
      : "처음 나온 반응이 반복 가능한 성과나 다음 기회로 이어지는지 보세요.";
    if (signal === "재성") return rank === 0
      ? "고객 문의·매출·거래 조건처럼 돈과 연결된 움직임이 구체화되는지 보세요."
      : "한 번의 매출보다 거래가 반복되거나 조건이 안정되는지 보세요.";
    if (signal === "비겁") return "협업·소개·경쟁 구도가 실제 기회나 독립 움직임으로 이어지는지 보세요.";
    if (signal === "관성") return "계약·책임·조직 변화가 실제 조건으로 확정되는지 보세요.";
    if (signal === "인성") return "자료·준비·도움이 실행할 기회를 만드는 데 실제로 쓰이는지 보세요.";
    return fallback;
  }
  if (domain === "money") {
    if (signal === "재성") return rank === 0
      ? "수입·보상·거래 조건이 구체적인 금액과 결과로 확인되는지 보세요."
      : "한 번 들어온 돈보다 같은 흐름이 반복되거나 남는 구조로 이어지는지 보세요.";
    if (signal === "식상") return rank === 0
      ? "새 일거리나 성과가 실제 수입 기회로 이어지는지 보세요."
      : "성과가 일회성 반응에 그치지 않고 다음 일거리나 보상으로 연결되는지 보세요.";
    if (signal === "관성") return "급여·계약·보상 체계처럼 정해진 돈의 흐름이 구체적으로 바뀌는지 보세요.";
    if (signal === "인성") return "정보와 준비가 돈과 관련된 판단을 더 분명하게 만드는지 보세요.";
    return fallback;
  }
  if (domain === "wellbeing") {
    if (signal === "인성") {
      if (rank === 0) return "수면·휴식·혼자 정리하는 시간이 확보되면서 생활 리듬이 안정되는지 보세요.";
      if (rank === 1) return "하루 일정 사이에 비워두는 시간과 회복 루틴이 실제로 지켜지는지 보세요.";
      return "주변 일정이 바뀌어도 내 휴식 시간을 다시 확보할 수 있는지 보세요.";
    }
    if (signal === "식상") {
      if (rank === 0) return "활동량과 일정이 자연스럽게 늘고, 움직인 뒤에도 회복 리듬이 유지되는지 보세요.";
      if (rank === 1) return "늘어난 활동이 일시적인 과부하가 아니라 생활 리듬 안에 자리 잡는지 보세요.";
      return "바쁜 일정 속에서도 수면과 쉬는 시간이 함께 유지되는지 보세요.";
    }
    return fallback;
  }
  if (domain === "overall") {
    if (signal === "비겁") return "새 사람·협업·경쟁 구도가 실제 관계 변화나 새로운 역할로 이어지는지 보세요.";
    if (signal === "식상") return "말·제안·실행이 실제 결과나 새로운 선택으로 이어지는지 보세요.";
    if (signal === "재성") return "보상·거래·돈과 관련된 움직임이 실제 생활 변화와 연결되는지 보세요.";
    if (signal === "관성") return "역할·책임·공식적인 변화가 실제로 확정되는지 보세요.";
    if (signal === "인성") return "준비·배움·도움이 다음 선택을 더 분명하게 만드는지 보세요.";
  }
  return fallback;
}

function signalCautionFor(
  domain: RealityAnswerDomain,
  signal: TenGodGroup,
  fallback: string,
  rank: number,
): string {
  if (domain === "love") {
    if (signal === "재성" || signal === "관성") return "관계가 진전되는 느낌만으로 상대의 마음이나 결혼 가능성을 미리 확정하지 마세요.";
    if (signal === "식상") return "연락과 표현이 많아져도 말의 분위기만으로 관계를 너무 빨리 단정하지 마세요.";
    if (signal === "비겁") return "주변의 비교나 경쟁 분위기 때문에 내 관계의 속도를 억지로 맞추지 마세요.";
    if (signal === "인성") return "생각과 해석만 늘리며 실제 표현이나 대화를 계속 미루지는 마세요.";
    return fallback;
  }
  if (domain === "relationship") {
    if (signal === "비겁") return "사람이 많아지는 만큼 비교·편가르기·역할 충돌에 휘말리지 않도록 거리를 조절하세요.";
    if (signal === "관성") return "관계를 분명히 하려는 마음이 강해져도 상대에게 결론을 서두르게 하지는 마세요.";
    if (signal === "인성") return "상대 사정을 이해하려다 내 불편과 경계를 계속 뒤로 미루지 마세요.";
    if (signal === "식상") return "대화가 많아져도 감정이 앞선 말로 관계 전체를 단정하지 마세요.";
    return fallback;
  }
  if (domain === "career") {
    if (signal === "관성") return "공식 제안이 들어와도 직책 이름보다 역할·보상·책임 범위를 먼저 확인하세요.";
    if (signal === "인성") return "준비와 자격을 더 쌓는 것만으로 결정을 계속 미루지는 마세요.";
    if (signal === "식상") return "성과를 보여주려다 너무 많은 지원·면접·업무를 한꺼번에 벌이지 마세요.";
    return fallback;
  }
  if (domain === "work_business") {
    if (signal === "식상") return "움직임이 빨라져도 일을 너무 많이 벌이거나 말이 실제 결과보다 앞서지 않게 보세요.";
    if (signal === "재성") return "매출 가능성만 보고 비용·현금흐름·거래 조건을 확인하기 전에 규모를 키우지 마세요.";
    if (signal === "비겁") return "협업이나 경쟁이 커질수록 역할·지분·책임을 애매하게 두지 마세요.";
    if (signal === "관성") return "계약이나 조직 변화가 보여도 책임 범위와 실제 권한을 먼저 확인하세요.";
    if (signal === "인성") return "준비와 검토가 길어져 실제 실행 시점을 놓치지는 마세요.";
    return fallback;
  }
  if (domain === "money") {
    if (signal === "재성") return "좋아 보이는 기회라도 금액·조건·현금흐름을 확인하기 전에는 수익을 확정해서 보지 마세요.";
    if (signal === "식상") return "새 수입 기회를 여러 개 동시에 잡아 시간과 돈이 분산되지 않게 보세요.";
    if (signal === "관성") return "급여·계약 조건이 좋아 보여도 세부 조건과 고정 의무를 먼저 확인하세요.";
    if (signal === "인성") return "정보를 더 찾는 것만으로 결정을 계속 미루거나, 반대로 한 정보만 믿고 움직이지 마세요.";
    return fallback;
  }
  if (domain === "wellbeing") {
    if (signal === "인성") {
      if (rank === 0) return "쉬는 시간이 걱정·정보 탐색·준비로 다시 채워져 실제 휴식이 사라지지 않게 보세요.";
      if (rank === 1) return "일정이 비어도 새로운 할 일을 계속 채워 넣어 회복 시간을 다시 없애지는 마세요.";
      return "주변 상황이 바뀔 때마다 휴식 시간을 가장 먼저 줄이는 패턴이 반복되지 않게 보세요.";
    }
    if (signal === "식상") {
      if (rank === 0) return "활동량이 늘어도 수면과 회복 시간을 줄여가며 속도를 유지하지는 마세요.";
      if (rank === 1) return "바쁜 흐름이 익숙해졌다는 이유로 피로 신호를 무시하지 마세요.";
      return "일정이 다시 많아질 때 회복 시간을 뒤로 미루는 패턴을 반복하지 마세요.";
    }
    return fallback;
  }
  if (domain === "overall") {
    if (signal === "비겁") return "사람이 많아질수록 비교·경쟁·역할 충돌까지 한꺼번에 끌어안지 않게 보세요.";
    if (signal === "식상") return "움직임이 많아져도 일을 너무 넓게 벌여 중요한 한두 가지가 흐려지지 않게 보세요.";
    if (signal === "재성") return "돈과 기회가 같이 움직여도 실제 조건을 확인하기 전에 결과를 낙관하지 마세요.";
    if (signal === "관성") return "역할이나 책임이 커질 때 이름보다 실제 권한·부담·조건을 먼저 보세요.";
    if (signal === "인성") return "준비와 검토가 길어져 실제 선택을 계속 뒤로 미루지는 마세요.";
  }
  return fallback;
}

const DOMAIN_FALLBACK: Record<RealityAnswerDomain, {
  reason: string;
  meaning: string;
  positive: string;
  caution: string;
}> = {
  love: {
    reason: "연애·인연 흐름이 평소보다 또렷하게 살아나는 시기입니다.",
    meaning: "새로운 만남이나 기존 관계의 진전이 눈에 띄기 쉬운 때예요.",
    positive: "반가운 연락, 소개, 약속, 관계 진전처럼 실제 관계가 움직이는 장면을 보세요.",
    caution: "설렘만으로 상대 마음을 미리 확정하거나 관계 속도를 너무 빨리 끌어올리지는 마세요.",
  },
  career: {
    reason: "취업·이직과 관련된 이동 흐름이 강해지는 시기입니다.",
    meaning: "새 자리, 역할 변화, 지원 결과처럼 일의 이동 신호가 커질 수 있어요.",
    positive: "면접 연락, 새로운 제안, 역할 변경, 준비하던 기회의 가시화 같은 실제 움직임을 보세요.",
    caution: "답답함만으로 퇴사를 먼저 확정하기보다 실제 제안과 조건이 확인되는지를 같이 보세요.",
  },
  work_business: {
    reason: "직장·사업의 기회와 변화가 함께 살아나는 시기입니다.",
    meaning: "새 역할, 고객, 제안, 계약처럼 일이 실제로 움직이는 장면이 늘 수 있어요.",
    positive: "고객 문의, 제안, 계약, 역할 확대처럼 말로만 있던 일이 실제 움직임으로 이어지는지 보세요.",
    caution: "기회가 많아 보여도 비용·책임·고정비를 한꺼번에 키우지 말고 실제 반응을 함께 보세요.",
  },
  money: {
    reason: "재물과 기회 흐름이 상대적으로 강해지는 시기입니다.",
    meaning: "수입 기회, 보상, 거래, 돈과 관련된 결정이 평소보다 많아질 수 있어요.",
    positive: "추가 수입, 보상, 거래 성사, 새 일거리처럼 돈과 연결된 실제 움직임을 보세요.",
    caution: "재물 흐름과 투자 수익은 같은 뜻이 아니므로 큰 투자·대출·충동지출은 따로 판단하세요.",
  },
  relationship: {
    reason: "새로운 연결과 기존 관계의 변화가 부각되는 시기입니다.",
    meaning: "새 인맥이 생기거나 기존 관계가 가까워지거나 정리되는 변화가 나타날 수 있어요.",
    positive: "도움이 되는 사람, 반가운 소개, 관계 회복처럼 사람을 통한 실제 변화를 보세요.",
    caution: "한 번의 말이나 감정만으로 관계 전체를 확정하지 말고 상대의 실제 반응과 시간을 함께 보세요.",
  },
  wellbeing: {
    reason: "생활 리듬과 에너지 변화가 평소보다 크게 느껴질 수 있는 시기입니다.",
    meaning: "일정·활동량·휴식 방식이 바뀌면서 평소와 다른 생활 리듬을 느낄 수 있어요.",
    positive: "수면·일정·활동량이 안정되는 방향의 변화를 찾으면 만족감이 커질 수 있어요.",
    caution: "이 시기는 질병을 예측하는 뜻이 아니며 불편한 증상이 있으면 사주와 별도로 확인해야 해요.",
  },
  overall: {
    reason: "여러 영역의 변화가 한꺼번에 부각될 수 있는 시기입니다.",
    meaning: "관계·일·재물·생활 가운데 두세 가지가 함께 움직이면서 이전과는 다른 느낌이 커질 수 있어요.",
    positive: "새로운 제안, 만남, 기회가 겹치며 삶의 분위기가 실제로 바뀌는 장면을 보세요.",
    caution: "좋은 흐름이 보여도 모든 것을 동시에 바꾸기보다 실제로 먼저 움직이는 영역부터 차분히 보세요.",
  },
};

function choosePrimarySignal(
  yearGroups: TenGodGroup[],
  monthGroups: TenGodGroup[],
  weights: DomainWeight,
  used: Set<TenGodGroup>,
): TenGodGroup | null {
  const rank = (groups: TenGodGroup[]) =>
    [...new Set(groups)]
      .filter((group) => (weights[group] ?? 0) > 0)
      .sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0));

  const candidates = [...rank(monthGroups), ...rank(yearGroups)].filter(
    (group, index, all) => all.indexOf(group) === index,
  );
  return candidates.find((group) => !used.has(group)) ?? candidates[0] ?? null;
}

function timingWindowCopy(
  domain: RealityAnswerDomain,
  yearGroups: TenGodGroup[],
  monthGroups: TenGodGroup[],
  rank: number,
  weights: DomainWeight,
  usedSignals: Set<TenGodGroup>,
): { reason: string; meaning: string; positive: string; caution: string } {
  const base = DOMAIN_FALLBACK[domain];
  const signal = choosePrimarySignal(yearGroups, monthGroups, weights, usedSignals);
  if (signal) usedSignals.add(signal);

  const role =
    rank === 0
      ? "후보 가운데 가장 강하게 잡히는 구간입니다."
      : rank === 1
        ? "두 번째로 강하게 잡히는 구간입니다."
        : "세 번째로 눈여겨볼 구간입니다.";
  const roleMeaning =
    rank === 0
      ? "이때는 이 질문과 관련된 변화가 가장 또렷하게 드러나는 장면을 보세요."
      : rank === 1
        ? "가장 강한 후보와는 다른 방식으로 같은 주제가 드러날 수 있는 구간입니다."
        : "앞선 두 후보와 비교해 어떤 방식의 변화가 실제로 나타나는지 보는 구간입니다.";
  const positiveLead =
    rank === 0
      ? "가장 강한 구간에서는"
      : rank === 1
        ? "두 번째 후보에서는"
        : "세 번째 후보에서는";


  if (!signal) {
    return {
      reason: `${role} ${base.reason}`,
      meaning: `${base.meaning} ${roleMeaning}`,
      positive: `${positiveLead} ${base.positive}`,
      caution: base.caution,
    };
  }

  const signalLabel = signalLabelFor(domain, signal);
  const domainMeaning = (() => {
    switch (domain) {
      case "love":
        if (signal === "재성" || signal === "관성") return "만남이나 관계의 진전이 실제 관계 변화로 이어지기 쉬워요.";
        if (signal === "식상") return "연락·대화·표현이 늘면서 마음을 확인할 장면이 생기기 쉬워요.";
        return "소개나 주변 사람을 통한 연결, 관계의 거리 변화가 눈에 띄기 쉬워요.";
      case "career":
        if (signal === "관성") return "채용·이직·직책처럼 공식적인 변화가 눈에 띄기 쉬워요.";
        if (signal === "인성") return "준비해온 공부·자격·경력이 실제 기회와 연결되기 쉬워요.";
        if (signal === "식상") return "면접·발표·성과처럼 내가 보여주는 장면이 중요해질 수 있어요.";
        return base.meaning;
      case "work_business":
        if (signal === "식상") return "아이디어와 실행이 밖으로 드러나며 실제 반응을 확인하기 쉬워요.";
        if (signal === "재성") return "고객·매출·거래처럼 돈과 연결된 움직임이 살아나기 쉬워요.";
        if (signal === "비겁") return "독립·협업·경쟁처럼 사람과 판이 바뀌는 일이 생기기 쉬워요.";
        if (signal === "관성") return "계약·책임·조직 변화처럼 공식적인 이슈가 부각되기 쉬워요.";
        return base.meaning;
      case "money":
        if (signal === "재성") return "수입·보상·거래처럼 돈이 직접 움직이는 장면이 많아지기 쉬워요.";
        if (signal === "식상") return "새 일거리나 성과가 수입 기회로 이어지는 흐름이 강해질 수 있어요.";
        if (signal === "관성") return "계약·급여·보상 체계처럼 정해진 돈의 흐름이 달라질 수 있어요.";
        return base.meaning;
      case "relationship":
        if (signal === "비겁") return "새 사람을 만나거나 사람 사이의 역할과 거리가 달라지기 쉬워요.";
        if (signal === "인성") return "소개·도움·연결을 통해 새로운 관계가 이어지기 쉬워요.";
        if (signal === "관성") return "관계의 약속이나 경계가 더 분명해질 수 있어요.";
        return base.meaning;
      case "wellbeing":
        if (signal === "식상") return "활동량과 바깥 일정이 늘면서 생활 리듬이 달라질 수 있어요.";
        if (signal === "인성") return "쉬는 방식, 수면, 혼자 정리하는 시간이 평소보다 중요해질 수 있어요.";
        return base.meaning;
      case "overall":
        return `${signalLabel} 쪽 변화가 먼저 눈에 띄고, 다른 영역이 뒤따라 움직일 수 있어요.`;
    }
  })();

  return {
    reason: `${role} 이번 구간은 ${signalLabel} 신호가 상대적으로 더 두드러집니다.`,
    meaning: `${domainMeaning} ${roleMeaning}`,
    positive: `${positiveLead} ${signalPositiveFor(domain, signal, base.positive, rank)}`,
    caution: signalCautionFor(domain, signal, base.caution, rank),
  };
}

export interface SajuTimingWindow {
  label: string;
  year: number;
  month?: number;
  score: number;
  reason: string;
  meaning: string;
  positive: string;
  caution: string;
}

export interface SajuTimingOutlook {
  precision: "yearly" | "monthly";
  summary: string;
  windows: SajuTimingWindow[];
  basis: string;
}

export function buildSajuTimingOutlook(
  facts: SajuFacts,
  domain: RealityAnswerDomain,
  referenceDate?: Date,
  timeScope?: RealityTimeScope | null,
): SajuTimingOutlook | null {
  if (!facts.hasTimeInput) return null;

  const current = currentKstYearMonth(referenceDate);
  const weights = weightsFor(domain, facts.gender);
  const years: { year: number; score: number; groups: TenGodGroup[] }[] = [];
  const startYear = Math.max(current.year, timeScope?.startYear ?? current.year);
  const endYear = Math.min(current.year + 4, timeScope?.endYear ?? current.year + 4);

  if (startYear > endYear) return null;

  for (let year = startYear; year <= endYear; year += 1) {
    const yearPillar = hanjaPillarsForDate(year, 6, 15).yearPillar;
    const groups = pillarGroups(facts.dayStem, yearPillar);
    let score = scoreGroups(groups, weights);

    if (facts.currentDaeun) {
      const daeunGroups = [
        TEN_GOD_GROUP[facts.currentDaeun.stemTenGod],
        TEN_GOD_GROUP[facts.currentDaeun.branchTenGod],
      ].filter((x): x is TenGodGroup => Boolean(x));
      score += Math.min(2, scoreGroups(daeunGroups, weights) * 0.25);
    }

    years.push({ year, score, groups });
  }

  const rankedYears = [...years].sort((a, b) => b.score - a.score || a.year - b.year);
  const candidateYears = timeScope
    ? rankedYears.slice(0, Math.min(2, rankedYears.length))
    : rankedYears.filter((x) => x.score > 0).slice(0, 2);
  if (candidateYears.length === 0) return null;

  type RawWindow = {
    label: string;
    year: number;
    month?: number;
    score: number;
    yearGroups: TenGodGroup[];
    monthGroups: TenGodGroup[];
  };

  const rawWindows: RawWindow[] = [];

  for (const candidate of candidateYears) {
    const months: { month: number; score: number; groups: TenGodGroup[] }[] = [];
    for (let month = 1; month <= 12; month += 1) {
      if (candidate.year === current.year && month < current.month) continue;
      if (
        timeScope &&
        (
          candidate.year < timeScope.startYear ||
          candidate.year > timeScope.endYear ||
          (candidate.year === timeScope.startYear && month < timeScope.startMonth) ||
          (candidate.year === timeScope.endYear && month > timeScope.endMonth)
        )
      ) continue;
      const monthPillar = hanjaPillarsForDate(candidate.year, month, 15).monthPillar;
      const groups = pillarGroups(facts.dayStem, monthPillar);
      const score = candidate.score + scoreGroups(groups, weights);
      months.push({ month, score, groups });
    }

    const sortedMonths = months.sort((a, b) => b.score - a.score || a.month - b.month);
    const bestMonths = timeScope
      ? sortedMonths.slice(0, timeScope.kind === "month" ? 1 : 2)
      : sortedMonths.filter((x) => x.score > candidate.score).slice(0, 2);

    if (bestMonths.length === 0) {
      rawWindows.push({
        label: String(candidate.year) + "년",
        year: candidate.year,
        score: candidate.score,
        yearGroups: candidate.groups,
        monthGroups: [],
      });
      continue;
    }

    for (const month of bestMonths) {
      rawWindows.push({
        label: String(candidate.year) + "년 " + String(month.month) + "월 무렵",
        year: candidate.year,
        month: month.month,
        score: month.score,
        yearGroups: candidate.groups,
        monthGroups: month.groups,
      });
    }
  }

  rawWindows.sort((a, b) => b.score - a.score || a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
  const usedSignals = new Set<TenGodGroup>();
  const top: SajuTimingWindow[] = rawWindows.slice(0, 3).map((window, rank) => ({
    label: window.label,
    year: window.year,
    month: window.month,
    score: window.score,
    ...timingWindowCopy(
      domain,
      window.yearGroups,
      window.monthGroups,
      rank,
      weights,
      usedSignals,
    ),
  }));

  const summary =
    top.length === 1
      ? (timeScope ? timeScope.label + " 안에서는 " : "") + top[0].label + "이 가장 눈에 띄는 시기입니다."
      : (timeScope ? timeScope.label + " 안에서 " : "") +
        "가장 강하게 보이는 시기는 " +
        top[0].label +
        "이고, 다른 후보는 " +
        top.slice(1).map((x) => x.label).join(", ") +
        "입니다.";

  return {
    precision: top.some((x) => x.month) ? "monthly" : "yearly",
    summary,
    windows: top,
    basis: timeScope
      ? `질문에 적은 ‘${timeScope.label}’ 범위 안에서 대운·세운·월운을 함께 비교했습니다. 표시된 월은 하루를 찍는 예언이 아니라 그 달 전후의 흐름입니다.`
      : "표시된 월은 하루를 찍는 예언이 아니라, 대운·세운·월운을 함께 봤을 때 그 주제가 상대적으로 강해지는 '그 달 전후의 흐름'입니다.",
  };
}
