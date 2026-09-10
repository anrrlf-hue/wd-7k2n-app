// 이 프로젝트엔 기존 analytics/event tracking이 없었다(확인 후 신설).
// 이번 라운드의 목적은 Analytics 플랫폼 도입이 아니라서 외부 SaaS는 붙이지
// 않는다 — 대신 나중에 실제 provider(예: PostHog, GA)를 한 곳에서 연결할
// 수 있도록 아주 작은 인터페이스만 만든다. 지금은 개발 중 확인용으로
// console.debug만 한다.

export type ConversionEvent =
  | "free_report_completed"
  | "fortune_map_viewed"
  | "fortune_interest_selected"
  | "mini_reading_viewed"
  | "deeper_cta_clicked"
  | "paywall_viewed";

export function track(event: ConversionEvent, props?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[track] ${event}`, props ?? {});
  }
  // 실제 provider 연결 지점 — 나중에 여기 한 줄만 추가하면 된다.
}
