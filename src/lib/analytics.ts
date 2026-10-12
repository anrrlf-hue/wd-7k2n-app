import { ANALYTICS_PATHS, type ConversionEvent, type EventProps } from "@/lib/analytics-contract";
export { CONVERSION_EVENTS, type ConversionEvent } from "@/lib/analytics-contract";

const SESSION_KEY = "saju-app:analytics-session:v2";
const IDLE_MS = 30 * 60 * 1000;
type Session = { id: string; lastAt: number; readingId: string | null; completed: boolean };

function id(): string { return crypto.randomUUID(); }

function propsOnly(props: Record<string, unknown>): EventProps {
  const safe: EventProps = {};
  if (props.flow === "saju" || props.flow === "palm") safe.flow = props.flow;
  if (props.mode === "detail_focus" || props.mode === "premium_annual") safe.mode = props.mode;
  if (typeof props.palmSkipped === "boolean") safe.palmSkipped = props.palmSkipped;
  if (typeof props.bilateral === "boolean") safe.bilateral = props.bilateral;
  return safe;
}

export function track(event: ConversionEvent, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined" || process.env.NEXT_PUBLIC_SAJU_ANALYTICS_ENABLED !== "true") return;
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(SESSION_KEY);
    let session: Session | null = raw ? JSON.parse(raw) : null;
    if (!session || typeof session.id !== "string" || !Number.isFinite(session.lastAt) ||
        now - session.lastAt >= IDLE_MS || session.lastAt > now) {
      session = { id: id(), lastAt: now, readingId: null, completed: false };
    }
    // Both hands and retries belong to one reading. A new finished reading starts a new ID.
    if (event === "reading_started" && (!session.readingId || session.completed)) {
      session.readingId = id();
      session.completed = false;
    }
    if (event === "free_report_completed") session.completed = true;
    session.lastAt = now;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    const pathname = window.location.pathname;
    const path = ANALYTICS_PATHS.find(value => value === pathname) ?? "/other";
    const body = JSON.stringify({
      event, eventId: id(), sessionId: session.id, readingId: session.readingId,
      path, props: propsOnly(props),
    });
    if (navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/analytics", {
      method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Disabled/unavailable storage or transport must never interrupt the reading.
  }
}
