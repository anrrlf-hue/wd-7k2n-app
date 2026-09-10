import { calculateSaju, calculateSajuSimple } from "@fullstackfamily/manseryeok";
import { getMoneyTendency, type MoneyTendency } from "./money-tendency";
import type { Interpretation } from "./interpretation-schema";
import type { FreeSajuReport } from "./free-report-schema";
import type { MbtiType } from "./mbti-facts";
import type { DaeunAnalysis } from "./saju-facts";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  /** 출생시간을 모르면 null */
  hour: number | null;
  minute: number | null;
  gender: "남" | "여";
}

/** 무료 사주 단계에서 함께 받은 자기보고 성향정보(6문항 + MBTI). 손금
 * 페이지로 넘어갈 때도 다시 써서 "사주+손금+성향" 통합 비교를 만든다.
 * MBTI는 triple-compare.ts에서 결정 방식(J/P)·관계-감정(F/T) 축의 네 번째
 * 신호로만 쓰인다 — 사주 계산값을 바꾸지 않는다. */
export interface PersonalityInputEcho {
  personalityAnswers: Record<string, number> | null;
  mbti: MbtiType | null;
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

export interface FreeReportPayload {
  source: "llm" | "mock";
  report: FreeSajuReport;
}

export interface FullSajuDiagnosis extends SajuDiagnosis {
  /** "deep" = 딥 해석 성공(LLM 또는 검증 통과한 mock), "fallback" = 딥 파이프라인 자체가 실패해 얕은 결과만 있음 */
  resultSource: "deep" | "fallback";
  deep: DeepResultPayload | null;
  /** 무료 사주 V2(12섹션). 딥 파이프라인이 실패해도 이건 별도로 계산을 시도한다. */
  freeReport: FreeReportPayload | null;
  /** 손금 교차 분석 페이지로 넘어갈 때 다시 쓰기 위해 입력값을 그대로 echo. */
  birthInput: BirthInput;
  /** 성향정보 입력을 손금 페이지까지 이어가기 위한 echo. 입력 안 했으면 둘 다 null. */
  personalityInput: PersonalityInputEcho;
  /** oh-my-saju timing 기반 대운 8~10구간 + 원국과의 합충형파해. 호출 실패/시간 미상이면 null. */
  daeunAnalysis: DaeunAnalysis[] | null;
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
