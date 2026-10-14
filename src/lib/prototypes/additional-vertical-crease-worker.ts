import {
  NormalizedHandLandmark,
  AdditionalCreaseAnalysis,
  trackAdditionalVerticalCreases,
} from "./additional-vertical-crease";

export interface AdditionalCreaseWorkerRequest {
  id: string;
  width: number;
  height: number;
  pixels: ArrayBuffer;
  landmarks: NormalizedHandLandmark[];
}

export interface AdditionalCreaseWorkerResponse {
  id: string;
  result?: AdditionalCreaseAnalysis;
  error?: "invalid_request" | "busy" | "runtime";
}

interface WorkerScopeLike {
  onmessage: ((event: MessageEvent<AdditionalCreaseWorkerRequest>) => void) | null;
  postMessage(message: AdditionalCreaseWorkerResponse): void;
}

/** Install the optional off-main-thread adapter; the prototype itself stays independently testable. */
export function installAdditionalVerticalCreaseWorker(scope: WorkerScopeLike): void {
  let inFlight = 0;
  scope.onmessage = event => {
    const request = event.data;
    if (!request || !Number.isInteger(request.width) || !Number.isInteger(request.height) || request.width <= 0 || request.height <= 0 || !(request.pixels instanceof ArrayBuffer) || request.pixels.byteLength !== request.width * request.height * 4 || !Array.isArray(request.landmarks)) {
      scope.postMessage({ id: request?.id ?? "", error: "invalid_request" });
      return;
    }
    if (inFlight >= 1) { scope.postMessage({ id: request.id, error: "busy" }); return; }
    inFlight++;
    try {
      const pixels = new Uint8ClampedArray(request.pixels);
      const result = trackAdditionalVerticalCreases(new ImageData(pixels, request.width, request.height), request.landmarks);
      scope.postMessage({ id: request.id, result });
    } catch {
      scope.postMessage({ id: request.id, error: "runtime" });
    } finally {
      inFlight--;
    }
  };
}
