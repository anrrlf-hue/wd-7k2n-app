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
tracks, pixel path length, continuity, contrast, ROI, and cross-variant path
stability. The result is explicitly `pixel_candidate_only`; corridor direction
is not a semantic fate/sun/wealth label.

The browser regression is in
`scripts/test-additional-vertical-crease-browser.mjs`. It runs the compiled
module against the two existing local photos and five local synthetic cases.
It does not call a network service or alter the app.
