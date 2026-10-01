import { calculateSajuSimple } from "@fullstackfamily/manseryeok";
import type { RealityAnswerDomain } from "@/lib/reality-answer-contract";
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

function timingWindowCopy(
  domain: RealityAnswerDomain,
  groups: TenGodGroup[],
): { reason: string; meaning: string; positive: string; caution: string } {
  const has = (...targets: TenGodGroup[]) => targets.some((target) => groups.includes(target));

  switch (domain) {
    case "love": {
      const details: string[] = [];
      if (has("재성", "관성")) details.push("새 인연이 들어오거나 기존 관계가 한 단계 가까워질 계기가 생기기 쉬워요.");
      if (has("식상")) details.push("연락·대화·표현이 자연스럽게 늘면서 마음을 확인할 장면이 생길 수 있어요.");
      if (has("비겁", "인성")) details.push("소개나 주변 사람을 통한 연결이 늘어날 수 있어요.");
      return {
        reason: "연애·인연 흐름이 평소보다 또렷하게 살아나는 시기입니다.",
        meaning: details.slice(0, 2).join(" ") || "새로운 만남이나 관계의 진전이 눈에 띄기 쉬운 때예요.",
        positive: "반가운 연락, 소개, 약속, 관계 진전처럼 기분 좋은 변화가 생기면 자연스럽게 이어가기 좋은 흐름이에요.",
        caution: "설렘만으로 상대 마음을 미리 확정하거나 관계 속도를 너무 빨리 끌어올리지는 마세요.",
      };
    }
    case "career": {
      const details: string[] = [];
      if (has("관성")) details.push("채용·이직·직장 역할처럼 공식적인 변화가 눈에 띄기 쉬워요.");
      if (has("인성")) details.push("준비해온 공부·자격·경력이 기회와 연결되기 쉬워요.");
      if (has("식상")) details.push("면접·발표·성과처럼 내가 보여주는 장면이 중요해질 수 있어요.");
      return {
        reason: "취업·이직과 관련된 이동 흐름이 강해지는 시기입니다.",
        meaning: details.slice(0, 2).join(" ") || "새 자리, 역할 변화, 지원 결과처럼 일의 이동 신호가 커질 수 있어요.",
        positive: "면접 연락, 새로운 제안, 역할 변경, 준비하던 기회의 가시화처럼 반가운 움직임을 기대해볼 수 있어요.",
        caution: "답답함만으로 퇴사를 먼저 확정하기보다 실제 제안과 조건이 확인되는지를 같이 보세요.",
      };
    }
    case "work_business": {
      const details: string[] = [];
      if (has("식상")) details.push("아이디어를 밖으로 내놓고 결과로 연결하는 힘이 커질 수 있어요.");
      if (has("재성")) details.push("고객·매출·거래처럼 돈과 연결된 움직임이 살아날 수 있어요.");
      if (has("비겁")) details.push("독립·협업·경쟁처럼 사람과 판이 바뀌는 일이 생길 수 있어요.");
      if (has("관성")) details.push("계약·책임·조직 변화처럼 공식적인 이슈가 부각될 수 있어요.");
      return {
        reason: "직장·사업의 기회와 변화가 함께 살아나는 시기입니다.",
        meaning: details.slice(0, 2).join(" ") || "새 역할, 고객, 제안, 계약처럼 일이 실제로 움직이는 장면이 늘 수 있어요.",
        positive: "고객 문의, 제안, 계약, 역할 확대처럼 '말로만 있던 일'이 실제 움직임으로 이어지면 좋은 흐름이에요.",
        caution: "기회가 많아 보여도 비용·책임·고정비를 한꺼번에 키우지는 말고 실제 반응을 함께 보세요.",
      };
    }
    case "money": {
      const details: string[] = [];
      if (has("재성")) details.push("수입·보상·거래처럼 돈이 직접 움직이는 장면이 많아질 수 있어요.");
      if (has("식상")) details.push("새 일거리나 성과가 수입 기회로 이어질 수 있어요.");
      if (has("관성")) details.push("계약·급여·보상 체계처럼 정해진 돈의 흐름이 달라질 수 있어요.");
      return {
        reason: "재물과 기회 흐름이 상대적으로 강해지는 시기입니다.",
        meaning: details.slice(0, 2).join(" ") || "수입 기회, 보상, 거래, 돈과 관련된 결정이 평소보다 많아질 수 있어요.",
        positive: "추가 수입, 보상, 거래 성사, 새 일거리처럼 돈과 연결된 반가운 움직임이 생기면 잘 살펴볼 시기예요.",
        caution: "재물운이 좋다는 말과 투자 수익은 같은 뜻이 아니므로 큰 투자·대출·충동지출은 따로 판단하세요.",
      };
    }
    case "relationship": {
      const details: string[] = [];
      if (has("비겁")) details.push("새 사람을 만나거나 사람 사이의 역할이 달라질 수 있어요.");
      if (has("인성")) details.push("소개·도움·연결을 통해 새로운 관계가 이어질 수 있어요.");
      if (has("관성")) details.push("관계의 약속이나 경계가 더 분명해질 수 있어요.");
      return {
        reason: "새로운 연결과 기존 관계의 변화가 부각되는 시기입니다.",
        meaning: details.slice(0, 2).join(" ") || "새 인맥이 생기거나 기존 관계가 가까워지거나 정리되는 변화가 나타날 수 있어요.",
        positive: "도움이 되는 사람, 반가운 소개, 관계 회복처럼 사람을 통해 좋은 흐름이 들어오면 편하게 받아들이기 좋아요.",
        caution: "한 번의 말이나 감정만으로 관계 전체를 확정하지 말고 상대의 실제 반응과 시간을 함께 보세요.",
      };
    }
    case "wellbeing":
      return {
        reason: "생활 리듬과 에너지 변화가 평소보다 크게 느껴질 수 있는 시기입니다.",
        meaning: has("식상")
          ? "활동량이 늘고 바깥 일정이 많아지면서 생활 리듬이 달라질 수 있어요."
          : "쉬는 방식, 수면, 혼자 정리하는 시간이 평소보다 중요하게 느껴질 수 있어요.",
        positive: "생활 패턴을 새롭게 정리하거나 몸과 마음이 편해지는 리듬을 찾으면 만족감이 커질 수 있어요.",
        caution: "이 시기는 질병을 예측하는 뜻이 아니며 불편한 증상이 있으면 사주와 별도로 확인해야 해요.",
      };
    case "overall":
      return {
        reason: "여러 영역의 변화가 한꺼번에 부각될 수 있는 시기입니다.",
        meaning: "관계·일·재물·생활 가운데 두세 가지가 함께 움직이면서 '이전과는 좀 다르다'는 느낌이 커질 수 있어요.",
        positive: "새로운 제안, 만남, 기회가 겹치며 삶의 분위기가 바뀌는 느낌이 들면 변화 흐름을 잘 타고 있는 신호로 볼 수 있어요.",
        caution: "좋은 흐름이 보여도 모든 것을 동시에 바꾸기보다 실제로 먼저 움직이는 영역부터 차분히 보세요.",
      };
  }
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
): SajuTimingOutlook | null {
  if (!facts.hasTimeInput) return null;

  const current = currentKstYearMonth(referenceDate);
  const weights = weightsFor(domain, facts.gender);
  const years: { year: number; score: number; groups: TenGodGroup[] }[] = [];

  for (let year = current.year; year <= current.year + 4; year += 1) {
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
  const candidateYears = rankedYears.filter((x) => x.score > 0).slice(0, 2);
  if (candidateYears.length === 0) return null;

  const windows: SajuTimingWindow[] = [];

  for (const candidate of candidateYears) {
    const months: { month: number; score: number; groups: TenGodGroup[] }[] = [];
    for (let month = 1; month <= 12; month += 1) {
      if (
        candidate.year === current.year &&
        (month < current.month || (month === current.month && current.day > 15))
      ) continue;
      const monthPillar = hanjaPillarsForDate(candidate.year, month, 15).monthPillar;
      const groups = pillarGroups(facts.dayStem, monthPillar);
      const score = candidate.score + scoreGroups(groups, weights);
      months.push({ month, score, groups });
    }

    const bestMonths = months
      .sort((a, b) => b.score - a.score || a.month - b.month)
      .filter((x) => x.score > candidate.score)
      .slice(0, 2);

    if (bestMonths.length === 0) {
      const copy = timingWindowCopy(domain, candidate.groups);
      windows.push({
        label: String(candidate.year) + "년",
        year: candidate.year,
        score: candidate.score,
        ...copy,
      });
      continue;
    }

    for (const month of bestMonths) {
      const groups = [...new Set([...candidate.groups, ...month.groups])];
      const copy = timingWindowCopy(domain, groups);
      windows.push({
        label: String(candidate.year) + "년 " + String(month.month) + "월 무렵",
        year: candidate.year,
        month: month.month,
        score: month.score,
        ...copy,
      });
    }
  }

  windows.sort((a, b) => b.score - a.score || a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
  const top = windows.slice(0, 3);

  const summary =
    top.length === 1
      ? top[0].label + "이 가장 눈에 띄는 시기입니다."
      : "가장 강하게 보이는 시기는 " +
        top[0].label +
        "이고, 이어서 " +
        top.slice(1).map((x) => x.label).join(", ") +
        "에도 같은 주제가 다시 살아날 수 있습니다.";

  return {
    precision: top.some((x) => x.month) ? "monthly" : "yearly",
    summary,
    windows: top,
    basis:
      "표시된 월은 하루를 찍는 예언이 아니라, 대운·세운·월운을 함께 봤을 때 그 주제가 상대적으로 강해지는 '그 달 전후의 흐름'입니다.",
  };
}
