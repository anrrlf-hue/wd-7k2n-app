# Palm secondary-line research

Purpose: build local training/evaluation assets for palm lines that the current production models do not reliably cover, especially **sun** and **wealth** lines.

## Privacy rule

- Keep raw palm photos under `data/palm-secondary/images/` or `data/palm-secondary/raw/`.
- Those folders are git-ignored.
- Do not commit personal hand photos.
- Exported labels may be committed only when they contain normalized coordinates and no personal metadata.

## Label tool

Open `tools/palm-secondary-labeler.html` in a browser.

1. Load one palm photo.
2. Select fate / sun / wealth.
3. Click points along the visible crease from wrist-side toward finger-side.
4. Leave the array empty when the line is not actually visible.
5. Export the JSON.

Label JSON shape:

```json
{
  "schemaVersion": 1,
  "source": {
    "filename": "example.jpg",
    "width": 1152,
    "height": 1536
  },
  "handSide": "unknown",
  "lines": {
    "fate": { "points": [[0.5, 0.8], [0.51, 0.6]] },
    "sun": { "points": [] },
    "wealth": { "points": [] }
  }
}
```

Coordinates are normalized to `0..1`.

## Promotion rule

Do not use a newly trained sun/wealth detector in customer interpretation just because training loss looks good.

Required sequence:

1. collect labels,
2. split train/validation/test by source image,
3. benchmark false positives on ordinary palm wrinkles,
4. compare against current ROI heuristic,
5. verify on representative smartphone photos,
6. only then add a customer-facing reading.

The existing main 3-line segmentation model remains the primary detector for heart/head/life. The four-line pose model is currently used only as a corroborating fate-line detector.


## Public sun-line bootstrap

A separate importer exists for authorized Roboflow YOLO segmentation exports that contain `solar_line` or `sun_line`:

```bash
node scripts/import-roboflow-palm-secondary.mjs <datasetRoot> <outputRoot>
```

It converts thin segmentation polygons into 10-point centerlines compatible with this project's secondary-line label/export format.

Important:

- `solar_line` / `sun_line` is imported as `sun`.
- `mercury_line` is **not** silently imported as `wealth`.
- Public labels are bootstrap data, not production evidence.
- Before customer-facing use, retrain/evaluate on representative smartphone photos and measure false positives against ordinary wrinkles.
