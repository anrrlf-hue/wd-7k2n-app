import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts } from "@/lib/saju-facts";
import { scoreBig5 } from "@/lib/big5-facts";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { buildPersonalityAddendum } from "@/lib/personality-reconcile";

// 짧은 Big5 자기보고 + MBTI 자기선택을 사주와 "비교"만 하는 선택적 부가
// 엔드포인트. 사주 결과 자체를 바꾸지 않는다 — 이 라우트가 실패해도
// 무료 사주/손금 핵심 결과에는 전혀 영향이 없다(완전히 독립적인 부가 기능).

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  big5Answers: z.record(z.string(), z.number().min(1).max(5)),
  mbti: z.union([z.enum(MBTI_TYPES), z.literal("모름")]),
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
    const big5 = scoreBig5(parsed.data.big5Answers);
    const mbti = parsed.data.mbti === "모름" ? ({ type: "모름" } as const) : { type: parsed.data.mbti };
    const addendum = buildPersonalityAddendum(facts, big5, mbti);

    return NextResponse.json({ big5, addendum });
  } catch (err) {
    return NextResponse.json(
      { error: "비교 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
