import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FREE_SHARE_ENTRY_PATH } from "@/lib/relationship-share";
import { createAnonymousSessionId, createOpaqueReferralToken, getReferralPublicOrigin, getReferralRealm, REFERRAL_MAX_AGE_SECONDS, REFERRAL_QUERY_PARAM, REFERRAL_SESSION_COOKIE, referralExpiry, isReferralSession } from "@/lib/referral";
import { createReferralInvite, isReferralStoreConfigured, validateReferralInvite } from "@/lib/referral-store";
import { getReferralSession, setReferralSessionCookie } from "@/lib/referral-session";
import { isReferralToken } from "@/lib/referral";

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

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get(REFERRAL_QUERY_PARAM);
  const session = await getReferralSession();
  const responseHeaders = { "Cache-Control": "no-store" };
  if (!isReferralToken(token)) {
    const response = NextResponse.json({ status: "invalid" }, { status: 400, headers: responseHeaders });
    setReferralSessionCookie(response, session.sessionId, session.valid);
    return response;
  }
  const result = await validateReferralInvite({ token, inviterSessionId: session.sessionId });
  const response = result === "unavailable"
    ? NextResponse.json({ status: "unavailable" }, { status: 503, headers: responseHeaders })
    : NextResponse.json({ status: result }, { status: result === "valid" ? 200 : 410, headers: responseHeaders });
  setReferralSessionCookie(response, session.sessionId, session.valid);
  return response;
}
