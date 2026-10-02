import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts, type SajuFactsInput } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import {
  PERSON_COMPARE_PURPOSES,
  buildPersonCompareResult,
} from "@/lib/person-compare";

const birthSchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
});

const bodySchema = z.object({
  meName: z.string().trim().max(20).optional(),
  otherName: z.string().trim().max(20).optional(),
  purpose: z.enum(PERSON_COMPARE_PURPOSES),
  me: birthSchema,
  other: birthSchema,
});

function buildFacts(input: SajuFactsInput) {
  const shallow = computeSajuFacts(input);
  return input.hour === null ? shallow : enrichSajuFacts(shallow, input);
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "두 사람의 사주 입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const [meFacts, otherFacts] = [
      buildFacts(parsed.data.me),
      buildFacts(parsed.data.other),
    ];

    const result = buildPersonCompareResult(
      { name: parsed.data.meName || "나", facts: meFacts },
      { name: parsed.data.otherName || "상대", facts: otherFacts },
      parsed.data.purpose,
    );

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "두 사람의 사주를 비교하는 중 문제가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
