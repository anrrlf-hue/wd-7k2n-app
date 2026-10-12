/** Preserve the same pixel pipeline in the window and a dedicated worker. */
export type PalmCanvas = HTMLCanvasElement | OffscreenCanvas;
export type PalmContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function createPalmCanvas(width = 1, height = 1): PalmCanvas {
  if (typeof document === "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
