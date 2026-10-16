import { NextResponse } from "next/server";
import { z } from "zod";
import { palmFactsSchema } from "@/lib/palm-input-schema";
import { normalizePalmFactsObservation, type PalmFacts } from "@/lib/palm-facts";
import { computeSajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { buildPremiumReport } from "@/lib/premium-report";
import { buildFreeSajuReport } from "@/lib/free-report-mock";
import { SAJU_FOCUS_VALUES } from "@/lib/saju-focus";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { issuePremiumTrial, verifyPremiumTrial } from "@/lib/premium-trial";
import { cookies } from "next/headers";
import { createAnonymousSessionId, REFERRAL_MAX_AGE_SECONDS, REFERRAL_SESSION_COOKIE, isReferralSession } from "@/lib/referral";
import { getReferralRewardStatus, isReferralStoreConfigured } from "@/lib/referral-store";

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
    const cookieStore = await cookies();
    const existingSession = cookieStore.get(REFERRAL_SESSION_COOKIE)?.value;
    const validExisting = isReferralSession(existingSession);
    const sessionId = validExisting ? existingSession : createAnonymousSessionId();
    const responseHeaders = { "Cache-Control": "no-store" };
    const finish = (response: NextResponse) => {
      if (!validExisting) response.cookies.set(REFERRAL_SESSION_COOKIE, sessionId, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REFERRAL_MAX_AGE_SECONDS,
      });
      return response;
    };
    if (raw.trialAction === "participate") {
      return finish(NextResponse.json({ error: "공유창 완료나 복사만으로는 무료 체험을 열 수 없어요. 상대방의 무료 풀이 완료가 필요합니다." }, { status: 400, headers: responseHeaders }));
    }
    if (raw.trialAction === "verify") {
      const reward = isReferralStoreConfigured() ? await getReferralRewardStatus(sessionId) : { kind: "unavailable" as const };
      if (reward.kind === "unavailable") {
        return finish(NextResponse.json({ eligible: false, status: "unavailable", error: "공유 이벤트 저장소를 사용할 수 없어 확인하지 못했어요." }, { status: 503, headers: responseHeaders }));
      }
      if (reward.kind === "pending") {
        return finish(NextResponse.json({ eligible: false, status: "pending", error: "공유 링크를 연 사람이 무료 풀이를 완료한 뒤 무료 체험을 열 수 있어요." }, { status: 403, headers: responseHeaders }));
      }
      return finish(NextResponse.json({ eligible: true, trialReceipt: issuePremiumTrial(input) }, { headers: responseHeaders }));
    }
    // A receipt alone is never sufficient: every premium generation rechecks
    // the persisted inviter reward, so old/browser-forged receipts cannot bypass it.
    const reward = isReferralStoreConfigured() ? await getReferralRewardStatus(sessionId) : { kind: "unavailable" as const };
    if (reward.kind === "unavailable") {
      return finish(NextResponse.json({ eligible: false, status: "unavailable", error: "공유 이벤트 저장소를 사용할 수 없어 확인하지 못했어요." }, { status: 503, headers: responseHeaders }));
    }
    if (reward.kind === "pending") {
      return finish(NextResponse.json({ eligible: false, status: "pending", error: "공유 링크를 연 사람이 무료 풀이를 완료한 뒤 무료 체험을 열 수 있어요." }, { status: 403, headers: responseHeaders }));
    }
    const receipt = verifyPremiumTrial(input, raw.trialReceipt);
    if (!receipt) return finish(NextResponse.json({ eligible: false, error: "공유 링크를 연 사람이 무료 풀이를 완료한 뒤 무료 체험을 열 수 있어요." }, { status: 403, headers: responseHeaders }));
    if (raw.trialAction !== undefined) return NextResponse.json({ error: "요청을 확인하지 못했어요." }, { status: 400 });
    const shallow = computeSajuFacts(parsed.data);
    const facts = parsed.data.hour === null ? shallow : enrichSajuFacts(shallow, parsed.data);
    const report = buildPremiumReport({ facts, freeReport: buildFreeSajuReport(facts),
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
