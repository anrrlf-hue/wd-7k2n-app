# Public palm-line research sources

This file records external sources considered for secondary-line research. It is not a statement that any source is production-ready.

## 1. PalmVeda / Lines

- URL: https://universe.roboflow.com/palmveda/lines-ermuj
- Task: instance segmentation
- License shown by Roboflow Universe: CC BY 4.0
- Images shown: 63
- Relevant classes: fate_line, mercury_line, sun_line, plus major palm lines
- Current use: **research/bootstrap candidate only**
- Reason not production-ready: small dataset and no published production benchmark for our smartphone capture conditions.

## 2. ProjectDetect / Palmprint Detection

- Located through Roboflow Universe search.
- Images shown in search: 30
- Relevant classes include Destiny-line, Fate-line, Mercury-line, Sun-line and major lines.
- Current use: **research reference only**
- Reason not production-ready: very small sample count; no evidence yet that it generalizes to our capture pipeline.

## 3. AstrologyAPI palm-reading endpoints

- Minor-lines API exposes stored analysis including sun-line presence.
- Money-reading API uses fate line, sun line and palm mounts.
- Current use: **business/feature benchmark only**
- Not selected as production vision path because it requires sending palm data to an external service and does not match the current browser-local processing design.

## Product rule

Do not turn a public dataset/API into a customer-facing claim just because it exists.

For sun/wealth-line product promotion:

1. obtain/produce labeled data with clear provenance,
2. validate on representative smartphone photos,
3. measure false positives against ordinary wrinkles,
4. compare with the existing ROI heuristic,
5. keep user palm images local unless the user explicitly opts into another processing path,
6. only expose lines that pass the product evidence gate.
