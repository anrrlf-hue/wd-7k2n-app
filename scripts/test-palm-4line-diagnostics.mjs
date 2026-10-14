// Diagnostic contract tests only; no ONNX session or image inference runs.
import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
const { createFourLineRuntimeDiagnostic } = await import("../src/lib/palm-4line-onnx.ts");

const rawLikeError = new Error("ENOENT /private/customer/photo-123/model.onnx tensor values");
const diagnostic = createFourLineRuntimeDiagnostic("inference", rawLikeError, 10, 27.5, 4, true);
assert.deepEqual(diagnostic, {
  stage: "inference",
  errorName: "Error",
  message: "4-line ONNX inference failed",
  startedAtMs: 10,
  endedAtMs: 27.5,
  durationMs: 17.5,
  serial: 4,
  nested: true,
});
assert.doesNotMatch(JSON.stringify(diagnostic), /private|customer|photo-123|model\.onnx|tensor values/);
for (const stage of ["session_init", "preprocess", "inference", "output"]) {
  const result = createFourLineRuntimeDiagnostic(stage, { secret: "/private/customer" }, 5, 6, 1, false);
  assert.equal(result.stage, stage);
  assert.equal(result.errorName, "UnknownError");
  assert.doesNotMatch(result.message, /private|customer/);
}
console.log("PASS 4-line diagnostics: sanitized stages, timing, serial/nested flags, and no raw error leakage");
