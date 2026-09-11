import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { buildConnectionDiagnosis } from "@/lib/connection-diagnosis";
import { MBTI_TYPES } from "@/lib/mbti-facts";

// 결제 직전 다리의 세 번째 단계 전용 엔드포인트. 손금 이미지는 필요 없다 —
// 사주 방향(SajuFacts)과 방금 받은 현실정보(RealityInput)만 있으면 된다.
// 이 라우트는 1차 연결진단까지만 만든다 — 결제 이후 실제 실행 리포트
// 생성 로직은 이번 라운드 범위 밖이라 여기서 다루지 않는다.

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  personalityAnswers: z.record(z.string(), z.number().min(1).max(5)).optional(),
  mbti: z.enum(MBTI_TYPES).optional(),
  reality: z.object({
    jobType: z.string().min(1),
    incomeRange: z.string().min(1),
    expenseLevel: z.string().min(1),
    savings: z.string().min(1),
    debt: z.string().min(1),
    mainConcern: z.string().min(1),
    considering: z.string().min(1),
  }),
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
    const facts = enrichSajuFacts(computeSajuFacts(parsed.data), parsed.data);
    const diagnosis = buildConnectionDiagnosis(facts, parsed.data.reality);
    return NextResponse.json({ diagnosis });
  } catch (err) {
    return NextResponse.json(
      { error: "진단 생성 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
