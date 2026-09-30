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

export interface SajuTimingWindow {
  label: string;
  year: number;
  month?: number;
  score: number;
  reason: string;
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
  const years: { year: number; score: number; groups: TenGodGroup[]; pillar: string }[] = [];

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

    years.push({ year, score, groups, pillar: yearPillar });
  }

  const rankedYears = [...years].sort((a, b) => b.score - a.score || a.year - b.year);
  const candidateYears = rankedYears.filter((x) => x.score > 0).slice(0, 2);
  if (candidateYears.length === 0) return null;

  const windows: SajuTimingWindow[] = [];

  for (const candidate of candidateYears) {
    const months: { month: number; score: number; groups: TenGodGroup[]; pillar: string }[] = [];
    for (let month = 1; month <= 12; month += 1) {
      if (
        candidate.year === current.year &&
        (month < current.month || (month === current.month && current.day > 15))
      ) continue;
      const monthPillar = hanjaPillarsForDate(candidate.year, month, 15).monthPillar;
      const groups = pillarGroups(facts.dayStem, monthPillar);
      const score = candidate.score + scoreGroups(groups, weights);
      months.push({ month, score, groups, pillar: monthPillar });
    }

    const bestMonths = months
      .sort((a, b) => b.score - a.score || a.month - b.month)
      .filter((x) => x.score > candidate.score)
      .slice(0, 2);

    if (bestMonths.length === 0) {
      windows.push({
        label: String(candidate.year) + "년",
        year: candidate.year,
        score: candidate.score,
        reason:
          "세운 " +
          candidate.pillar +
          "에서 " +
          (candidate.groups.join("·") || "질문 관련") +
          " 흐름이 상대적으로 부각됩니다.",
      });
      continue;
    }

    for (const month of bestMonths) {
      windows.push({
        label: String(candidate.year) + "년 " + String(month.month) + "월 무렵",
        year: candidate.year,
        month: month.month,
        score: month.score,
        reason:
          "세운 " +
          candidate.pillar +
          "과 월운 " +
          month.pillar +
          "에서 " +
          [...new Set([...candidate.groups, ...month.groups])].join("·") +
          " 흐름이 겹칩니다.",
      });
    }
  }

  windows.sort((a, b) => b.score - a.score || a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
  const top = windows.slice(0, 3);

  const summary =
    top.length === 1
      ? top[0].label + "을 이 질문과 관련해 먼저 눈여겨볼 시기로 봅니다."
      : top[0].label +
        "을 가장 먼저 보고, 그다음은 " +
        top.slice(1).map((x) => x.label).join(", ") +
        "을 함께 눈여겨볼 수 있습니다.";

  return {
    precision: top.some((x) => x.month) ? "monthly" : "yearly",
    summary,
    windows: top,
    basis:
      "대운과 세운·월운의 십성 흐름을 비교한 상대적 시기 해석입니다. 월운은 각 양력 월 중순의 절기 기준 월주를 대표값으로 사용하므로 정확한 날짜 예측이 아니라 그 달 무렵의 참고 구간입니다.",
  };
}
