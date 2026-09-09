// interpretation-engine.ts와 동일한 패턴(facts -> prompt -> Claude 또는 mock
// -> 검증). 사주 단독 해석과 스키마/모델 호출 방식이 달라 별도 파일로 둔다.

import type { MoneyTendency } from "@/lib/money-tendency";
import type { PalmFacts } from "@/lib/palm-facts";
import {
  CROSS_INTERPRETATION_SYSTEM_PROMPT,
  buildCrossInterpretationUserPrompt,
} from "@/lib/cross-interpretation-prompt";
import { validateCrossInterpretation, type CrossInterpretation } from "@/lib/cross-interpretation-schema";
import { buildMockCrossInterpretation } from "@/lib/cross-interpretation-mock";

export interface CrossInterpretationResult {
  source: "llm" | "mock";
  interpretation: CrossInterpretation;
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
        max_tokens: 800,
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

export async function getCrossInterpretation(
  sajuSummaryText: string,
  tendency: MoneyTendency,
  palm: PalmFacts,
  options?: { timeoutMs?: number },
): Promise<CrossInterpretationResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const userPrompt = buildCrossInterpretationUserPrompt(sajuSummaryText, palm);

  let raw: unknown = null;
  let fallbackReason: string | undefined;

  try {
    raw = await callClaude(CROSS_INTERPRETATION_SYSTEM_PROMPT, userPrompt, timeoutMs);
    if (!raw) fallbackReason = "no-api-key";
  } catch (err) {
    raw = null;
    fallbackReason = err instanceof Error ? err.message : String(err);
  }

  if (raw) {
    const validation = validateCrossInterpretation(raw);
    if (validation.ok && validation.data) {
      return { source: "llm", interpretation: validation.data };
    }
    fallbackReason = `validation-failed: ${validation.violations.join("; ")}`;
  }

  return {
    source: "mock",
    interpretation: buildMockCrossInterpretation(tendency, palm),
    fallbackReason,
  };
}
