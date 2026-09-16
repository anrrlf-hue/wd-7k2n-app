// "버는 힘 × 지키는 힘" 재물 유형 판정. 새 원국 계산은 하지 않는다 — 이미
// computeSajuFacts가 계산한 5개 십성 개수(wealthStarCount/outputStarCount/
// officerStarCount/resourceStarCount/peerStarCount)를 재조합할 뿐이다.
//
// 버는 힘 = 재성(돈 그 자체) + 식상(돈을 만드는 활동)
// 지키는 힘 = 관성(규율/통제) + 인성(비축/신중함)
// peerStarCount(비겁)는 전통적으로 "나눠 갖는" 힘이라 버는/지키는 어느 쪽
// 신호도 아니라서 두 축 어디에도 넣지 않는다 — 새 계산이 아니라 새 해석
// 규칙이라는 뜻이다.
//
// 등급은 1~5단계(sum 0→1 ... 4 이상→5), 3 이상을 "상"으로 본다(운영 문서
// 지시 그대로). 이 게이지는 무료 화면에도 "버는 힘 N / 지키는 힘 N" 형태로
// 그대로 노출된다 — 소수점 없이 정수 등급으로만.

import type { SajuFacts } from "@/lib/saju-facts";
import { WEALTH_TYPE_COPY, type WealthTypeCode, type WealthTypeCopyEntry } from "@/lib/wealth-type-copy";

export interface WealthPowerGauge {
  sum: number;
  level: 1 | 2 | 3 | 4 | 5;
  grade: "상" | "하";
}

export interface WealthTypePieces {
  /** 1조각: 유형명 + 한 줄 진단 */
  typeAndDiagnosis: string;
  /** 2조각: 왜 이 유형인지 — 명식 근거 + 게이지 숫자 */
  evidence: string;
  /** 3조각: 이 유형이 겪는 문제(현실 연결) */
  problem: string;
  /** 4조각: 해법 미지목, 유료1 안내 톤 */
  bridge: string;
}

export interface WealthTypeResult {
  code: WealthTypeCode;
  earning: WealthPowerGauge;
  keeping: WealthPowerGauge;
  pieces: WealthTypePieces;
}

function gauge(sum: number): WealthPowerGauge {
  const level = Math.min(5, sum + 1) as WealthPowerGauge["level"];
  return { sum, level, grade: level >= 3 ? "상" : "하" };
}

function codeFor(earningGrade: "상" | "하", keepingGrade: "상" | "하"): WealthTypeCode {
  if (earningGrade === "상" && keepingGrade === "상") return "ACCUM";
  if (earningGrade === "상" && keepingGrade === "하") return "LEAK";
  if (earningGrade === "하" && keepingGrade === "상") return "HOLD";
  return "TIGHT";
}

export function classifyWealthType(facts: SajuFacts): WealthTypeResult {
  const earning = gauge(facts.wealthStarCount + facts.outputStarCount);
  const keeping = gauge(facts.officerStarCount + facts.resourceStarCount);
  const code = codeFor(earning.grade, keeping.grade);
  const copy = WEALTH_TYPE_COPY[code];

  const pieces: WealthTypePieces = {
    typeAndDiagnosis: copy.headline,
    evidence: `${copy.reasonTemplate} 버는 힘 ${earning.level} / 지키는 힘 ${keeping.level}`,
    problem: copy.problemText,
    bridge: copy.bridgeText,
  };

  return { code, earning, keeping, pieces };
}

/** 무료 구간에서 특정 해법을 지목하면 안 된다는 원칙의 회귀 방지 가드.
 * free-report-schema.ts의 BANNED_PATTERNS 관례를 그대로 따른다 — 테스트
 * 스크립트가 4개 카피 항목 전체를 이 함수로 검사한다. */
const BANNED_SOLUTION_PATTERNS: RegExp[] = [
  /통장을?\s*나누/,
  /가계부를?\s*쓰/,
  /적금을?\s*(들|가입)/,
  /예산\s*앱/,
  /(자동이체|풍차\s*돌리기)/,
];

export function validateWealthTypeCopy(entry: WealthTypeCopyEntry): string[] {
  const fullText = [entry.headline, entry.reasonTemplate, entry.problemText, entry.bridgeText].join("\n");
  return BANNED_SOLUTION_PATTERNS.filter((re) => re.test(fullText)).map(
    (re) => `banned solution mentioned: ${re.source}`,
  );
}
