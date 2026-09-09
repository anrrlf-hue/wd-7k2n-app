import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts } from "@/lib/saju-facts";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "@/lib/interpretation-prompt";
import { validateInterpretation } from "@/lib/interpretation-schema";
import { buildMockInterpretation } from "@/lib/interpretation-mock";

// 파이프라인: 입력 -> 사주 계산(ssaju) -> 구조화 SajuFacts -> 프롬프트
// -> (ANTHROPIC_API_KEY 있으면 Claude 호출 / 없으면 결정론적 mock)
// -> 스키마+금지표현 검증 -> 응답.
// LLM은 SajuFacts 바깥의 사실을 추측하지 않는다(프롬프트에 명시).

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
});

async function callClaude(systemPrompt: string, userPrompt: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

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
  });

  if (!res.ok) {
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(jsonMatch[0]);
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const facts = computeSajuFacts(parsed.data);
    const userPrompt = buildInterpretationUserPrompt(facts);

    let raw: unknown;
    let source: "llm" | "mock";
    try {
      raw = await callClaude(INTERPRETATION_SYSTEM_PROMPT, userPrompt);
      source = raw ? "llm" : "mock";
    } catch {
      raw = null;
      source = "mock";
    }

    if (!raw) {
      raw = buildMockInterpretation(facts);
    }

    const validation = validateInterpretation(raw);
    if (!validation.ok || !validation.data) {
      return NextResponse.json(
        { error: "해석 결과가 검증을 통과하지 못했습니다.", violations: validation.violations, source },
        { status: 502 },
      );
    }

    return NextResponse.json({
      source,
      facts,
      prompt: { system: INTERPRETATION_SYSTEM_PROMPT, user: userPrompt },
      interpretation: validation.data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "해석 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
