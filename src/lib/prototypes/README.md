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
same-y cross-variant path stability. A fragment can be reported as
`insufficient_evidence` without being treated as a missing line; multiple
separated components cannot become a stable candidate.

The pixel offset used for the filtered center is restored when converting back
to source coordinates. Blur uses prefix sums with image/ROI bounds rather than
rebuilding a sum for every output row.

The public browser regression is in
`scripts/test-additional-vertical-crease-browser.mjs`. It runs only synthetic
cases by default and accepts the compiled bundle through `CREASE_BUNDLE`; it
does not contain or load private photos, landmarks, or customer inputs. Local
photo verification is a separate untracked procedure and is not part of the
public regression.

The module distinguishes `invalid_input`, `unsupported_pose`, and runtime
`error` from an image with no observed candidate. Short or weak tracks are
`insufficient_evidence`, not a claim that a line is absent. Input and corridor
pixel limits keep browser memory and runtime bounded.

Run the public regression with the existing project TypeScript tool and an
already-provided browser-test module:

```sh
PLAYWRIGHT_MODULE=/path/to/existing/playwright npm run verify:additional-crease
```

The regression includes resolution 1x/2x/3x, coordinate-offset, curved and
sloped tracks, separated fragments, contrast/length cases, horizontal and
lighting negatives, NaN/degenerate landmarks, and 90°/180° unsupported-pose
checks. It does not contain or load private photos or landmarks.
