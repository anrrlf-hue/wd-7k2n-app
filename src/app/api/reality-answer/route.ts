import { NextResponse } from "next/server";
import { z } from "zod";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { getRealityAnswer } from "@/lib/reality-answer-engine";
import { computeSajuFacts, type SajuFacts } from "@/lib/saju-facts";
import { enrichSajuFacts } from "@/lib/oh-my-saju-adapter";
import { scorePersonalityCheck } from "@/lib/personality-check";
import { SAJU_FOCUS_VALUES, type SajuFocus } from "@/lib/saju-focus";
import type { OnnxPalmLines } from "@/lib/palm-facts";
import { REALITY_ANSWER_DOMAINS } from "@/lib/reality-answer-contract";
import { buildQuestionEnginePlan } from "@/lib/question-engine-v0";
import type { RealityPalmContext } from "@/lib/reality-palm-context";

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

const secondaryLineSignalSchema = z.object({
  status: z.enum(["clear", "faint", "not_seen"]),
  strength: z.number().min(0).max(1),
  span: z.number().min(0).max(1),
  note: z.string(),
  modelConfidence: z.number().min(0).max(1).nullable().optional(),
  modelVerticalSpan: z.number().min(0).max(1).nullable().optional(),
  corroborated: z.boolean().optional(),
});

const palmHandContextSchema = z.object({
  handSide: z.enum(["left", "right", "unknown"]),
  handShape: z.enum(["square", "rectangular", "elongated", "slender", "unknown"]),
  onnxLines: onnxPalmLinesSchema.nullable(),
  secondaryLines: z.object({
    fate: secondaryLineSignalSchema,
    sun: secondaryLineSignalSchema,
    wealth: secondaryLineSignalSchema,
  }).optional(),
});

const palmContextSchema = z.object({
  dominantHand: z.enum(["left", "right"]).nullable(),
  primary: palmHandContextSchema.nullable(),
  left: palmHandContextSchema.nullable(),
  right: palmHandContextSchema.nullable(),
});

const bodySchema = z.object({
  question: z.string().trim().min(1).max(500),
  previousQuestion: z.string().trim().max(500).nullable().optional(),
  previousDomain: z.enum(REALITY_ANSWER_DOMAINS).nullable().optional(),
  focusHint: z.enum(SAJU_FOCUS_VALUES).nullable().optional(),
  year: z.number().int().min(1900).max(2035),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable(),
  gender: z.enum(["남", "여"]),
  palmLines: onnxPalmLinesSchema.nullable().optional(),
  palmContext: palmContextSchema.nullable().optional(),
  personalityAnswers: z.record(z.string(), z.number().min(1).max(5)).optional(),
  mbti: z.enum(MBTI_TYPES).optional(),
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "질문 또는 사주 입력값이 올바르지 않습니다.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const birth = {
      year: parsed.data.year,
      month: parsed.data.month,
      day: parsed.data.day,
      hour: parsed.data.hour,
      minute: parsed.data.minute,
      gender: parsed.data.gender,
    };

    const shallowFacts = computeSajuFacts(birth);
    const facts: SajuFacts =
      birth.hour === null ? shallowFacts : enrichSajuFacts(shallowFacts, birth);

    const personality = {
      mbti: parsed.data.mbti ?? null,
      check: parsed.data.personalityAnswers
        ? scorePersonalityCheck(parsed.data.personalityAnswers)
        : null,
    };

    const questionPlan = buildQuestionEnginePlan(parsed.data.question, {
      focusHint: (parsed.data.focusHint ?? null) as SajuFocus | null,
      previousQuestion: parsed.data.previousQuestion ?? null,
      previousDomain: parsed.data.previousDomain ?? null,
    });

    const result = await getRealityAnswer(parsed.data.question, facts, {
      timeoutMs: 9000,
      personality,
      palm: (parsed.data.palmLines ?? null) as OnnxPalmLines | null,
      palmContext: (parsed.data.palmContext ?? null) as RealityPalmContext | null,
      focusHint: questionPlan.focus,
      domainHint: questionPlan.domain,
    });

    return NextResponse.json({ ...result, questionPlan });
  } catch (error) {
    return NextResponse.json(
      {
        error: "사주답변을 만드는 중 문제가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
