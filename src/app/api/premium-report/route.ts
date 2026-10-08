import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { buildFreeSajuReport } from "@/lib/free-report-mock";
import { buildPremiumReport } from "@/lib/premium-report";
import type { PalmFacts } from "@/lib/palm-facts";

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  mbti: z.string().nullable().optional(),
  leftPalmFacts: z.unknown().nullable().optional(),
  rightPalmFacts: z.unknown().nullable().optional(),
  dominantHand: z.enum(["left", "right"]).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const shallow = computeSajuFacts(parsed.data);
    const facts = parsed.data.hour === null ? shallow : enrichSajuFacts(shallow, parsed.data);
    const freeReport = buildFreeSajuReport(facts, {
      mbti: parsed.data.mbti ?? null,
      check: null,
    });

    const report = buildPremiumReport({
      facts,
      freeReport,
      leftPalm: (parsed.data.leftPalmFacts as PalmFacts | null | undefined) ?? null,
      rightPalm: (parsed.data.rightPalmFacts as PalmFacts | null | undefined) ?? null,
      dominantHand: parsed.data.dominantHand ?? null,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("premium report failed:", error);
    return NextResponse.json(
      { error: "프리미엄 리포트를 만들지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
