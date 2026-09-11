// interpretation-engine.ts와 동일한 패턴(facts -> prompt -> Claude 또는 mock
// -> 검증). 무료 사주 V2 17섹션 전용. 이 함수도 절대 throw하지 않는다.
//
// 손금(onnxLines)은 이 함수를 거치지 않는다 — 손금 자체 해석(일치/차이
// 비교)은 triple-compare.ts에서, 손금까지 엮은 종합판정은
// real-world-personalization.ts의 buildComprehensiveVerdict에서 각각
// 다룬다(호출부: api/palm/interpret/route.ts). personality(MBTI+6문항)는
// realWorldPersonalization 한 문단으로만 반영한다.

import type { SajuFacts } from "@/lib/saju-facts";
import type { PersonalityInput } from "@/lib/personality-check";
import { FREE_SAJU_REPORT_SYSTEM_PROMPT, buildFreeSajuReportUserPrompt } from "@/lib/free-report-prompt";
import { validateFreeSajuReport, type FreeSajuReport } from "@/lib/free-report-schema";
import { buildFreeSajuReport } from "@/lib/free-report-mock";

export interface FreeSajuReportResult {
  source: "llm" | "mock";
  report: FreeSajuReport;
  fallbackReason?: string;
}

const DEFAULT_TIMEOUT_MS = 9000;

async function callClaude(systemPrompt: string, userPrompt: string, timeoutMs: number): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾지 못했습니다.");
    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timer);
  }
}

export async function getFreeSajuReport(
  facts: SajuFacts,
  options?: { timeoutMs?: number; personality?: PersonalityInput },
): Promise<FreeSajuReportResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userPrompt = buildFreeSajuReportUserPrompt(facts, options?.personality);

  let raw: unknown = null;
  let fallbackReason: string | undefined;

  try {
    raw = await callClaude(FREE_SAJU_REPORT_SYSTEM_PROMPT, userPrompt, timeoutMs);
    if (!raw) fallbackReason = "no-api-key";
  } catch (err) {
    raw = null;
    fallbackReason = err instanceof Error ? err.message : String(err);
  }

  if (raw) {
    const validation = validateFreeSajuReport(raw);
    if (validation.ok && validation.data) {
      return { source: "llm", report: validation.data };
    }
    fallbackReason = `validation-failed: ${validation.violations.join("; ")}`;
  }

  return {
    source: "mock",
    report: buildFreeSajuReport(facts, options?.personality),
    fallbackReason,
  };
}
