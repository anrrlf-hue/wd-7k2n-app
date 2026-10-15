import type { PalmFacts } from "./palm-facts";
import type { PalmAnalysisDebugSnapshot, PalmAnalysisPhase } from "./palm-detection";

// A worker can remain alive while a browser-side WASM/model promise is stuck.
// The page-level deadline is still the final guard, but this shorter boundary
// makes the worker itself recoverable and gives the UI a retryable failure.
export const PALM_WORKER_TIMEOUT_MS = 45_000;

export class PalmWorkerClient {
  private worker: Worker | null = null;
  private sequence = 0;

  dispose() {
    this.worker?.terminate();
    this.worker = null;
  }

  analyze(canvas: HTMLCanvasElement, signal: AbortSignal, onPhase: (phase: PalmAnalysisPhase) => void, options?: { debug?: boolean; onDebug?: (snapshot: PalmAnalysisDebugSnapshot) => void }): Promise<PalmFacts> {
    signal.throwIfAborted();
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
      return Promise.reject(new Error("이 브라우저에서는 손금 분석을 지원하지 않아요. 최신 Safari 또는 Chrome을 이용하거나 손금 없이 계속해주세요."));
    }
    this.worker ??= new Worker(new URL("./palm-analysis-worker.ts", import.meta.url));
    const worker = this.worker;
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      let watchdog: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => {
        if (watchdog !== null) clearTimeout(watchdog);
        signal.removeEventListener("abort", abort);
        worker.removeEventListener("message", message);
        worker.removeEventListener("error", error);
        worker.removeEventListener("messageerror", error);
      };
      const fail = (reason: unknown) => { cleanup(); this.dispose(); reject(reason); };
      const abort = () => fail(signal.reason);
      const error = () => fail(new Error("손금 분석 기능을 시작하지 못했어요. 같은 사진으로 다시 시도해주세요."));
      const message = (event: MessageEvent<{ id: number; phase?: PalmAnalysisPhase; facts?: PalmFacts; debug?: PalmAnalysisDebugSnapshot; error?: string }>) => {
        if (event.data.id !== id || signal.aborted) return;
        if (event.data.phase) onPhase(event.data.phase);
        else if (event.data.debug) options?.onDebug?.(event.data.debug);
        else if (event.data.error) fail(new Error(event.data.error));
        else if (event.data.facts) { cleanup(); resolve(event.data.facts); }
      };
      signal.addEventListener("abort", abort, { once: true });
      worker.addEventListener("message", message);
      worker.addEventListener("error", error);
      worker.addEventListener("messageerror", error);
      watchdog = setTimeout(() => {
        fail(Object.assign(new Error("사진 분석 모델 응답이 45초를 넘었어요. 같은 사진으로 다시 시도해주세요."), { name: "TimeoutError" }));
      }, PALM_WORKER_TIMEOUT_MS);
      try {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("사진을 처리하지 못했어요.");
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        worker.postMessage({ id, pixels, debug: options?.debug === true }, [pixels.data.buffer]);
      } catch (reason) { fail(reason); }
    });
  }
}
