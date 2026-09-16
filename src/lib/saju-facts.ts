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
  /** 아래 4개는 ssaju가 이미 계산해서 주는 값을 그대로 노출한다(새 계산 아님) —
   * 명식 표(원국 8글자)를 한자+한글 병기로 보여줄 때 쓴다. */
  stemHanja: string;
  branchHanja: string;
  stemKo: string;
  branchKo: string;
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
  /** dayStrength(3단계)가 파생되어 나온 세분화된 등급. oh-my-saju 판정이
   * 성공하면 그 원본 등급("태왕"|"신강"|"약한 신강"|"중화"|"신약"|"태약"|
   * "극약")을 그대로 노출한다(새 판정 아님) — enrichSajuFacts 성공 전에는
   * ssaju가 이 세분화 등급을 안 주므로 dayStrengthShort(dayStrength)와
   * 같은 3단계 값으로 시작한다. */
  dayStrengthGrade: string;
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
  /** 관성이 앉아 있는 자리(궁위) — "조직에서 강한 부분" 해석에 쓴다 */
  officerStarPillars: PillarFact["pillar"][];
  /** 오행 중 원국에 아예 없는(0개) 것들 — "없는 오행"은 통변에서 자주 쓰는 별도 근거 */
  missingElements: string[];
  /** 대운 전체 중 재성(편재/정재)이 천간이나 지지에 나타나는 회차 수.
   * "정확한 시기"가 아니라 "인생 전체에 이런 흐름이 몇 번 있다"는 구조적 사실로만 쓴다 */
  wealthOpportunityDaeunCount: number;
  /** 12운성 중 건록/제왕(정점)이 놓인 자리 — "기회를 잡는 방식"의 근거 */
  peakStagePillars: PillarFact["pillar"][];
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
  /** oh-my-saju timing으로 받은 대운 8~10구간 전체 + 원국과의 합충형파해.
   * ssaju 자체 계산이 아니라 oh-my-saju 호출 결과라 null일 수 있다(호출 실패/시간 미상). */
  daeunAnalysis: DaeunAnalysis[] | null;
  /** 생년월일 기준 만 나이(ssaju가 이미 계산해서 주는 값 그대로 REUSE — 새로
   * 계산하지 않는다). 대운 시작 나이(daeunAnalysis[].age, currentDaeun.ageRange)와
   * 절대 혼동하면 안 된다 — 이 값이 "사용자의 실제 지금 나이"다. */
  currentAge: number;
  /** geukguk/dayStrength/dayStrengthScore가 oh-my-saju(자평진전+적천수) 판정에서
   * 왔는지, ssaju 원본 폴백인지. enrichSajuFacts가 성공하면 이 3개 필드가
   * 항상 같이 바뀌므로(atomic) 플래그 1개로 셋 다 게이트한다. UI는 이 값이
   * "ssaju_fallback"이면 판정 방식 근거 문장을 표시하지 않는다 — 없는 근거를
   * 말하면 안 된다. computeSajuFacts는 oh-my-saju를 호출하지 않으므로 항상
   * "ssaju_fallback"으로 시작하고, enrichSajuFacts 성공 시에만 바뀐다. */
  geukgukSource: "ziping_ditianshui" | "ssaju_fallback";
}

export interface DaeunRelation {
  withPillar: PillarFact["pillar"];
  type: "충" | "육합" | "반합" | "형" | "파" | "해" | "자형" | "천간합";
  detail: string;
}

export interface DaeunAnalysis {
  age: number;
  /** 한자 간지 2글자, 예: "甲申" */
  ganzhi: string;
  stemHanja: string;
  branchHanja: string;
  tenGods: { stem: string; branch: string };
  /** 근사 시작일(3일=1년 환산), 예: "2017-08-10" */
  approximateStartDate: string | null;
  /** 이 대운 간지가 원국 4기둥과 맺는 합/충/형/파/해 (없으면 빈 배열) */
  relations: DaeunRelation[];
  isCurrent: boolean;
  isNext: boolean;
}

