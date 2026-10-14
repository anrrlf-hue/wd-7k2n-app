import { createPalmCanvas, type PalmCanvas } from "@/lib/palm-canvas";
import * as ort from "onnxruntime-web";

ort.env.wasm.wasmPaths = "/ort/";
ort.env.wasm.numThreads = 1;

const MODEL_SIZE = 640;
const ROW_SIZE = 36;
const MAX_DETECTIONS = 300;
const CLASS_NAMES = ["fate", "head", "heart", "life"] as const;

export type FourLineClass = (typeof CLASS_NAMES)[number];

export interface FourLineKeypoint {
  x: number;
  y: number;
  confidence: number;
}

export interface FourLinePoseObservation {
  class: FourLineClass;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  keypoints: FourLineKeypoint[];
  verticalSpan: number;
  horizontalSpan: number;
}

export interface FourLinePoseResult {
  status: "ok" | "no_detections" | "error";
  errorCode?: "model_runtime";
  observations: FourLinePoseObservation[];
  fate: FourLinePoseObservation | null;
  /** Development diagnostic only; never rendered as customer copy. */
  diagnostics?: FourLineRuntimeDiagnostic[];
}

export type FourLineErrorStage = "session_init" | "preprocess" | "inference" | "output";
export interface FourLineRuntimeDiagnostic {
  stage: FourLineErrorStage;
  errorName: string;
  message: string;
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
  serial: number;
  nested: boolean;
}

let invocationSerial = 0;
let activeInvocations = 0;

export function createFourLineRuntimeDiagnostic(
  stage: FourLineErrorStage,
  error: unknown,
  startedAtMs: number,
  endedAtMs: number,
  serial: number,
  nested: boolean,
): FourLineRuntimeDiagnostic {
  const errorName = error instanceof Error && error.name && /^[A-Za-z][A-Za-z0-9_]*$/.test(error.name) ? error.name : "UnknownError";
  const stageMessage: Record<FourLineErrorStage, string> = {
    session_init: "4-line ONNX session initialization failed",
    preprocess: "4-line ONNX input preprocessing failed",
    inference: "4-line ONNX inference failed",
    output: "4-line ONNX output decoding failed",
  };
  return { stage, errorName, message: stageMessage[stage], startedAtMs, endedAtMs, durationMs: Math.max(0, endedAtMs - startedAtMs), serial, nested };
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create("/models/palm_4line_pose.onnx", {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }).catch(error => { sessionPromise = null; throw error; });
  }
  return sessionPromise;
}

function preprocess(source: PalmCanvas): {
  tensor: ort.Tensor;
  scale: number;
  padX: number;
  padY: number;
} {
  const canvas = createPalmCanvas();
  canvas.width = MODEL_SIZE;
  canvas.height = MODEL_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("4-line palm canvas context unavailable");

  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, MODEL_SIZE, MODEL_SIZE);

  const scale = Math.min(MODEL_SIZE / source.width, MODEL_SIZE / source.height);
  const drawW = Math.max(1, Math.round(source.width * scale));
  const drawH = Math.max(1, Math.round(source.height * scale));
  const padX = Math.floor((MODEL_SIZE - drawW) / 2);
  const padY = Math.floor((MODEL_SIZE - drawH) / 2);
  ctx.drawImage(source, padX, padY, drawW, drawH);

  const { data } = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
  const plane = MODEL_SIZE * MODEL_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    chw[i] = data[p] / 255;
    chw[plane + i] = data[p + 1] / 255;
    chw[2 * plane + i] = data[p + 2] / 255;
  }

  return {
    tensor: new ort.Tensor("float32", chw, [1, 3, MODEL_SIZE, MODEL_SIZE]),
    scale,
    padX,
    padY,
  };
}

function normalizedPoint(
  x: number,
  y: number,
  source: PalmCanvas,
  scale: number,
  padX: number,
  padY: number,
): { x: number; y: number } {
  const sx = (x - padX) / scale;
  const sy = (y - padY) / scale;
  return {
    x: Math.max(0, Math.min(1, sx / source.width)),
    y: Math.max(0, Math.min(1, sy / source.height)),
  };
}

export async function runPalmFourLineOnnx(
  source: PalmCanvas,
  minConfidence = 0.08,
): Promise<FourLinePoseResult> {
  const serial = ++invocationSerial;
  const nested = activeInvocations > 0;
  activeInvocations++;
  let stage: FourLineErrorStage = "session_init";
  let stageStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const beginStage = (next: FourLineErrorStage) => { stage = next; stageStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now(); };
  const finish = <T extends FourLinePoseResult>(result: T): T => { activeInvocations = Math.max(0, activeInvocations - 1); return result; };
  try {
    const session = await getSession();
    beginStage("preprocess");
    const { tensor, scale, padX, padY } = preprocess(source);
    beginStage("inference");
    const outputMap = await session.run({ [session.inputNames[0]]: tensor });
    beginStage("output");
    const output = outputMap[session.outputNames[0]];
    const values = output.data as Float32Array;

    if (values.length < ROW_SIZE) {
      throw new Error(`Unexpected 4-line ONNX output length: ${values.length}`);
    }

    const rows = Math.min(MAX_DETECTIONS, Math.floor(values.length / ROW_SIZE));
    const observations: FourLinePoseObservation[] = [];

    for (let row = 0; row < rows; row++) {
      const base = row * ROW_SIZE;
      const confidence = values[base + 4];
      if (!Number.isFinite(confidence) || confidence < minConfidence) continue;

      const classId = Math.round(values[base + 5]);
      const className = CLASS_NAMES[classId];
      if (!className) continue;

      const p0 = normalizedPoint(values[base], values[base + 1], source, scale, padX, padY);
      const p1 = normalizedPoint(values[base + 2], values[base + 3], source, scale, padX, padY);

      const keypoints: FourLineKeypoint[] = [];
      for (let k = 0; k < 10; k++) {
        const offset = base + 6 + k * 3;
        const pointConfidence = values[offset + 2];
        const point = normalizedPoint(values[offset], values[offset + 1], source, scale, padX, padY);
        keypoints.push({ ...point, confidence: pointConfidence });
      }

      const visible = keypoints.filter((p) => p.confidence >= 0.2);
      const xs = visible.map((p) => p.x);
      const ys = visible.map((p) => p.y);
      const horizontalSpan = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
      const verticalSpan = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;

      observations.push({
        class: className,
        confidence,
        bbox: {
          x0: Math.min(p0.x, p1.x),
          y0: Math.min(p0.y, p1.y),
          x1: Math.max(p0.x, p1.x),
          y1: Math.max(p0.y, p1.y),
        },
        keypoints,
        verticalSpan,
        horizontalSpan,
      });
    }

    observations.sort((a, b) => b.confidence - a.confidence);
    const fate = observations.find((o) => o.class === "fate") ?? null;
    return finish({ status: observations.length ? "ok" : "no_detections", observations, fate });
  } catch (err) {
    const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    const diagnostic = createFourLineRuntimeDiagnostic(stage, err, stageStartedAt, endedAt, serial, nested);
    console.error("palm 4-line ONNX diagnostic", diagnostic);
    return finish({ status: "error", errorCode: "model_runtime", observations: [], fate: null, diagnostics: [diagnostic] });
  }
}
