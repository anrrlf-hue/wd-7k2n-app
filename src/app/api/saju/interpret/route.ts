import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts } from "@/lib/saju-facts";
import { INTERPRETATION_SYSTEM_PROMPT, buildInterpretationUserPrompt } from "@/lib/interpretation-prompt";
import { getInterpretation } from "@/lib/interpretation-engine";

// 단독 테스트/디버그용 엔드포인트. 실제 화면(/diagnosis)은 이 라우트를
// 호출하지 않고 /api/saju가 같은 엔진을 내부에서 직접 호출한다
// (왕복 1회로 줄이기 위함). 여기서는 프롬프트 원문도 함께 반환해
// scripts/test-interpretation.mjs 등에서 검증할 수 있게 한다.

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
});

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
    const result = await getInterpretation(facts);

    return NextResponse.json({
      source: result.source,
      facts,
      prompt: { system: INTERPRETATION_SYSTEM_PROMPT, user: buildInterpretationUserPrompt(facts) },
      interpretation: result.interpretation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "해석 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
