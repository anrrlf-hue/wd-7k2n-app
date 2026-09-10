// oh-my-saju(Apache-2.0, vendor/oh-my-saju/) 자식 프로세스 호출 어댑터.
// ssaju는 격국을 "월간 십성 하나"로만 분류하고 신강신약도 단순 가중합이라,
// 자평진전 월률분야(ziping)·적천수 위치배점 통근(ditianshui) 판정이 더 정밀할 때가
// 많다 — 실제 3건 비교에서 ssaju "강함(78)" vs oh-my-saju "신약(39)"처럼 등급이
// 뒤집히는 사례도 나왔다. 같은 호출 1번에 top-level `timing`을 함께 실어서
// 대운 8~10구간(간지·십성·시작연령) 전체도 같이 받는다 — 대운마다 자식
// 프로세스를 새로 띄우지 않는다.
//
// 대운과 원국 사이의 합·충·형·파·해는 oh-my-saju가 안 주는 데이터라(timing은
// "deterministic calendar activation data"일 뿐 Tradition Pack 판정이 아님)
// 여기서 직접 계산한다 — 단, 이건 학파마다 다른 "신강신약 재판정"이 아니라
// 지지/천간 조합표(충/육합/삼합·반합/형/파/해)라는, 이견이 없는 고정 사실이라
// REUSE 범위를 벗어나지 않는다. 신강신약 재계산(9번째 글자 추가)은 하지 않는다.
//
// 실패(타임아웃/파싱 오류 등)해도 절대 throw하지 않는다 — 호출부는 null이면
// ssaju 원본 값을 그대로 쓴다.

import { execFileSync } from "node:child_process";
import path from "node:path";
import type { SajuFacts, SajuFactsInput, DaeunAnalysis, DaeunRelation, PillarFact } from "@/lib/saju-facts";

const SCRIPT_PATH = path.join(process.cwd(), "vendor", "oh-my-saju", "oh-my-saju.mjs");
const TIMEOUT_MS = 6000;

export interface OhMySajuEnrichment {
  /** 예: "칠살격", "편재격" — ziping 팩의 실제 월률분야 판정 */
  pattern: string;
  /** 예: "태왕" | "신강" | "약한 신강" | "중화" | "신약" | "태약" | "극약" */
  strengthGrade: string;
  /** 0~100, ditianshui 위치배점 합산 점수 */
  strengthScore: number;
  strengthBucket: "strong" | "weak" | "neutral";
}

// ---------- 지지/천간 조합표 (이견 없는 고정 클래식 표) ----------
const BRANCH_CLASH: [string, string][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];
const BRANCH_UNION: [string, string][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];
const BRANCH_HALF_TRINE: [string, string][] = [
  ["申", "子"], ["子", "辰"], ["申", "辰"],
  ["亥", "卯"], ["卯", "未"], ["亥", "未"],
  ["寅", "午"], ["午", "戌"], ["寅", "戌"],
  ["巳", "酉"], ["酉", "丑"], ["巳", "丑"],
];
const BRANCH_PUNISH: [string, string][] = [
  ["寅", "巳"], ["巳", "申"], ["丑", "戌"], ["戌", "未"], ["子", "卯"],
];
const BRANCH_SELF_PUNISH = new Set(["辰", "午", "酉", "亥"]);
const BRANCH_BREAK: [string, string][] = [
  ["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["戌", "未"],
];
const BRANCH_HARM: [string, string][] = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];
const STEM_UNION: [string, string][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"],
];

function pairMatch(pairs: [string, string][], a: string, b: string): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

const PILLAR_LABEL: Record<PillarFact["pillar"], { branch: string; stem: string }> = {
  year: { branch: "연지", stem: "연간" },
  month: { branch: "월지", stem: "월간" },
  day: { branch: "일지", stem: "일간" },
  hour: { branch: "시지", stem: "시간" },
};

