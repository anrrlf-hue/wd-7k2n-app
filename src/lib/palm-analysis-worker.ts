import { analyzePalmFromCanvas } from "./palm-detection";

// Classic worker: MediaPipe's WASM loader uses importScripts. Pixels stay local.
self.onmessage = async (event: MessageEvent<{ id: number; pixels: ImageData }>) => {
  const { id, pixels } = event.data;
  try {
    const canvas = new OffscreenCanvas(pixels.width, pixels.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진 처리 기능을 시작하지 못했어요.");
    context.putImageData(pixels, 0, 0);
    const facts = await analyzePalmFromCanvas(canvas, (phase) => self.postMessage({ id, phase }));
    self.postMessage({ id, facts });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : "손금 분석을 완료하지 못했어요." });
  }
};
