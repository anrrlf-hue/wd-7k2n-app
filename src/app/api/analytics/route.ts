import { z } from "zod";
import { CONVERSION_EVENTS } from "@/lib/analytics";

const primitive = z.union([
  z.string().max(160),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const bodySchema = z.object({
  event: z.enum(CONVERSION_EVENTS),
  sessionId: z.string().max(80).nullable().optional(),
  path: z.string().max(160).optional(),
  props: z.record(z.string(), primitive).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const props = Object.fromEntries(
    Object.entries(parsed.data.props ?? {}).slice(0, 12),
  );
  console.info(
    "[product-event]",
    JSON.stringify({
      ts: new Date().toISOString(),
      event: parsed.data.event,
      sessionId: parsed.data.sessionId ?? null,
      path: parsed.data.path ?? null,
      props,
    }),
  );

  return new Response(null, { status: 204 });
}
