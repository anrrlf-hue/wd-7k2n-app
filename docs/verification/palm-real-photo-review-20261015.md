# Real-photo palm review summary

- Integration HEAD reviewed before this diagnostic change: `618b3c202bac18e10fcff01f75c156ed40c17d31`
- Recognition code comparison with `2730061`: no diff in the crop, ONNX line, or life-line geometry modules.
- Inputs: two existing Library photos used only in a local temporary workspace. No photo, overlay, or personal customer output is committed here.

## Result summary

Both photos passed hand/quality checks and used the raw crop path. The worker produced distinct crop sizes and line pixel counts for the two photos. Both produced a detected/measurable life-line segment, but both were classified as short and near-straight and remained `anatomicalStatus=unconfirmed` with `short_or_missing_geometry`.

The review does not treat path length or point counts as accuracy. The visible source image and normalized crop paths indicate that the current output is insufficient to prove a complete thumb-side life line; lowering the guard would risk promoting a wrong crease.

## Local diagnostic result

The test-only worker boundary now captures source-frame landmarks, exact raw/adaptive crop transforms, model masks, and selected paths only when a non-production build is run with `palmDebug=1`. The snapshot is delivered to a local test event and is not part of customer `PalmFacts`; production builds compile the hook off. Raw inputs, masks, landmarks, and overlays remain outside the repository.

Two fresh worker runs were made, one per existing Library photo. Source-frame overlays were generated locally from the captured transform and life-line path. In both photo A and photo B, the selected life-line path lands on a short, near-vertical central crease, not the visible thumb-side arc. The model therefore selected a false candidate/foreground component; the `short_or_missing_geometry` guard correctly kept the result unconfirmed. No guard was lowered and no coordinates were extended.

The saved raw class-3 masks were also checked without re-inference: photo A had one 8-connected class-3 component (630 pixels), and photo B had one (1,233 pixels). The selected component was therefore the only available class-3 component in each case; there was no discarded larger life-line component. This is an argmax segmentation limitation, not a largest-component selector bug. Because all three raw lines were detected, the existing sequence correctly skipped the enhanced fallback; changing that order would be a separate model-validation change.

## Code change

The bilateral result path previously rendered only `PalmBilateralSection`, so the single-hand `handOverview` passage was omitted. It now renders each usable hand's existing `handOverview` passage once under `손별로 확인한 형태`, labelled `왼손 입력 사진` / `오른손 입력 사진`. It does not expose raw ratios, diagnostic numbers, or personality assertions, and it does not alter life-line gating.

## Targeted verification

- `next build --webpack`: passed.
- TypeScript and targeted ESLint: passed.
- Production regression with `?palmDebug=1` and a mocked worker: `productionDebugEvents=0`.
- Direct worker `debug: true` gate regression: passed; production rejects the request before any mask/coordinate diagnostic is emitted.
- Existing synthetic customer DOM/API regression with the new bilateral assertion: passed.
- Real-photo facts reinserted into the local API/UI without re-running recognition: the bilateral screen showed both hand observations and did not expose raw ratio fields.
- Remaining: no claim of independent recognition accuracy; actual hand-photo quality and additional-line evaluation remain open. Local diagnostic artifacts are intentionally not committed.
