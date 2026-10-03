export const CONVERSION_EVENTS = [
  "free_report_completed",
  "indirect_experience_started",
  "indirect_experience_completed",
  "finance_bridge_started",
  "survey_completed",
  "analysis_result_viewed",
  "reality_answer_started",
  "reality_answer_preview_viewed",
  "reality_answer_full_preview_viewed",
  "question_answer_viewed",
  "relationship_compare_started",
  "relationship_compare_completed",
  "relationship_followup_opened",
  "relationship_share_created",
  "relationship_share_opened",
  "relationship_shared_followup_opened",
  "relationship_recipient_cta_clicked",
  "payment_screen_viewed",
  "payment_cta_clicked",
  "payment_completed",
] as const;

export type ConversionEvent = (typeof CONVERSION_EVENTS)[number];

const SESSION_KEY = "saju-app:analytics-session:v1";

function anonymousSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return null;
  }
}

export function track(event: ConversionEvent, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    sessionId: anonymousSessionId(),
    path: window.location.pathname,
    props: props ?? {},
  };

  if (process.env.NODE_ENV !== "production") {
    console.debug(`[track] ${event}`, payload);
  }

  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fetch fallback below
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
