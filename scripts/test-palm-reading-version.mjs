import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
const { PALM_READING_VERSION, isStoredPalmReading } = await import("../src/lib/palm-bilateral.ts");
assert.equal(PALM_READING_VERSION, "bilateral-reading-v8-life-geometry-guard");
const stale = { version: "bilateral-reading-v7", summary: "old", items: [], note: "preserve" };
assert.ok(isStoredPalmReading(stale), "old saved prose remains structurally readable");
assert.notEqual(stale.version, PALM_READING_VERSION, "v7 cannot be rendered as current v8 prose");
assert.equal(stale.note, "preserve", "old saved prose is not deleted");
console.log("PASS palm reading restore version: stale v7 is preserved but requires current v8 regeneration");
