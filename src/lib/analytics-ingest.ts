import { z } from "zod";
import { ANALYTICS_PATHS, CONVERSION_EVENTS } from "@/lib/analytics-contract";

const opaqueId = z.string().regex(/^[a-zA-Z0-9-]{16,80}$/);
const eventSchema = z.object({
  event: z.enum(CONVERSION_EVENTS),
  eventId: opaqueId,
  sessionId: opaqueId,
  readingId: opaqueId.nullable(),
  path: z.enum(ANALYTICS_PATHS),
  props: z.object({
    flow: z.enum(["saju", "palm"]).optional(),
    mode: z.enum(["detail_focus", "premium_annual"]).optional(),
    palmSkipped: z.boolean().optional(),
    bilateral: z.boolean().optional(),
  }).strict(),
}).strict();

export type ProductEvent = z.infer<typeof eventSchema> & {
  schema: "SAJU_EVENT_V2";
  realm: "TEST" | "LIVE";
  receivedAt: string;
};

export async function acceptAnalytics(
  request: Request,
  config: { enabled?: string; realm?: string },
  emit: (event: ProductEvent) => void,
): Promise<Response> {
  // Fail closed before reading the body or opening any log/storage sink.
  if (config.enabled !== "true" || !["TEST", "LIVE"].includes(config.realm ?? "")) {
    return new Response(null, { status: 204 });
  }
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let bytes = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      parts.push(value);
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const part of parts) { data.set(part, offset); offset += part.length; }
    const parsed = eventSchema.safeParse(JSON.parse(new TextDecoder().decode(data)));
    if (!parsed.success) return new Response(null, { status: 400 });
    emit({ ...parsed.data, schema: "SAJU_EVENT_V2", realm: config.realm as "TEST" | "LIVE", receivedAt: new Date().toISOString() });
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  } finally {
    reader.releaseLock();
  }
}
