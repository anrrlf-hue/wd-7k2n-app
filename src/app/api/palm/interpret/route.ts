import { NextResponse } from "next/server";
import { z } from "zod";
import { computeSajuFacts, type SajuFacts } from "@/lib/saju-facts";
import { getFreeSajuReport } from "@/lib/free-report-engine";
import { isPalmFactsUsable, type PalmFacts } from "@/lib/palm-facts";
import { scorePersonalityCheck } from "@/lib/personality-check";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { buildFortuneCandidates } from "@/lib/fortune-candidates";
import { buildTripleCompare } from "@/lib/triple-compare";

// 손금 이미지 자체는 서버로 오지 않는다 — 클라이언트에서 MediaPipe/ONNX로
// 이미 분석해 만든 PalmFacts(구조화 JSON)만 받는다. palmFacts가 없으면
// "손금 없이 계속 보기"(반복 실패 후 또는 처음부터 건너뛴 경우) 요청으로
// 보고 사주만으로 최종 통합 리포트를 만든다 — 실패한 손금을 성공한 것처럼
// 꾸며서 보여주는 fallback은 절대 하지 않는다. palmFacts가 있는데 실제 ONNX
// 기준으로 쓸 수 없는 상태면(isPalmFactsUsable) 해석을 만들지 않고 재촬영
// 사유를 그대로 돌려준다.
//
// 최종 통합 리포트(getFreeSajuReport)가 이 라우트의 유일한 리포트 생성
// 경로다 — 이전에는 별도의 cross-interpretation 파이프라인이 "손금×사주
// 공통점/차이점" 섹션을 따로 만들어 finalReport 앞에 붙였는데, 이는 결국
// 사주/손금/자기보고를 세 덩어리로 이어붙이는 구조였다. 이번에는 그 비교
// 로직을 free-report-mock.ts의 관련 주제별 섹션(재물 구조/의사결정/사람과
// 돈/기회) 안으로 옮겨서, 진짜 하나의 리포트로 만든다.

const onnxLineDetailSchema = z.object({
  detected: z.boolean(),
  length: z.enum(["짧음", "보통", "김"]).nullable(),
  curve: z.enum(["완만한 곡선", "직선에 가까움"]).nullable(),
  depthStrength: z.enum(["약함", "보통", "강함"]).nullable(),
  start: z.object({ x: z.number(), y: z.number() }).nullable(),
  end: z.object({ x: z.number(), y: z.number() }).nullable(),
  branchDetected: z.null(),
});

const onnxPalmLinesSchema = z.object({
  modelExecuted: z.literal(true),
  heartLine: onnxLineDetailSchema,
  headLine: onnxLineDetailSchema,
  lifeLine: onnxLineDetailSchema,
  fateLine: z.object({ presence: z.literal("unknown"), note: z.string() }),
  mounts: z.literal("unknown"),
  marks: z.literal("unknown"),
});

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
  /** 실제 ONNX 모델(samuelwbarber/palm-line-reader) 추론 결과. 클라이언트에서
   * 추론이 실패했으면 null — 서버는 그 값을 그대로 통과시킨다(억지로 채우지 않음). */
  onnxLines: onnxPalmLinesSchema.nullable(),
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
  /** 없으면(null/undefined) "손금 없이 계속 보기" 요청으로 처리한다. */
  palmFacts: palmFactsSchema.nullable().optional(),
  personalityAnswers: z.record(z.string(), z.number().min(1).max(5)).optional(),
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

  const palmFacts = (parsed.data.palmFacts ?? null) as PalmFacts | null;
  const palmSkipped = palmFacts === null;

  if (palmFacts && !isPalmFactsUsable(palmFacts)) {
    return NextResponse.json({
      usable: false,
      palmSkipped: false,
      warnings:
        palmFacts.warnings.length > 0
          ? palmFacts.warnings
          : ["손금선이 충분히 읽히지 않았어요. 손바닥 전체가 보이게 밝은 곳에서 다시 촬영해주세요."],
    });
  }

  try {
    const deepFacts: SajuFacts = computeSajuFacts(parsed.data);

    const personality = {
      check: parsed.data.personalityAnswers ? scorePersonalityCheck(parsed.data.personalityAnswers) : null,
      mbti: parsed.data.mbti ? { type: parsed.data.mbti } : null,
    };

    const onnxLines = palmFacts?.onnxLines ?? null;
    const freeReportResult = await getFreeSajuReport(deepFacts, { timeoutMs: 9000 });
    const fortuneCandidates = buildFortuneCandidates(deepFacts, onnxLines);
    const tripleCompare = buildTripleCompare(deepFacts, onnxLines, personality.check);

    return NextResponse.json({
      usable: true,
      palmSkipped,
      palmFacts,
      freeReport: { source: freeReportResult.source, report: freeReportResult.report },
      fortuneCandidates,
      tripleCompare,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "리포트 생성 중 문제가 발생했습니다.", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