function computeDaeunRelations(
  daeunStemHanja: string,
  daeunBranchHanja: string,
  natalPillars: PillarFact[],
): DaeunRelation[] {
  const relations: DaeunRelation[] = [];

  for (const p of natalPillars) {
    // PillarFact.ganzhi는 한자 간지 2글자(예: "庚辰") — 앞글자가 천간, 뒷글자가 지지.
    const natalStem = p.ganzhi[0];
    const natalBranch = p.ganzhi[1];
    const label = PILLAR_LABEL[p.pillar];

    if (natalBranch === daeunBranchHanja && BRANCH_SELF_PUNISH.has(natalBranch)) {
      relations.push({ withPillar: p.pillar, type: "자형", detail: `${label.branch}(${natalBranch})와 자형` });
    } else if (pairMatch(BRANCH_CLASH, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "충", detail: `${label.branch}(${natalBranch})와 충` });
    } else if (pairMatch(BRANCH_UNION, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "육합", detail: `${label.branch}(${natalBranch})와 육합` });
    } else if (pairMatch(BRANCH_HALF_TRINE, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "반합", detail: `${label.branch}(${natalBranch})와 반합` });
    } else if (pairMatch(BRANCH_PUNISH, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "형", detail: `${label.branch}(${natalBranch})와 형` });
    } else if (pairMatch(BRANCH_BREAK, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "파", detail: `${label.branch}(${natalBranch})와 파` });
    } else if (pairMatch(BRANCH_HARM, natalBranch, daeunBranchHanja)) {
      relations.push({ withPillar: p.pillar, type: "해", detail: `${label.branch}(${natalBranch})와 해` });
    }

    if (pairMatch(STEM_UNION, natalStem, daeunStemHanja)) {
      relations.push({ withPillar: p.pillar, type: "천간합", detail: `${label.stem}(${natalStem})와 천간합` });
    }
  }

  return relations;
}

function computeCurrentAge(input: SajuFactsInput, today: Date): number {
  let age = today.getFullYear() - input.year;
  const beforeBirthday =
    today.getMonth() + 1 < input.month || (today.getMonth() + 1 === input.month && today.getDate() < input.day);
  if (beforeBirthday) age -= 1;
  return age;
}

function buildCommand(input: SajuFactsInput) {
  const birth =
    input.hour === null
      ? {
          date: { calendar: "gregorian" as const, year: input.year, month: input.month, day: input.day },
          time: { kind: "unknown" as const, reason: "not-asked" as const },
          timeZone: "Asia/Seoul",
          timeEvidence: { source: "self-report" as const },
        }
      : {
          date: { calendar: "gregorian" as const, year: input.year, month: input.month, day: input.day },
          time: { hour: input.hour, minute: input.minute ?? 0 },
          timeZone: "Asia/Seoul",
        };

  // timing(대운 8~10구간)은 exact 계산에서만 지원된다 — 시간 미상이면 뺀다.
  const timing =
    input.hour === null
      ? undefined
      : {
          fromYear: input.year,
          throughYear: input.year,
          gender: input.gender === "남" ? ("male" as const) : ("female" as const),
          luckPillarCount: 10,
        };

  return {
    schemaVersion: "1",
    command: "analyze-reading",
    request: {
      calculation:
        input.hour === null
          ? { kind: "possibilities", request: { birth } }
          : { kind: "exact", request: { birth, rules: { ziHourPolicy: "civilMidnight" } } },
      question: "타고난 성향과 재물운, 평생 대운 흐름을 설명해줘.",
      readingMode: "focused",
      inferenceDepth: "deep-traditional",
      locale: "ko-KR",
    },
    ...(timing ? { timing } : {}),
  };
}

function bucketFromGrade(grade: string): "strong" | "weak" | "neutral" {
  if (grade === "태왕" || grade === "신강" || grade === "약한 신강") return "strong";
  if (grade === "중화") return "neutral";
  return "weak"; // 신약/태약/극약
}

interface OhMySajuCallResult {
  enrichment: OhMySajuEnrichment | null;
  rawTimingPillars: unknown;
}

