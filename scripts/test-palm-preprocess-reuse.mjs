// Synthetic bounded regression: reused preprocessing canvas must equal a fresh
// canvas when the second source only paints part of its pixels.
import assert from "node:assert/strict";
import { PalmLineSegmenter } from "../src/lib/vendor/palm-line-reader/palmLines.js";

class FakeContext {
  constructor(size) { this.size = size; this.data = new Uint8ClampedArray(size * size * 4); }
  clearRect() { this.data.fill(0); }
  drawImage(source) {
    if (source.kind === "A") this.data.fill(0);
    if (source.kind === "A") {
      for (let i = 0; i < this.data.length; i += 4) this.data[i] = 255;
    } else {
      this.data[0] = 0; this.data[1] = 0; this.data[2] = 0; this.data[3] = 255;
      // Remaining B pixels are transparent and intentionally do not paint.
    }
  }
  getImageData() { return { data: this.data }; }
}

function segmenterWithContext() {
  const segmenter = Object.create(PalmLineSegmenter.prototype);
  segmenter.size = 4;
  segmenter._ctx = new FakeContext(4);
  return segmenter;
}

const reused = segmenterWithContext();
reused.preprocess({ kind: "A" });
const afterA = reused.preprocess({ kind: "B" });
const fresh = segmenterWithContext().preprocess({ kind: "B" });

// Before the fix, the old no-clear sequence leaves A's red pixels in B's
// transparent area. The current path matches a fresh worker/canvas exactly.
const legacy = segmenterWithContext();
legacy._ctx.drawImage({ kind: "A" }, 0, 0, 4, 4);
const legacyAfterB = legacy._ctx;
legacyAfterB.drawImage({ kind: "B" }, 0, 0, 4, 4);
const legacyData = legacyAfterB.getImageData(0, 0, 4, 4).data;
const freshPixels = new Uint8ClampedArray(4 * 4 * 4);
freshPixels[3] = 255;

assert.deepEqual([...afterA], [...fresh], "A→B reuse equals fresh B preprocessing");
assert.notDeepEqual([...legacyData], [...freshPixels], "legacy reproduction retains prior A pixels");
assert.equal(afterA.length, 4 * 4 * 3, "normalized tensor shape remains unchanged");
console.log("PASS preprocess reuse: synthetic partial transparent B matches fresh B; legacy path retains A pixels");
