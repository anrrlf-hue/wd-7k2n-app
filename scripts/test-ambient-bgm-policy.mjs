import assert from "node:assert/strict";
import { shouldStartAmbientAudio } from "../src/lib/ambient-bgm-policy.js";

assert.equal(
  shouldStartAmbientAudio({ userInitiated: false, muted: false }),
  false,
  "BGM must not start from a page load, pointer event, or keyboard event alone",
);
assert.equal(
  shouldStartAmbientAudio({ userInitiated: true, muted: true }),
  false,
  "BGM must remain stopped while muted",
);
assert.equal(
  shouldStartAmbientAudio({ userInitiated: true, muted: false }),
  true,
  "BGM may start only after the user explicitly enables it",
);

console.log("ambient BGM policy: PASS");
