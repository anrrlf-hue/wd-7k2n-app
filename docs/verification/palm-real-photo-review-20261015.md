# Real-photo palm review summary

- Integration HEAD reviewed: `618b3c202bac18e10fcff01f75c156ed40c17d31`
- Recognition code comparison with `2730061`: no diff in the crop, ONNX line, or life-line geometry modules.
- Inputs: two existing Library photos used only in a local temporary workspace. No photo, overlay, or personal customer output is committed here.

## Result summary

Both photos passed hand/quality checks and used the raw crop path. The worker produced distinct crop sizes and line pixel counts for the two photos. Both produced a detected/measurable life-line segment, but both were classified as short and near-straight and remained `anatomicalStatus=unconfirmed` with `short_or_missing_geometry`.

The review does not treat path length or point counts as accuracy. The visible source image and normalized crop paths indicate that the current output is insufficient to prove a complete thumb-side life line; lowering the guard would risk promoting a wrong crease. Exact source-frame overlay needs the crop transform and MediaPipe landmarks to be retained in a local diagnostic artifact; those are not part of customer `PalmFacts`.

## Code change

The bilateral result path previously rendered only `PalmBilateralSection`, so the single-hand `handOverview` passage was omitted. It now renders each usable hand's existing `handOverview` passage once under `손별로 확인한 형태`, labelled `왼손 입력 사진` / `오른손 입력 사진`. It does not expose raw ratios, diagnostic numbers, or personality assertions, and it does not alter life-line gating.

## Targeted verification

- `next build --webpack`: passed.
- TypeScript and targeted ESLint: passed.
- Existing synthetic customer DOM/API regression with the new bilateral assertion: passed.
- Real-photo facts reinserted into the local API/UI without re-running recognition: the bilateral screen showed both hand observations and did not expose raw ratio fields.
- Remaining: no claim of independent recognition accuracy; actual hand-photo quality and additional-line evaluation remain open.
