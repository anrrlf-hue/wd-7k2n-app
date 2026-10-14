import { cookies } from "next/headers";
import { createAnonymousSessionId, isReferralSession, REFERRAL_MAX_AGE_SECONDS, REFERRAL_SESSION_COOKIE } from "@/lib/referral";

export async function getReferralSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(REFERRAL_SESSION_COOKIE)?.value;
  const valid = isReferralSession(existing);
  return { cookieStore, existing, valid, sessionId: valid ? existing : createAnonymousSessionId() };
}

export function setReferralSessionCookie(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => void } }, sessionId: string, valid: boolean) {
  if (!valid) response.cookies.set(REFERRAL_SESSION_COOKIE, sessionId, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REFERRAL_MAX_AGE_SECONDS,
  });
}
