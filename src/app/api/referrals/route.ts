import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FREE_SHARE_ENTRY_PATH } from "@/lib/relationship-share";
import { createAnonymousSessionId, createOpaqueReferralToken, getReferralPublicOrigin, getReferralRealm, REFERRAL_MAX_AGE_SECONDS, REFERRAL_QUERY_PARAM, REFERRAL_SESSION_COOKIE, referralExpiry, isReferralSession } from "@/lib/referral";
import { createReferralInvite, isReferralStoreConfigured } from "@/lib/referral-store";

export async function POST() {
  const realm = getReferralRealm();
  const origin = getReferralPublicOrigin();
  if (!isReferralStoreConfigured() || !realm || !origin) return NextResponse.json({ error: "공유 이벤트를 준비하지 못했어요." }, { status: 503 });
  const cookieStore = await cookies();
  const existing = cookieStore.get(REFERRAL_SESSION_COOKIE)?.value;
  const validExisting = isReferralSession(existing);
  const sessionId = validExisting ? existing : createAnonymousSessionId();
  const token = createOpaqueReferralToken();
  const created = await createReferralInvite({ token, inviterSessionId: sessionId, expiresAt: referralExpiry() });
  if (!created) return NextResponse.json({ error: "공유 이벤트를 준비하지 못했어요." }, { status: 503 });
  const url = new URL(FREE_SHARE_ENTRY_PATH, origin);
  url.searchParams.set(REFERRAL_QUERY_PARAM, token);
  const response = NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "no-store" } });
  if (!validExisting) response.cookies.set(REFERRAL_SESSION_COOKIE, sessionId, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REFERRAL_MAX_AGE_SECONDS,
  });
  return response;
}
