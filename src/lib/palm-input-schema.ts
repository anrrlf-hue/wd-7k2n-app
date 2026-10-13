import { z } from "zod";

const onnxLineDetailSchema = z.object({
  detected: z.boolean(),
  length: z.enum(["짧음", "보통", "김"]).nullable(),
  curve: z.enum(["완만한 곡선", "직선에 가까움"]).nullable(),
  depthStrength: z.enum(["약함", "보통", "강함"]).nullable(),
  start: z.object({ x: z.number(), y: z.number() }).nullable(),
  end: z.object({ x: z.number(), y: z.number() }).nullable(),
  branchDetected: z.null(),
  sourceVariant: z.enum(["raw", "enhanced", "unknown"]).optional(),
  rawDetected: z.boolean().optional(),
  enhancedDetected: z.boolean().optional(),
  endpointEvidence: z.enum(["segment_extrema", "none"]).optional(),
  pathCompleteness: z.enum(["not_verified", "unavailable"]).optional(),
  attributeSupport: z.object({
    length: z.enum(["segment_only", "not_supported"]),
    curve: z.enum(["segment_only", "not_supported"]),
    depth: z.enum(["mask_signal_only", "not_supported"]),
  }).optional(),
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

export const palmFactsSchema = z.object({
  handSide: z.enum(["left", "right", "unknown"]),
  imageQuality: z.enum(["good", "no_hand_detected", "too_dark", "too_blurry", "overexposed", "hand_cropped"]),
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
  secondaryLines: z.object({
    fate: secondaryLineSignalSchema,
    sun: secondaryLineSignalSchema,
    wealth: secondaryLineSignalSchema,
  }).optional(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});
