// 분석 결과 조립 — 병목 판정(bottleneck-engine.ts) + 카피(analysis-result-copy.ts)
// + 코드로 계산한 근거 숫자(surplusKrw, gapStatement)를 합친다. 숫자는 전부
// 코드 계산, AI/추측 없음.
//
// gapStatement("격차 한 방"): 결제 직전 임팩트 문구 — "지금 속도라면 목표까지
// 몇 개월 걸린다" 식의 순수 숫자 격차만 보여준다(불안 조성 문구 아님).
// 설문은 구간(버킷)으로만 받으므로, 버킷 중간값을 코드가 정한 근사치로 써서
// 계산한다 — AI가 지어낸 숫자가 아니라 우리가 정한 고정 환산표를 코드가
// 그대로 적용한 값이다. 병목 항목마다 그 항목에 맞는 격차를 계산하고,
// 전용 계산식이 없는(붙일 실수 데이터가 없는) 항목은 "잉여금 연환산"이라는
// 공통 격차로 대체한다 — 하드코딩된 문장 하나를 모든 유형에 재사용하지
// 않는다는 원칙은 지키되, 데이터가 없는 곳까지 억지로 지어내지 않는다.

import type { SurveyInput } from "@/lib/survey-input";
import { surplusKrw } from "@/lib/survey-input";
import { detectBottleneck, type BottleneckCode } from "@/lib/bottleneck-engine";
import { BOTTLENECK_COPY } from "@/lib/analysis-result-copy";

export interface AnalysisResult {
  bottleneck: BottleneckCode;
  headline: string;
  why: string;
  lifeMeaning: string;
  notUrgent: string;
  notUrgentReason: string;
  surplusKrw: number;
  gapStatement: string;
}

// 구간 응답을 실제 계산에 쓸 수 있는 근사 숫자로 바꾸는 고정 환산표(코드가
// 정한 값, AI 추측 아님) — 정확한 금액이 아니라 "그 구간을 대표하는 값"이다.
const EMERGENCY_FUND_MONTHS: Record<string, number> = { none: 0, under_1m: 0.5, "1_3m": 2, "3_6m": 4.5, over_6m: 6 };
const FUTURE_EVENT_AMOUNT_KRW: Record<string, number> = { under_500: 2_500_000, "500_2000": 12_500_000, over_2000: 25_000_000 };
const FUTURE_EVENT_PREPARED_FRACTION: Record<string, number> = { none: 0, under_half: 0.25, over_half: 0.75, enough: 1 };
const DEBT_PAYMENT_MONTHLY_KRW: Record<string, number> = { under_30: 150_000, "30_100": 650_000, over_100: 1_200_000 };

function fmt(krw: number): string {
  return `${Math.round(krw).toLocaleString("ko-KR")}원`;
}

/** 저축 여력 — 저축액을 입력했으면 그대로, 안 했으면 잉여금(양수일 때만) 대신 쓴다. */
function monthlySavingCapacity(input: SurveyInput): number {
  if (input.monthlySavingsKrw > 0) return input.monthlySavingsKrw;
  const surplus = surplusKrw(input);
  return surplus > 0 ? surplus : 0;
}

function buildGapStatement(bottleneck: BottleneckCode, input: SurveyInput): string {
  const surplus = surplusKrw(input);

  switch (bottleneck) {
    case "cash_flow_deficit": {
      const yearlyDeficit = Math.abs(surplus) * 12;
      return `지금 흐름이 그대로면, 1년 뒤 ${fmt(yearlyDeficit)}만큼 마이너스가 쌓입니다.`;
    }
    case "emergency_fund_shortage": {
      const targetKrw = 3 * input.monthlyFixedCostKrw;
      const currentKrw = (EMERGENCY_FUND_MONTHS[input.emergencyFund] ?? 0) * input.monthlyFixedCostKrw;
      const rate = monthlySavingCapacity(input);
      const remaining = targetKrw - currentKrw;
      if (remaining <= 0) return "비상자금 3개월 치는 이미 채워져 있는 수준입니다.";
      if (rate <= 0) return "지금 저축 여력으로는 비상자금을 채울 속도 자체를 계산하기 어렵습니다.";
      const months = Math.ceil(remaining / rate);
      return `지금 저축 속도라면, 비상자금 3개월 치를 채우는 데 ${months}개월이 걸립니다.`;
    }
    case "income_interruption_risk": {
      const months = EMERGENCY_FUND_MONTHS[input.emergencyFund] ?? 0;
      return `지금 비상자금 수준이면, 소득이 끊겨도 버틸 수 있는 기간은 약 ${months}개월입니다.`;
    }
    case "high_interest_debt": {
      const monthly = input.debtMonthlyPayment ? DEBT_PAYMENT_MONTHLY_KRW[input.debtMonthlyPayment] : undefined;
      if (!monthly) return "지금 잉여금 기준으로 1년을 환산하면 " + fmt(surplus * 12) + "입니다.";
      return `지금 상환 규모라면, 1년 동안 빚에 들어가는 돈이 약 ${fmt(monthly * 12)}입니다.`;
    }
    case "near_future_funds_shortfall": {
      const target = input.futureEventAmount ? FUTURE_EVENT_AMOUNT_KRW[input.futureEventAmount] : undefined;
      const fraction = input.futureEventPrepared ? FUTURE_EVENT_PREPARED_FRACTION[input.futureEventPrepared] : undefined;
      if (target === undefined || fraction === undefined) return `지금 잉여금 기준으로 1년을 환산하면 ${fmt(surplus * 12)}입니다.`;
      const currentKrw = target * fraction;
      const rate = monthlySavingCapacity(input);
      const remaining = target - currentKrw;
      if (remaining <= 0) return "필요한 금액은 이미 준비된 수준입니다.";
      if (rate <= 0) return "지금 저축 여력으로는 필요한 금액을 채울 속도 자체를 계산하기 어렵습니다.";
      const months = Math.ceil(remaining / rate);
      return `지금 저축 속도라면, 필요한 금액을 채우는 데 약 ${months}개월이 걸립니다.`;
    }
    default: {
      // 전용 계산식이 없는 병목(사업자금혼합/카드의존/지출파악못함/저축시스템없음/
      // 장기목표속도/투자효율) — 지어내지 않고 잉여금 연환산이라는 같은 축의
      // 공통 격차로 대체한다.
      const yearly = surplus * 12;
      return yearly >= 0
        ? `지금 잉여금 흐름이 그대로면, 1년 뒤 ${fmt(yearly)}이 모입니다.`
        : `지금 흐름이 그대로면, 1년 뒤 ${fmt(Math.abs(yearly))}만큼 마이너스가 쌓입니다.`;
    }
  }
}

export function buildAnalysisResult(input: SurveyInput): AnalysisResult {
  const bottleneck = detectBottleneck(input);
  const copy = BOTTLENECK_COPY[bottleneck];
  return {
    bottleneck,
    headline: `지금 가장 먼저 봐야 할 건 ${copy.title}입니다.`,
    why: copy.why,
    lifeMeaning: copy.lifeMeaning,
    notUrgent: copy.notUrgent,
    notUrgentReason: copy.notUrgentReason,
    surplusKrw: surplusKrw(input),
    gapStatement: buildGapStatement(bottleneck, input),
  };
}