function callOhMySaju(input: SajuFactsInput): OhMySajuCallResult {
  const command = buildCommand(input);
  const stdout = execFileSync(process.execPath, [SCRIPT_PATH], {
    input: JSON.stringify(command),
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    encoding: "utf8",
  });

  const data = JSON.parse(stdout);
  const analysis = data?.result?.analysis;
  const doctrines: unknown[] = analysis?.doctrines ?? [];

  const ziping = doctrines.find(
    (d): d is { interpretation: { findings: { ruleId: string; values?: Record<string, unknown> }[] } } =>
      typeof d === "object" && d !== null && (d as { packRef?: { id?: string } }).packRef?.id === "ziping",
  );
  const ditianshui = doctrines.find(
    (d): d is { interpretation: { findings: { ruleId: string; values?: Record<string, unknown> }[] } } =>
      typeof d === "object" && d !== null && (d as { packRef?: { id?: string } }).packRef?.id === "ditianshui",
  );

  const patternFinding = ziping?.interpretation.findings.find((f) => f.ruleId === "ziping.pattern-integrity");
  const strengthFinding = ditianshui?.interpretation.findings.find((f) => f.ruleId === "ditianshui.strength-verdict");

  const pattern = patternFinding?.values?.pattern;
  const strengthGrade = strengthFinding?.values?.grade;
  const strengthScore = strengthFinding?.values?.supportScore;

  const enrichment =
    typeof pattern === "string" && typeof strengthGrade === "string" && typeof strengthScore === "number"
      ? { pattern, strengthGrade, strengthScore, strengthBucket: bucketFromGrade(strengthGrade) }
      : null;

  return { enrichment, rawTimingPillars: data?.result?.timing?.luckPillars?.pillars };
}

interface RawLuckPillar {
  age: number;
  pillar: { hanja: string; stem: { hanja: string }; branch: { hanja: string } };
  tenGods: { stem: string; branch: string };
  approximateStartDate: { date: string };
}

function isRawLuckPillarArray(value: unknown): value is RawLuckPillar[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as RawLuckPillar).age === "number" &&
        typeof (v as RawLuckPillar).pillar?.hanja === "string",
    )
  );
}

function buildDaeunAnalysis(
  rawTimingPillars: unknown,
  natalPillars: PillarFact[],
  input: SajuFactsInput,
): DaeunAnalysis[] | null {
  if (!isRawLuckPillarArray(rawTimingPillars) || rawTimingPillars.length === 0) return null;

  const currentAge = computeCurrentAge(input, new Date());
  const sorted = [...rawTimingPillars].sort((a, b) => a.age - b.age);

  return sorted.map((lp, i) => {
    const daeunStemHanja = lp.pillar.stem.hanja;
    const daeunBranchHanja = lp.pillar.branch.hanja;
    const isCurrent = currentAge >= lp.age && currentAge < lp.age + 10;
    const isNext = !isCurrent && i > 0 && currentAge >= sorted[i - 1].age && currentAge < lp.age;

    return {
      age: lp.age,
      ganzhi: lp.pillar.hanja,
      stemHanja: daeunStemHanja,
      branchHanja: daeunBranchHanja,
      tenGods: { stem: lp.tenGods.stem, branch: lp.tenGods.branch },
      approximateStartDate: lp.approximateStartDate?.date ?? null,
      relations: computeDaeunRelations(daeunStemHanja, daeunBranchHanja, natalPillars),
      isCurrent,
      isNext,
    };
  });
}

export function getOhMySajuEnrichment(input: SajuFactsInput): OhMySajuEnrichment | null {
  try {
    return callOhMySaju(input).enrichment;
  } catch {
    return null;
  }
}

// facts.geukguk/dayStrength/dayStrengthScore는 oh-my-saju 판정으로 바꾸고,
// facts.daeunAnalysis는 oh-my-saju의 timing(대운 8~10구간) + 로컬 합충형파해
// 계산으로 새로 채운다. 나머지 필드(오행/십성 개수, 궁위, ssaju 자체 대운 등)는
// 전부 ssaju 값 그대로 — REUSE 범위를 벗어나지 않는다.
export function enrichSajuFacts(facts: SajuFacts, input: SajuFactsInput): SajuFacts {
  let result: OhMySajuCallResult;
  try {
    result = callOhMySaju(input);
  } catch {
    return facts;
  }

  const daeunAnalysis = buildDaeunAnalysis(result.rawTimingPillars, facts.pillars, input);

  return {
    ...facts,
    ...(result.enrichment
      ? {
          geukguk: result.enrichment.pattern,
          dayStrength: result.enrichment.strengthBucket,
          dayStrengthScore: result.enrichment.strengthScore,
        }
      : {}),
    daeunAnalysis,
  };
}
