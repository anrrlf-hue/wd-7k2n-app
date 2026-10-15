/** Diagnostic capture is for local review only; production must never emit it. */
export function shouldCapturePalmDebug(requested: boolean): boolean {
  return requested && process.env.NODE_ENV !== "production";
}
