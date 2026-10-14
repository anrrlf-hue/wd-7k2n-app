# Additional vertical crease prototype

`additional-vertical-crease.ts` is intentionally independent of the production
palm pipeline. Its contract is:

```ts
trackAdditionalVerticalCreases(
  image: ImageData,
  landmarks: NormalizedHandLandmark[], // exactly 21 MediaPipe normalized points
): AdditionalCreaseAnalysis
```

It converts normalized coordinates with the actual image width and height,
checks middle/ring/pinky direction corridors, and returns raw/local-contrast
tracks, geometric path length (`pathLengthPx`), vertical span (`verticalSpanPx`),
coverage, supported-pixel counts, selected-component count, gap rows, ROI, and
same-y cross-variant path stability. Returned points are selected from supported
response pixels rather than an unsupported row midpoint; `gapRows` reports rows
without selected support and `competingComponentCount` reports separated
long-span tracks. Cross-variant path distance compares only matching supported
y rows, and `supportOverlapRatio` must clear the minimum overlap threshold, so
small overlaps cannot be stabilized by interpolation. A fragment can be
reported as `insufficient_evidence` without being treated as a missing line;
separated competing tracks cannot become a stable candidate.

The pixel offset used for the filtered center is restored when converting back
to source coordinates. Blur uses prefix sums with image/ROI bounds rather than
rebuilding a sum for every output row.

The optional `additional-vertical-crease-worker.ts` exposes a request/response
adapter for a dedicated worker. It transfers the local pixel buffer, validates
the request, and keeps the bounded analysis off the UI thread when the host
chooses to install it; no production worker is wired by this prototype.

The public browser regression is in
`scripts/test-additional-vertical-crease-browser.mjs`. It runs only synthetic
cases by default and accepts the compiled bundle through `CREASE_BUNDLE`; it
does not contain or load private photos, landmarks, or customer inputs. Local
photo verification is a separate untracked procedure and is not part of the
public regression.

The module distinguishes `invalid_input`, `unsupported_pose`, and runtime
`error` from an image with no observed candidate. Short or weak tracks are
`insufficient_evidence`, not a claim that a line is absent. Image dimensions,
pixel count, estimated work, and corridor area are bounded; malformed image
data, null landmarks, and out-of-range ROI inputs are rejected before pixel
access. Pose acceptance is intentionally narrowed to a 30-degree deviation
from the supported upright orientation.

Run the public regression with the existing project TypeScript tool and an
already-provided browser-test module:

```sh
PLAYWRIGHT_MODULE=/path/to/existing/playwright npm run verify:additional-crease
```

The regression includes resolution 1x/2x/3x, dense-texture timing, coordinate-
offset, the difficult curved/sloped tracks, separated fragments,
contrast/length cases, horizontal and lighting negatives, malformed image and
landmark inputs, and positive/negative pose-angle boundary checks. It does not
contain or load private photos or landmarks.
