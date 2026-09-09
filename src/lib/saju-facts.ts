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

export interface PillarStageFact {
  pillar: "year" | "month" | "day" | "hour";
  /** 봉법 12운성(지지 기준) */
  bong: string;
  /** 거법 12운성(일간 기준) */
  geo: string;
  twelveSal: string;
  /** 천을귀인 등 개별 특살. 없으면 빈 배열 */
  specialSals: string[];
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
  /** 관성(편관+정관) 개수 — "조직/규율/책임"과의 관계 근거 */
  officerStarCount: number;
  /** 인성(편인+정인) 개수 — "정보/신중함/도움받는 힘"의 근거 */
  resourceStarCount: number;
  /** 재성이 실제로 앉아 있는 자리(궁위) — 어느 자리인지에 따라 해석 영역이 달라진다 */
  wealthStarPillars: PillarFact["pillar"][];
  /** 식상이 앉아 있는 자리(궁위) */
  outputStarPillars: PillarFact["pillar"][];
  pillars: PillarFact[];
  keyRelations: string[];
  /** 귀문(鬼門)만 따로 — "궁위론" 해석(어느 자리끼리 귀문인지)에 쓴다 */
  gwimunRelations: string[];
  /** 핀(연/월/일/시)별 12운성·12살·특살. hasTimeInput=false면 hour 제외 */
  pillarStages: PillarStageFact[];
  gilsin: string[];
  hyungsin: string[];
  gongmang: string[];
  currentDaeun: DaeunFact | null;
  nextDaeun: DaeunFact | null;
  /** 앞으로의 대운 전체 흐름(현재 포함). "정밀 시기"가 아니라 "평생 흐름 존재"의 근거로만 쓴다 */
  daeunList: DaeunFact[];
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

function toPillarStageFact(result: SajuResult, key: PillarStageFact["pillar"]): PillarStageFact {
  return {
    pillar: key,
    bong: result.stages12.bong[key],
    geo: result.stages12.geo[key],
    twelveSal: result.sals[key].twelveSal,
    specialSals: result.sals[key].specialSals,
  };
}

const WEALTH_STARS = new Set(["편재", "정재"]);
const PEER_STARS = new Set(["비견", "겁재"]);
const OUTPUT_STARS = new Set(["식신", "상관"]);
const OFFICER_STARS = new Set(["편관", "정관"]);
const RESOURCE_STARS = new Set(["편인", "정인"]);

function pillarsWithTenGod(pillars: PillarFact[], stars: Set<string>): PillarFact["pillar"][] {
  return pillars.filter((p) => stars.has(p.stemTenGod) || stars.has(p.branchTenGod)).map((p) => p.pillar);
}

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
  const officerStarCount = allTenGods.filter((t) => OFFICER_STARS.has(t)).length;
  const resourceStarCount = allTenGods.filter((t) => RESOURCE_STARS.has(t)).length;
  const wealthStarPillars = pillarsWithTenGod(pillars, WEALTH_STARS);
  const outputStarPillars = pillarsWithTenGod(pillars, OUTPUT_STARS);

  const dominantElement = Object.entries(result.fiveElements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const keyRelations: string[] = [
    ...result.stemRelations.map((r) => r.desc),
    ...Object.values(result.branchRelations.방합),
    ...Object.values(result.branchRelations.삼합),
    ...Object.values(result.branchRelations.반합),
    ...Object.values(result.branchRelations.육합),
    ...Object.values(result.branchRelations.충),
    ...Object.values(result.branchRelations.형),
    ...Object.values(result.branchRelations.파),
    ...Object.values(result.branchRelations.해),
    ...Object.values(result.branchRelations.원진),
  ].filter((v): v is string => Boolean(v));

  const gwimunRelations = Object.values(result.branchRelations.귀문).filter((v): v is string => Boolean(v));

  const pillarStages: PillarStageFact[] = (["year", "month", "day", "hour"] as const)
    .filter((key) => key !== "hour" || input.hour !== null)
    .map((key) => toPillarStageFact(result, key));

  const rawDaeunList = result.daeun.list;
  const currentIdx = rawDaeunList.findIndex((d) => d === result.daeun.current);
  const currentDaeun = result.daeun.current ? toDaeunFact(result.daeun.current, true) : null;
  const nextDaeun =
    currentIdx >= 0 && rawDaeunList[currentIdx + 1] ? toDaeunFact(rawDaeunList[currentIdx + 1], false) : null;
  const daeunList = rawDaeunList.map((d) => toDaeunFact(d, d === result.daeun.current));

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
    officerStarCount,
    resourceStarCount,
    wealthStarPillars,
    outputStarPillars,
    pillars,
    keyRelations,
    gwimunRelations,
    pillarStages,
    gilsin: result.advanced.sinsal.gilsin,
    hyungsin: result.advanced.sinsal.hyungsin,
    gongmang: result.gongmang.branchesKo,
    currentDaeun,
    nextDaeun,
    daeunList,
    compactText: result.toCompact(),
  };
}
