import { NextResponse } from "next/server";
import { z } from "zod";
import { palmFactsSchema } from "@/lib/palm-input-schema";
import { normalizePalmFactsObservation, type PalmFacts } from "@/lib/palm-facts";
import { computeSajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { buildPremiumReport } from "@/lib/premium-report";
import { SAJU_FOCUS_VALUES } from "@/lib/saju-focus";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { issuePremiumTrial, verifyPremiumTrial } from "@/lib/premium-trial";

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  focus: z.enum(SAJU_FOCUS_VALUES).optional(),
  mbti: z.enum(MBTI_TYPES).nullable().optional(),
  leftPalmFacts: palmFactsSchema.nullable().optional(),
  rightPalmFacts: palmFactsSchema.nullable().optional(),
  dominantHand: z.enum(["left", "right"]).nullable().optional(),
});

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const input = { ...parsed.data, focus: parsed.data.focus ?? "overall", mbti: parsed.data.mbti ?? null,
      leftPalmFacts: parsed.data.leftPalmFacts ?? null, rightPalmFacts: parsed.data.rightPalmFacts ?? null,
      dominantHand: parsed.data.dominantHand ?? null };
    if (raw.trialAction === "participate") {
      if (raw.participation !== "native_share" && raw.participation !== "clipboard") {
        return NextResponse.json({ error: "공유 완료 또는 링크 복사 성공 후 참여할 수 있어요." }, { status: 400 });
      }
      return NextResponse.json({ eligible: true, trialReceipt: issuePremiumTrial(input, raw.participation) }, { headers: { "Cache-Control": "no-store" } });
    }
    const receipt = verifyPremiumTrial(input, raw.trialReceipt);
    if (!receipt) return NextResponse.json({ eligible: false, error: "링크 공유 또는 복사로 이벤트에 참여한 뒤 이 풀이를 무료로 체험할 수 있어요." }, { status: 403 });
    if (raw.trialAction === "verify") return NextResponse.json({ eligible: true, participation: receipt.participation }, { headers: { "Cache-Control": "no-store" } });
    if (raw.trialAction !== undefined) return NextResponse.json({ error: "요청을 확인하지 못했어요." }, { status: 400 });
    const shallow = computeSajuFacts(parsed.data);
    const facts = parsed.data.hour === null ? shallow : enrichSajuFacts(shallow, parsed.data);
    const report = buildPremiumReport({ facts,
      leftPalm: parsed.data.leftPalmFacts ? normalizePalmFactsObservation(parsed.data.leftPalmFacts as PalmFacts) : null,
      rightPalm: parsed.data.rightPalmFacts ? normalizePalmFactsObservation(parsed.data.rightPalmFacts as PalmFacts) : null,
      dominantHand: parsed.data.dominantHand });

    return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "Premium trial signing key unavailable") {
      console.error("premium trial configuration unavailable");
      return NextResponse.json({ error: "무료 체험 참여 확인을 준비하지 못했어요. 잠시 후 다시 시도해주세요." }, { status: 503 });
    }
    console.error("premium report failed:", error);
    return NextResponse.json(
      { error: "프리미엄 리포트를 만들지 못했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