function toPillarFact(result: SajuResult, key: PillarFact["pillar"]): PillarFact {
  const detail = result.pillarDetails[key];
  const tenGod = result.tenGods[key];
  return {
    pillar: key,
    ganzhi: `${detail.stem}${detail.branch}`,
    stemHanja: detail.stem,
    branchHanja: detail.branch,
    stemKo: detail.stemKo,
    branchKo: detail.branchKo,
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

/** 십성 10종 → 5그룹(비겁/식상/재성/관성/인성) 분류. real-world-personalization.ts와
 * triple-compare.ts가 대운/원국 신호를 같은 기준으로 묶을 때 공유해서 쓴다
 * (파일마다 다시 정의하면 분류 기준이 갈라질 수 있어 여기 한 곳에만 둔다). */
export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";
export const TEN_GOD_GROUP: Record<string, TenGodGroup> = {
  비견: "비겁", 겁재: "비겁",
  식신: "식상", 상관: "식상",
  편재: "재성", 정재: "재성",
  편관: "관성", 정관: "관성",
  편인: "인성", 정인: "인성",
};
/** 각 그룹이 "구조화(계획적)" 축과 "관계(타인 영향)" 축 중 어디에 더
 * 가까운지 — real-world-personalization.ts의 GROUP_SIGNAL과 짝을 이룬다. */
export const TEN_GOD_GROUP_AXIS: Record<TenGodGroup, "structured" | "relational"> = {
  비겁: "relational",
  식상: "structured",
  재성: "structured",
  관성: "structured",
  인성: "relational",
};

function pillarsWithTenGod(pillars: PillarFact[], stars: Set<string>): PillarFact["pillar"][] {
  return pillars.filter((p) => stars.has(p.stemTenGod) || stars.has(p.branchTenGod)).map((p) => p.pillar);
}

const PEAK_STAGES = new Set(["건록", "제왕"]);

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
  const officerStarPillars = pillarsWithTenGod(pillars, OFFICER_STARS);

  // ssaju는 hour를 항상 필수로 받아(시간 미상이면 12시로 우리가 채워 호출)
  // 시주를 포함한 전체 4기둥 기준으로 fiveElements/관계를 계산한다 — 즉
  // "시간 미상"이어도 가짜 시주(예: 12시=午)가 오행 집계와 합충형파해 판정에
  // 그대로 섞여 들어온다. pillars 배열은 이미 hasTimeInput 기준으로 hour를
  // 뺐으니, 오행은 그 pillars만으로 직접 재계산하고(result.fiveElements를
  // 그대로 쓰지 않는다), 관계는 "hour" 키에 걸린 값과 동일한 문자열을
  // 전부 제외해 가짜 시주가 만든 합/충/귀문 등이 새지 않게 한다.
  const elementByPillar: Record<PillarFact["pillar"], { stem: string; branch: string }> = {
    year: result.pillarDetails.year.element,
    month: result.pillarDetails.month.element,
    day: result.pillarDetails.day.element,
    hour: result.pillarDetails.hour.element,
  };
  const fiveElements: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of pillars) {
    const el = elementByPillar[p.pillar];
    fiveElements[el.stem] = (fiveElements[el.stem] ?? 0) + 1;
    fiveElements[el.branch] = (fiveElements[el.branch] ?? 0) + 1;
  }

  const dominantElement = Object.entries(fiveElements).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const missingElements = Object.entries(fiveElements)
    .filter(([, count]) => count === 0)
    .map(([el]) => el);

  // ssaju는 PillarKey(year/month/day/hour) 4개짜리 Record에 관계를 저장하는데,
  // 지지관계 하나는 두 기둥 사이의 관계라 관여하는 두 키 모두에 같은 문자열을
  // 넣는다 — 즉 Object.values()로 펼치면 관계 하나가 항상 2번 찍힌다
  // (humanize-writing 스킬로 실제 생성 문장을 검토하다 "辰巳 귀문, 辰巳 귀문"처럼
  // 같은 문구가 그대로 중복 출력되는 걸 발견하고 역추적함). new Set()으로 dedupe.
  // ssaju가 관계 하나를 참여 기둥별로 각자 다른 문자열(단수/복수 병기 등)로
  // 저장하는 경우가 있어(예: hour="午丑 해, 午丑 해" vs month="午丑 해"),
  // 값 비교만으로는 가짜 시주가 낀 관계를 다 걸러내지 못한다. 대신 가짜
  // 시주의 지지 한자(예: 午) 자체가 문자열 어디에도 등장하지 않는 것만
  // 남긴다 — 이견 없는 고정 조합표라 지지 한자가 곧 그 관계의 식별자다.
  const fakeHourBranchHanja = input.hour === null ? result.pillarDetails.hour.branch : null;
  function relationValues(record: Record<string, string | null>): string[] {
    const entries = Object.entries(record).filter((e): e is [string, string] => Boolean(e[1]));
    if (fakeHourBranchHanja === null) return entries.map(([, v]) => v);
    return entries.filter(([k, v]) => k !== "hour" && !v.includes(fakeHourBranchHanja)).map(([, v]) => v);
  }

  const stemRelationDescs =
    input.hour !== null
      ? result.stemRelations.map((r) => r.desc)
      : result.stemRelations.filter((r) => !r.pillars.includes("hour")).map((r) => r.desc);

  const keyRelations: string[] = Array.from(
    new Set(
      [
        ...stemRelationDescs,
        ...relationValues(result.branchRelations.방합),
        ...relationValues(result.branchRelations.삼합),
        ...relationValues(result.branchRelations.반합),
        ...relationValues(result.branchRelations.육합),
        ...relationValues(result.branchRelations.충),
        ...relationValues(result.branchRelations.형),
        ...relationValues(result.branchRelations.파),
        ...relationValues(result.branchRelations.해),
        ...relationValues(result.branchRelations.원진),
      ].filter((v): v is string => Boolean(v)),
    ),
  );

  const gwimunRelations = Array.from(new Set(relationValues(result.branchRelations.귀문)));

  const pillarStages: PillarStageFact[] = (["year", "month", "day", "hour"] as const)
    .filter((key) => key !== "hour" || input.hour !== null)
    .map((key) => toPillarStageFact(result, key));

  const peakStagePillars = pillarStages.filter((s) => PEAK_STAGES.has(s.geo)).map((s) => s.pillar);

  const rawDaeunList = result.daeun.list;
  const currentIdx = rawDaeunList.findIndex((d) => d === result.daeun.current);
  const currentDaeun = result.daeun.current ? toDaeunFact(result.daeun.current, true) : null;
  const nextDaeun =
    currentIdx >= 0 && rawDaeunList[currentIdx + 1] ? toDaeunFact(rawDaeunList[currentIdx + 1], false) : null;
  const daeunList = rawDaeunList.map((d) => toDaeunFact(d, d === result.daeun.current));
  const wealthOpportunityDaeunCount = rawDaeunList.filter(
    (d) => WEALTH_STARS.has(d.stemTenGod) || WEALTH_STARS.has(d.branchTenGod),
  ).length;

  return {
    hasTimeInput: input.hour !== null,
    dayStem: result.dayStem,
    dayStemKo: result.pillarDetails.day.stemKo,
    dayElement: result.pillarDetails.day.element.stem,
    dayStrength: result.advanced.dayStrength.strength,
    dayStrengthScore: result.advanced.dayStrength.score,
    dayStrengthGrade:
      result.advanced.dayStrength.strength === "strong"
        ? "강함"
        : result.advanced.dayStrength.strength === "weak"
          ? "약함"
          : "중화",
    geukguk: result.advanced.geukguk,
    yongsin: result.advanced.yongsin,
    fiveElements,
    dominantElement,
    wealthStarCount: wealthStarTypes.length,
    wealthStarTypes,
    peerStarCount,
    outputStarCount,
    officerStarCount,
    resourceStarCount,
    wealthStarPillars,
    outputStarPillars,
    officerStarPillars,
    missingElements,
    wealthOpportunityDaeunCount,
    peakStagePillars,
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
    // ssaju.toCompact()는 항상 4기둥(시주 포함) 기준 원국표를 반환한다 —
    // 시간 미상이어도 우리가 채운 임시 12시(午)를 실제 시주인 것처럼
    // "12:00"·시 열에 그대로 적어준다. 이 텍스트는 LLM 프롬프트에 그대로
    // 들어가므로(interpretation-prompt.ts/free-report-prompt.ts), 시간
    // 미상일 땐 그 시 열/시각을 사실로 쓰지 말라는 경고를 앞에 붙인다.
    compactText:
      input.hour === null
        ? `※ 출생 시간을 몰라 아래 "시" 열과 "12:00" 표기는 계산 편의상 넣은 임시값입니다. 시주(시 기둥)와 관련된 어떤 내용도 사실로 언급하지 마세요.\n\n${result.toCompact()}`
        : result.toCompact(),
    daeunAnalysis: null,
    currentAge: result.currentAge,
    geukgukSource: "ssaju_fallback",
  };
}
