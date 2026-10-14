let sessionBootstrap: Promise<void> | null = null;

export function ensureReferralSession(): Promise<void> {
  if (!sessionBootstrap) {
    sessionBootstrap = fetch("/api/referrals/session", { method: "POST", headers: { "Cache-Control": "no-store" } })
      .then(response => { if (!response.ok) throw new Error("Referral session unavailable"); })
      .catch(error => { sessionBootstrap = null; throw error; });
  }
  return sessionBootstrap;
}
