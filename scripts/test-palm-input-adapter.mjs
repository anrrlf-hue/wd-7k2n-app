import assert from "node:assert/strict";
import "./register-test-typescript.mjs";
const { computePaddedInputTransform, paddedMaskToCrop } = await import("../src/lib/palm-line-onnx.ts");

const cases = [
  [320, 640, "portrait"],
  [640, 320, "landscape"],
  [512, 512, "square"],
];
for (const [width, height, name] of cases) {
  const transform = computePaddedInputTransform(width, height);
  assert.equal(transform.paddedSize, 1024, name);
  assert.equal(transform.resizedWidth, Math.floor(width * Math.min(1024 / width, 1024 / height)), name);
  assert.equal(transform.resizedHeight, Math.floor(height * Math.min(1024 / width, 1024 / height)), name);
  for (const mirrored of [false, true]) {
    for (const sourcePoint of [{ x: 0.07, y: 0.13 }, { x: 0.5, y: 0.5 }, { x: 0.91, y: 0.84 }]) {
      const x = mirrored ? 1 - sourcePoint.x : sourcePoint.x;
      const last = transform.paddedSize - 1;
      const padded = { x: (transform.offsetX + x * transform.resizedWidth) / last, y: (transform.offsetY + sourcePoint.y * transform.resizedHeight) / last };
      const roundTrip = paddedMaskToCrop(transform, padded);
      const recoveredX = mirrored ? 1 - roundTrip.x / width : roundTrip.x / width;
      assert.ok(Math.abs(recoveredX - sourcePoint.x) < 1e-9, `${name} mirrored x`);
      assert.ok(Math.abs(roundTrip.y / height - sourcePoint.y) < 1e-9, `${name} y`);
    }
  }
}
console.log("PASS padded 1024 adapter integer sizing and portrait/landscape/square mirror round-trips");
