import { acceptAnalytics } from "@/lib/analytics-ingest";

export async function POST(request: Request) {
  return acceptAnalytics(request, {
    enabled: process.env.SAJU_ANALYTICS_ENABLED,
    realm: process.env.SAJU_ANALYTICS_REALM,
  }, event => console.info("[product-event-v2]", JSON.stringify(event)));
}
