// 계산 전용 레이어. ssaju(MIT, 십성/지장간/대운/신살/격국/용신 포함)로
// 원국을 계산해, "돈/재물" 해석에 필요한 필드만 추려 구조화한다.
// 이 파일은 절대 문장을 지어내지 않는다 — 오직 라이브러리가 계산한 값만 옮긴다.
// LLM은 이 SajuFacts만 보고 해석하며, 여기 없는 사실을 추측해서는 안 된다.

import { calculateSaju, type SajuResult, type Gender } from "ssaju";

export interface SajuFactsInput {
  year: number;
  month: number;
  day: number;
  /** 출생시간을 모르면 null. null이면 시주 관련 필드는 채워지지 않는다. */
  hour: number | null;
  minute: number | null;
  gender: "남" | "여";
}

export interface PillarFact {
  pillar: "year" | "month" | "day" | "hour";
  ganzhi: string;
  stemTenGod: string;
  branchTenGod: string;
  hiddenStems: { 여기: string | null; 중기: string | null; 정기: string | null };
}

export interface DaeunFact {
  ageRange: string;
  ganzhi: string;
  stemTenGod: string;
  branchTenGod: string;
  isCurrent: boolean;
}

export interface SajuFacts {
  hasTimeInput: boolean;
  dayStem: string;
  dayStemKo: string;
  dayElement: string;
  dayStrength: "strong" | "weak" | "neutral";
  dayStrengthScore: number;
  geukguk: string;
  yongsin: string[];
  fiveElements: Record<string, number>;
  dominantElement: string;
  /** 재성(편재+정재) 개수 — "재물을 남에게서 취하는 힘"의 원국 근거 */
  wealthStarCount: number;
  wealthStarTypes: string[];
  /** 비겁(비견+겁재) 개수 — "직접 벌어들이는 힘/경쟁력"의 근거 */
  peerStarCount: number;
  /** 식상(식신+상관) 개수 — "돈을 만들어내는 활동력"의 근거 */
  outputStarCount: number;
  pillars: PillarFact[];
  keyRelations: string[];
  gilsin: string[];
  hyungsin: string[];
  gongmang: string[];
  currentDaeun: DaeunFact | null;
  nextDaeun: DaeunFact | null;
  /** LLM 프롬프트에 그대로 삽입할 수 있는 사람이 읽기 좋은 원국 요약 */
  compactText: string;
}

function toPillarFact(result: SajuResult, key: PillarFact["pillar"]): PillarFact {
  const detail = result.pillarDetails[key];
  const tenGod = result.tenGods[key];
  return {
    pillar: key,
    ganzhi: `${detail.stem}${detail.branch}`,
    stemTenGod: tenGod.stem,
    branchTenGod: tenGod.branch,
    hiddenStems: detail.hiddenStems,
  };
}

function toDaeunFact(item: NonNullable<SajuResult["daeun"]["current"]>, isCurrent: boolean): DaeunFact {
  return {
    ageRange: item.age_range,
    ganzhi: item.ganzhi,
    stemTenGod: item.stemTenGod,
    branchTenGod: item.branchTenGod,
    isCurrent,
  };
}

const WEALTH_STARS = new Set(["편재", "정재"]);
const PEER_STARS = new Set(["비견", "겁재"]);
const OUTPUT_STARS = new Set(["식신", "상관"]);

export function computeSajuFacts(input: SajuFactsInput): SajuFacts {
  const genderKo: Gender = input.gender;

  const result = calculateSaju({
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour ?? 12,
    minute: input.minute ?? 0,
    gender: genderKo,
  });

  const pillars: PillarFact[] = (["year", "month", "day", "hour"] as const)
    .filter((key) => key !== "hour" || input.hour !== null)
    .map((key) => toPillarFact(result, key));

  const allTenGods = pillars.flatMap((p) => [p.stemTenGod, p.branchTenGod]);
  const wealthStarTypes = allTenGods.filter((t) => WEALTH_STARS.has(t));
  const peerStarCount = allTenGods.filter((t) => PEER_STARS.has(t)).length;
  const outputStarCount = allTenGods.filter((t) => OUTPUT_STARS.has(t)).length;

  const dominantElement = Object.entries(result.fiveElements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const keyRelations: string[] = [
    ...result.stemRelations.map((r) => r.desc),
    ...Object.values(result.branchRelations.방합),
    ...Object.values(result.branchRelations.삼합),
    ...Object.values(result.branchRelations.반합),
    ...Object.values(result.branchRelations.육합),
    ...Object.values(result.branchRelations.충),
    ...Object.values(result.branchRelations.형),
    ...Object.values(result.branchRelations.원진),
  ].filter((v): v is string => Boolean(v));

  const daeunList = result.daeun.list;
  const currentIdx = daeunList.findIndex((d) => d === result.daeun.current);
  const currentDaeun = result.daeun.current ? toDaeunFact(result.daeun.current, true) : null;
  const nextDaeun =
    currentIdx >= 0 && daeunList[currentIdx + 1] ? toDaeunFact(daeunList[currentIdx + 1], false) : null;

  return {
    hasTimeInput: input.hour !== null,
    dayStem: result.dayStem,
    dayStemKo: result.pillarDetails.day.stemKo,
    dayElement: result.pillarDetails.day.element.stem,
    dayStrength: result.advanced.dayStrength.strength,
    dayStrengthScore: result.advanced.dayStrength.score,
    geukguk: result.advanced.geukguk,
    yongsin: result.advanced.yongsin,
    fiveElements: result.fiveElements,
    dominantElement,
    wealthStarCount: wealthStarTypes.length,
    wealthStarTypes,
    peerStarCount,
    outputStarCount,
    pillars,
    keyRelations,
    gilsin: result.advanced.sinsal.gilsin,
    hyungsin: result.advanced.sinsal.hyungsin,
    gongmang: result.gongmang.branchesKo,
    currentDaeun,
    nextDaeun,
    compactText: result.toCompact(),
  };
}
