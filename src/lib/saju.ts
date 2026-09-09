import { calculateSaju, calculateSajuSimple } from "@fullstackfamily/manseryeok";
import { getMoneyTendency, type MoneyTendency } from "./money-tendency";
import type { Interpretation } from "./interpretation-schema";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  /** 출생시간을 모르면 null */
  hour: number | null;
  minute: number | null;
  gender: "남" | "여";
}

export interface SajuDiagnosis {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string | null;
  hasTimeInput: boolean;
  /** 얕은 일간 10종 매핑 결과. 항상 계산해 fallback/게이지 시각화 근거로 유지한다. */
  tendency: MoneyTendency;
}

export interface DeepResultPayload {
  source: "llm" | "mock";
  interpretation: Interpretation;
  /** 무료 화면에 바로 노출할 근거 2~3개 (evidence 전체가 아님) */
  evidencePreview: string[];
}

export interface FullSajuDiagnosis extends SajuDiagnosis {
  /** "deep" = 딥 해석 성공(LLM 또는 검증 통과한 mock), "fallback" = 딥 파이프라인 자체가 실패해 얕은 결과만 있음 */
  resultSource: "deep" | "fallback";
  deep: DeepResultPayload | null;
  /** 손금 교차 분석 페이지로 넘어갈 때 다시 쓰기 위해 입력값을 그대로 echo. */
  birthInput: BirthInput;
}

export function diagnoseSaju(input: BirthInput): SajuDiagnosis {
  const { year, month, day, hour, minute } = input;

  const result =
    hour === null
      ? calculateSajuSimple(year, month, day)
      : calculateSaju(year, month, day, hour, minute ?? 0);

  return {
    yearPillar: `${result.yearPillar}(${result.yearPillarHanja})`,
    monthPillar: `${result.monthPillar}(${result.monthPillarHanja})`,
    dayPillar: `${result.dayPillar}(${result.dayPillarHanja})`,
    hourPillar:
      result.hourPillar && hour !== null
        ? `${result.hourPillar}(${result.hourPillarHanja})`
        : null,
    hasTimeInput: hour !== null,
    tendency: getMoneyTendency(result.dayPillarHanja),
  };
}
