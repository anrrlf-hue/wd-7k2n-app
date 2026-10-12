/** A deadline covers both response headers and body consumption. Abort reaches
 * fetch/streams and the local worker; the settling guard also handles late work. */
export async function runWithDeadline<T>(
  parent: AbortSignal,
  timeoutMs: number,
  message: string,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  parent.throwIfAborted();
  const controller = new AbortController();
  const started = performance.now();
  const timeout = () => controller.abort(new Error(message));
  const onParentAbort = () => controller.abort(parent.reason);
  parent.addEventListener("abort", onParentAbort, { once: true });
  const timer = setTimeout(timeout, timeoutMs);
  let onAbort: () => void = () => {};
  try {
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });
    const result = await Promise.race([operation(controller.signal), aborted]);
    if (performance.now() - started >= timeoutMs) timeout();
    controller.signal.throwIfAborted();
    return result;
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", onParentAbort);
    controller.signal.removeEventListener("abort", onAbort);
  }
}

export async function requestPalmReport<T>(body: unknown, signal: AbortSignal, onHeaders: () => void, timeoutMs = 30_000): Promise<T> {
  return runWithDeadline(signal, timeoutMs, "리포트 수신이 30초를 넘었어요. 촬영한 양손은 유지되어 다시 시도할 수 있습니다.", async (requestSignal) => {
    const response = await fetch("/api/palm/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: requestSignal,
    });
    requestSignal.throwIfAborted();
    onHeaders();
    const data = await response.json();
    requestSignal.throwIfAborted();
    if (!response.ok) throw new Error(data.error || "리포트 요청에 실패했어요.");
    return data as T;
  });
}

/** An aborted/superseded task may never publish into the current view. */
export class PalmTaskSlot {
  private active: AbortController | null = null;
  begin() {
    this.cancel();
    const task = new AbortController();
    this.active = task;
    return task;
  }
  isCurrent(task: AbortController) {
    return this.active === task && !task.signal.aborted;
  }
  hasActive() {
    return this.active !== null;
  }
  finish(task: AbortController) {
    if (this.active === task) this.active = null;
  }
  cancel() {
    this.active?.abort(new DOMException("분석을 취소했습니다.", "AbortError"));
    this.active = null;
  }
}
