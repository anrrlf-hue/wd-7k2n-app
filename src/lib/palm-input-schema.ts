import { z } from "zod";

const onnxLineDetailSchema = z.object({
  detected: z.boolean(),
  // Optional for backward compatibility with stored pre-geometry-status data.
  // New observations preserve whether segmentation was measurable or ambiguous.
  geometryStatus: z.enum(["not_detected", "measurable", "ambiguous"]).optional(),
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
  creaseObservation: z.object({ bounds: z.object({ x0: z.number().min(0).max(1), y0: z.number().min(0).max(1), x1: z.number().min(0).max(1), y1: z.number().min(0).max(1) }), continuity: z.number().min(0).max(1), sourceVariant: z.enum(["raw", "enhanced"]) }).optional(),
  candidateObservation: z.object({ version: z.literal("fate-candidate-v1"), position: z.enum(["middle", "thumb_side", "pinky_side"]), visibleVerticalSpan: z.number().finite().positive().max(2), creaseContinuity: z.number().min(0).max(1) }).optional(),
  assessment: z.enum(["observed", "not_observed", "error", "unsupported", "unconfirmed"]).optional(),
  status: z.enum(["clear", "faint", "not_seen"]),
  strength: z.number().min(0).max(1),
  span: z.number().min(0).max(1),
  note: z.string(),
  modelConfidence: z.number().min(0).max(1).nullable().optional(),
  modelVerticalSpan: z.number().min(0).max(1).nullable().optional(),
  corroborated: z.boolean().optional(),
});

const linePixelCountsSchema = z.object({ heartLine: z.number(), headLine: z.number(), lifeLine: z.number() });
const pipelineDiagnosticsSchema = z.object({
  sourceWidth: z.number(), sourceHeight: z.number(), averageBrightness: z.number(), sharpness: z.number(),
  highlightRatio: z.number(), adaptiveMargin: z.number(), rawCropWidth: z.number(), rawCropHeight: z.number(),
  enhancedCropWidth: z.number(), enhancedCropHeight: z.number(), rawDetectedLineCount: z.number(),
  enhancedAttempted: z.boolean(), enhancedDetectedLineCount: z.number(),
  rawPixelCount: linePixelCountsSchema, enhancedPixelCount: linePixelCountsSchema,
  fateModelConfidence: z.number().nullable().optional(), fateModelVerticalSpan: z.number().nullable().optional(),
  fateModelCorroborated: z.boolean().optional(), threeLineElapsedMs: z.number().optional(),
  fateModelStatus: z.enum(["ok", "no_detections", "error", "skipped"]).optional(),
  fateModelSkipped: z.boolean().optional(),
  fateModelElapsedMs: z.number().optional(), totalModelElapsedMs: z.number().optional(),
  chosenVariant: z.object({ heartLine: z.enum(["raw", "enhanced"]), headLine: z.enum(["raw", "enhanced"]), lifeLine: z.enum(["raw", "enhanced"]) }),
});

export const palmFactsSchema = z.object({
  handGeometry: z.object({
    version: z.literal("landmark-geometry-v1"), status: z.enum(["observed", "not_usable"]),
    reasons: z.array(z.enum(["cropped", "perspective", "overlap", "bent", "missing_points"])),
    palmWidthToLength: z.number().finite().positive().nullable(),
    fingerToPalm: z.object({ thumb: z.number().finite().positive().optional(), index: z.number().finite().positive().optional(), middle: z.number().finite().positive().optional(), ring: z.number().finite().positive().optional(), pinky: z.number().finite().positive().optional() }),
    indexRing: z.enum(["index_longer", "ring_longer", "similar"]).nullable(),
  }).refine(value => value.status !== "observed" || (value.palmWidthToLength !== null && Object.keys(value.fingerToPalm).length >= 3), "확인된 손 형태의 관찰값이 부족합니다.").optional(),
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
  pipelineDiagnostics: pipelineDiagnosticsSchema.optional(),
  warnings: z.array(z.string()),
});
