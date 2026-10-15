import { analyzePalmFromCanvas } from "./palm-detection";
import type { PalmAnalysisDebugSnapshot } from "./palm-detection";
import { shouldCapturePalmDebug } from "./palm-debug-gate";

// Classic worker: MediaPipe's WASM loader uses importScripts. Pixels stay local.
self.onmessage = async (event: MessageEvent<{ id: number; pixels: ImageData; debug?: boolean; inputAdapter?: "stretch" | "padded-1024" }>) => {
  const { id, pixels } = event.data;
  try {
    const canvas = new OffscreenCanvas(pixels.width, pixels.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진 처리 기능을 시작하지 못했어요.");
    context.putImageData(pixels, 0, 0);
    const debugEnabled = shouldCapturePalmDebug(event.data.debug === true);
    const facts = await analyzePalmFromCanvas(canvas, (phase) => self.postMessage({ id, phase }), debugEnabled ? (snapshot: PalmAnalysisDebugSnapshot) => {
      const transfer: ArrayBuffer[] = [];
      for (const variant of [snapshot.raw.result, snapshot.enhanced.result]) {
        if (variant?.mask) transfer.push(variant.mask.buffer as ArrayBuffer);
      }
      self.postMessage({ id, debug: snapshot }, { transfer });
    } : undefined, { inputAdapter: event.data.inputAdapter });
    self.postMessage({ id, facts });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : "손금 분석을 완료하지 못했어요." });
  }
};
