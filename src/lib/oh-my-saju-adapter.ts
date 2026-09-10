// oh-my-saju(Apache-2.0, vendor/oh-my-saju/) 자식 프로세스 호출 어댑터.
// ssaju는 격국을 "월간 십성 하나"로만 분류하고 신강신약도 단순 가중합이라,
// 자평진전 월률분야(ziping)·적천수 위치배점 통근(ditianshui) 판정이 더 정밀할 때가
// 많다 — 실제 3건 비교에서 ssaju "강함(78)" vs oh-my-saju "신약(39)"처럼 등급이
// 뒤집히는 사례도 나왔다. 이 모듈은 그 두 팩의 판정만 뽑아온다.
// 실패(타임아웃/파싱 오류 등)해도 절대 throw하지 않는다 — 호출부는 null이면
// ssaju 원본 값을 그대로 쓴다.

import { execFileSync } from "node:child_process";
import path from "node:path";
import type { SajuFacts, SajuFactsInput } from "@/lib/saju-facts";

const SCRIPT_PATH = path.join(process.cwd(), "vendor", "oh-my-saju", "oh-my-saju.mjs");
const TIMEOUT_MS = 4000;

export interface OhMySajuEnrichment {
  /** 예: "칠살격", "편재격" — ziping 팩의 실제 월률분야 판정 */
  pattern: string;
  /** 예: "태왕" | "신강" | "약한 신강" | "중화" | "신약" | "태약" | "극약" */
  strengthGrade: string;
  /** 0~100, ditianshui 위치배점 합산 점수 */
  strengthScore: number;
  strengthBucket: "strong" | "weak" | "neutral";
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

  return {
    schemaVersion: "1",
    command: "analyze-reading",
    request: {
      calculation:
        input.hour === null
          ? { kind: "possibilities", request: { birth } }
          : { kind: "exact", request: { birth, rules: { ziHourPolicy: "civilMidnight" } } },
      question: "타고난 성향과 재물운을 설명해줘.",
      readingMode: "focused",
      inferenceDepth: "deep-traditional",
      locale: "ko-KR",
    },
  };
}

function bucketFromGrade(grade: string): "strong" | "weak" | "neutral" {
  if (grade === "태왕" || grade === "신강" || grade === "약한 신강") return "strong";
  if (grade === "중화") return "neutral";
  return "weak"; // 신약/태약/극약
}

export function getOhMySajuEnrichment(input: SajuFactsInput): OhMySajuEnrichment | null {
  try {
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

    if (typeof pattern !== "string" || typeof strengthGrade !== "string" || typeof strengthScore !== "number") {
      return null;
    }

    return {
      pattern,
      strengthGrade,
      strengthScore,
      strengthBucket: bucketFromGrade(strengthGrade),
    };
  } catch {
    return null;
  }
}

// facts.geukguk/dayStrength/dayStrengthScore만 oh-my-saju 판정으로 바꾼다.
// 나머지 필드(오행/십성 개수, 궁위, 대운 등)는 전부 ssaju 값 그대로 — ssaju가
// 더 나은 계산은 유지하고 격국/통근 판정만 REUSE한다는 이번 라운드 제약.
export function enrichSajuFacts(facts: SajuFacts, input: SajuFactsInput): SajuFacts {
  const enrichment = getOhMySajuEnrichment(input);
  if (!enrichment) return facts;

  return {
    ...facts,
    geukguk: enrichment.pattern,
    dayStrength: enrichment.strengthBucket,
    dayStrengthScore: enrichment.strengthScore,
  };
}
