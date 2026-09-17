// 이 프로젝트엔 기존 analytics/event tracking이 없었다(확인 후 신설).
// 이번 라운드의 목적은 Analytics 플랫폼 도입이 아니라서 외부 SaaS는 붙이지
// 않는다 — 대신 나중에 실제 provider(예: PostHog, GA)를 한 곳에서 연결할
// 수 있도록 아주 작은 인터페이스만 만든다. 지금은 개발 중 확인용으로
// console.debug만 한다.

// 퍼널 6단계(§8-7): 무료진단 완료 -> 간접체험 완료 -> 설문 완료 -> 분석결과
// 화면 도달 -> 결제 버튼 클릭 -> 결제 완료. 앞 4개는 이미 커버돼 있었고
// (free_report_completed/indirect_experience_completed/survey_completed/
// analysis_result_viewed), payment_cta_clicked만 이번에 추가했다.
// payment_completed는 타입만 정의해둔다 — 실제 결제 게이트웨이가 없어서
// 지금은 이 이벤트를 발생시키는 곳이 없다(결제 성공 콜백이 생기면 그때 호출).
export type ConversionEvent =
  | "free_report_completed"
  | "indirect_experience_started"
  | "indirect_experience_completed"
  | "survey_completed"
  | "analysis_result_viewed"
  | "payment_screen_viewed"
  | "payment_cta_clicked"
  | "payment_completed";

export function track(event: ConversionEvent, props?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.debug(`[track] ${event}`, props ?? {});
  }
  // 실제 provider 연결 지점 — 나중에 여기 한 줄만 추가하면 된다.
}
