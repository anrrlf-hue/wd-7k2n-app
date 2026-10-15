let sessionBootstrap: Promise<void> | null = null;
export const REFERRAL_CLIENT_TIMEOUT_MS = 10_000;

export async function fetchReferralRequest(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFERRAL_CLIENT_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function ensureReferralSession(): Promise<void> {
  if (!sessionBootstrap) {
    sessionBootstrap = fetchReferralRequest("/api/referrals/session", { method: "POST", headers: { "Cache-Control": "no-store" } })
      .then(response => {
        if (!response.ok) {
          const error = new Error("Referral session unavailable") as Error & { status?: string };
          error.status = "unavailable";
          throw error;
        }
      })
      .catch(error => {
        sessionBootstrap = null;
        if (error && typeof error === "object" && "status" in error) throw error;
        const unavailable = new Error("Referral session unavailable") as Error & { status?: string };
        unavailable.status = "unavailable";
        throw unavailable;
      });
  }
  return sessionBootstrap;
}
