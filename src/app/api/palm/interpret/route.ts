import { NextResponse } from "next/server";
import { z } from "zod";
import { diagnoseSaju } from "@/lib/saju";
import { computeSajuFacts, type SajuFacts } from "@/lib/saju-facts";
import { getInterpretation } from "@/lib/interpretation-engine";
import { getCrossInterpretation } from "@/lib/cross-interpretation-engine";
import { isPalmFactsUsable, type PalmFacts } from "@/lib/palm-facts";
import { scoreBig5 } from "@/lib/big5-facts";
import { MBTI_TYPES } from "@/lib/mbti-facts";

// 손금 이미지 자체는 서버로 오지 않는다 — 클라이언트에서 MediaPipe로 이미
// 분석해 만든 PalmFacts(구조화 JSON)만 받는다. 여기서는 (1) 생년월일로
// 사주를 다시 계산해 "사주 요약"을 만들고 (2) PalmFacts와 함께 교차 해석을
// 생성한다. PalmFacts가 재촬영이 필요한 상태면 해석을 만들지 않고 그 이유를
// 그대로 돌려준다("억지 해석 금지").

const palmFactsSchema = z.object({
  handSide: z.enum(["left", "right", "unknown"]),
  imageQuality: z.enum(["good", "no_hand_detected", "too_dark", "hand_cropped"]),
  handShape: z.enum(["square", "rectangular", "elongated", "slender", "unknown"]),
  majorLines: z.array(z.enum(["생명선", "감정선", "두뇌선"])),
  lineFeatures: z.array(
    z.object({
      name: z.enum(["생명선", "감정선", "두뇌선"]),
      detected: z.boolean(),
      length: z.enum(["짧음", "보통", "김"]).nullable(),
      direction: z.enum(["완만한 곡선", "직선에 가까움"]).nullable(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});

const bodySchema = z.object({
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  palmFacts: palmFactsSchema,
  big5Answers: z.record(z.string(), z.number().min(1).max(5)).optional(),
  mbti: z.enum(MBTI_TYPES).optional(),
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

  const palmFacts = parsed.data.palmFacts as PalmFacts;

  if (!isPalmFactsUsable(palmFacts)) {
    return NextResponse.json({
      usable: false,
      warnings:
        palmFacts.warnings.length > 0
          ? palmFacts.warnings
          : ["분석 신뢰도가 낮아요. 손바닥이 잘 보이도록 다시 촬영해주세요."],
    });
  }

  try {
    const shallow = diagnoseSaju(parsed.data);
    const { tendency } = shallow;

    let sajuSummaryText = `${tendency.wealthType}. ${tendency.summary} 버는 힘: ${tendency.earningPower.label}. 지키는 힘: ${tendency.keepingPower.label}. ${tendency.jobType.label}.`;
    let deepFacts: SajuFacts | null = null;

    try {
      deepFacts = computeSajuFacts(parsed.data);
      const deep = await getInterpretation(deepFacts, { timeoutMs: 7000 });
      sajuSummaryText = `${deep.interpretation.summary} ${deep.interpretation.money_style} ${deep.interpretation.earning_style}`;
    } catch {
      // 딥 사주 해석 실패 시 얕은 tendency 기반 요약을 그대로 쓴다.
    }

    const personality = {
      facts: deepFacts,
      big5: parsed.data.big5Answers ? scoreBig5(parsed.data.big5Answers) : null,
      mbti: parsed.data.mbti ? { type: parsed.data.mbti } : null,
    };

    const result = await getCrossInterpretation(sajuSummaryText, tendency, palmFacts, {
      timeoutMs: 9000,
      personality,
    });

    return NextResponse.json({
      usable: true,
      source: result.source,
      palmFacts,
      interpretation: result.interpretation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "교차 해석 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
