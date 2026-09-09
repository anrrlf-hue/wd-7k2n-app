// facts -> prompt -> (Claude 또는 mock) -> 스키마/금지표현 검증까지의
// 전체 해석 파이프라인. /api/saju(실제 결과 화면용)와
// /api/saju/interpret(단독 테스트/디버그용) 둘 다 이 엔진을 공유한다.
// 이 함수는 절대 throw하지 않는다 — 어떤 실패든 mock으로 떨어져서
// "API 오류 시 화면 전체 실패 금지" 요구를 만족시킨다.

import type { SajuFacts } from "@/lib/saju-facts";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "@/lib/interpretation-prompt";
import { validateInterpretation, type Interpretation } from "@/lib/interpretation-schema";
import { buildMockInterpretation } from "@/lib/interpretation-mock";

export interface InterpretationResult {
  source: "llm" | "mock";
  interpretation: Interpretation;
  /** llm 호출이 실패/타임아웃/검증실패로 mock에 떨어진 경우의 사유 (로그/디버그용, 사용자 노출 안 함) */
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
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Claude API error: ${res.status}`);
    }

    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾지 못했습니다.");
    return JSON.parse(jsonMatch[0]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 딥 해석을 시도한다. 키 없음 / 네트워크 실패 / 타임아웃 / 스키마 검증 실패 /
 * 금지표현 검출 중 무엇이 일어나도 결정론적 mock으로 안전하게 떨어진다.
 */
export async function getInterpretation(
  facts: SajuFacts,
  options?: { timeoutMs?: number },
): Promise<InterpretationResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userPrompt = buildInterpretationUserPrompt(facts);

  let raw: unknown = null;
  let fallbackReason: string | undefined;

  try {
    raw = await callClaude(INTERPRETATION_SYSTEM_PROMPT, userPrompt, timeoutMs);
    if (!raw) fallbackReason = "no-api-key";
  } catch (err) {
    raw = null;
    fallbackReason = err instanceof Error ? err.message : String(err);
  }

  if (raw) {
    const validation = validateInterpretation(raw);
    if (validation.ok && validation.data) {
      return { source: "llm", interpretation: validation.data };
    }
    fallbackReason = `validation-failed: ${validation.violations.join("; ")}`;
  }

  return {
    source: "mock",
    interpretation: buildMockInterpretation(facts),
    fallbackReason,
  };
}
