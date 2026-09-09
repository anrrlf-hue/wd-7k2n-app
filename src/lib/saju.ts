import { calculateSaju, calculateSajuSimple } from "@fullstackfamily/manseryeok";
import { getMoneyTendency, type MoneyTendency } from "./money-tendency";

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  /** 출생시간을 모르면 null */
  hour: number | null;
  minute: number | null;
}

export interface SajuDiagnosis {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string | null;
  hasTimeInput: boolean;
  tendency: MoneyTendency;
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
