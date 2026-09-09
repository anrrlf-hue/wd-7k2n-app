import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnoseSaju } from "@/lib/saju";

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const diagnosis = diagnoseSaju(parsed.data);
    return NextResponse.json(diagnosis);
  } catch {
    return NextResponse.json(
      { error: "사주 계산 중 문제가 발생했습니다." },
      { status: 500 },
    );
  }
}
