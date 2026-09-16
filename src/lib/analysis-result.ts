// 분석 결과 조립 — 병목 판정(bottleneck-engine.ts) + 카피(analysis-result-copy.ts)
// + 코드로 계산한 근거 숫자(surplusKrw)를 합친다. 숫자는 전부 코드 계산,
// AI/추측 없음.

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
  surplusKrw: number;
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
    surplusKrw: surplusKrw(input),
  };
}
