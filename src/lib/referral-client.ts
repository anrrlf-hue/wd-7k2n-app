let sessionBootstrap: Promise<void> | null = null;

export function ensureReferralSession(): Promise<void> {
  if (!sessionBootstrap) {
    sessionBootstrap = fetch("/api/referrals/session", { method: "POST", headers: { "Cache-Control": "no-store" } })
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
