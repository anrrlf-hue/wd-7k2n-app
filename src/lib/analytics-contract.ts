// No free-form content, birth data, image data, query strings or account IDs.
export const CONVERSION_EVENTS = [
  "landing_viewed", "reading_started", "free_report_completed", "result_viewed",
  "premium_report_viewed", "share_intent", "share_sheet_resolved", "share_cancelled",
  "share_failed", "link_copied", "copy_failed", "analysis_failed", "analysis_timeout",
  "analysis_cancelled", "analysis_retry",
  "indirect_experience_started", "indirect_experience_completed", "finance_bridge_started",
  "survey_completed", "analysis_result_viewed", "reality_answer_started",
  "reality_answer_preview_viewed", "reality_answer_full_preview_viewed", "question_answer_viewed",
  "relationship_compare_started", "relationship_compare_completed", "relationship_followup_opened",
  "relationship_share_created", "relationship_share_opened", "relationship_shared_followup_opened",
  "relationship_recipient_cta_clicked", "payment_screen_viewed", "payment_cta_clicked", "payment_completed",
] as const;
export type ConversionEvent = (typeof CONVERSION_EVENTS)[number];
export const ANALYTICS_PATHS = ["/", "/diagnosis", "/diagnosis/palm", "/palm", "/other"] as const;
export type EventProps = {
  flow?: "saju" | "palm";
  mode?: "detail_focus" | "premium_annual";
  palmSkipped?: boolean;
  bilateral?: boolean;
};
