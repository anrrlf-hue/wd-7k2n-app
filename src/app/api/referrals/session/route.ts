import { NextResponse } from "next/server";
import { getReferralSession, setReferralSessionCookie } from "@/lib/referral-session";

export async function POST() {
  const session = await getReferralSession();
  const response = NextResponse.json({ ready: true }, { headers: { "Cache-Control": "no-store" } });
  setReferralSessionCookie(response, session.sessionId, session.valid);
  return response;
}
