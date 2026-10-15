import { createHash, randomBytes } from "node:crypto";
import { PUBLIC_SERVICE_ORIGIN } from "@/lib/relationship-share";

export const REFERRAL_CAMPAIGN = "premium-referral-v1";
export const REFERRAL_QUERY_PARAM = "ref";
export const REFERRAL_SESSION_COOKIE = "saju_referral_session";
export const REFERRAL_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const REFERRAL_TOKEN_MAX_AGE_MS = REFERRAL_MAX_AGE_SECONDS * 1000;

export type ReferralRealm = "test" | "live";

export function isReferralEnabled(): boolean {
  return process.env.SAJU_REFERRAL_ENABLED === "true";
}

export function getReferralRealm(): ReferralRealm | null {
  const value = process.env.SAJU_REFERRAL_REALM;
  return value === "test" || value === "live" ? value : null;
}

export function getReferralPublicOrigin(): string | null {
  if (!isReferralEnabled()) return null;
  const realm = getReferralRealm();
  const candidate = realm === "live" ? PUBLIC_SERVICE_ORIGIN : process.env.SAJU_REFERRAL_PUBLIC_ORIGIN;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return null;
  }
}

export function createOpaqueReferralToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createAnonymousSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export function hashReferralValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function isReferralToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function isReferralSession(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function referralExpiry(now = Date.now()): string {
  return new Date(now + REFERRAL_TOKEN_MAX_AGE_MS).toISOString();
}
