# 공개사진 손금 진단 검수 기록

검수 기준일: `2026-10-13T00:00:00Z`  
review branch HEAD: `fb48e8c5a2d841c98904e17b81c7921816e68278`  
판정: 무료 손금 후보 비교는 미채택. 같은 사진의 parameter 탐색은 중단.

## 범위와 개인정보 경계

- 공개 Wikimedia 사진의 수치 진단만 기록했다. 공개사진 원본·crop·overlay는 저장소에 복사하지 않았다.
- 사용자 개인 사진, private 산출물, 외부 전송 결과는 포함하지 않았다.
- 저장소에는 수치·설정·hash·실패/정정 이력과 재현 caller만 남겼다.

## 유효 입력 provenance

- 공개 source photo SHA-256: `c49aeecada0c1f72714b3220b9bd37b588c76955602dbb504018ac32158dde5f`
- exact browser crop SHA-256: `9eb92ec2abe81b27fc13a2e2607c1ff59e78a409accaac1581580fb5cf233dc3`
- crop: `924×1186`
- landmark source: `exact-transform-meta.json`, `landmarksCoordinateSpace=raw-crop-px`, exact 21-point fractional coordinates
- point 0: `(512.83266991041, 1085.9465293965736)`
- response: preserved little-endian Float32 raw map, `924×1186`, range `0–1`; display PNG and min-max visualization were not analysis inputs
- response raw path during review: `/tmp/palm-public-af9b9a9/itk-v540-fixed-1-2-4-8/maximum-response-f32.raw`

Reproduction caller: `scripts/run-landmark-ridge-provenance.mjs`. It rejects the rounded `prepared-crop-px` fixture, validates source/crop hashes and exact transform metadata, then calls only the diagnostic ROI analyzer.

## ITK comparison

Algorithm: ITK `5.4.0` `MultiScaleHessianBasedMeasureImageFilter` + `HessianToObjectnessMeasureImageFilter`.

Fixed settings:

- float32 grayscale source values 0–255, spacing `(1,1)`
- `ObjectDimension=1`
- `BrightObject=false`
- `ScaleObjectnessMeasure=false`
- `Beta=0.5`, `Gamma=5`, `Alpha=0.5`
- exact observed winning scales: `0, 1, 2, 4, 8` (`0` means no response)

The filter was run once. Runtime was `9.52s`, maximum RSS `769376 KiB`, isolated `/tmp` environment size about `1.6G`. Official references: [ITK v5.4.0 source](https://github.com/InsightSoftwareConsortium/ITK/blob/v5.4.0/Modules/Filtering/ImageFeature/include/itkMultiScaleHessianBasedMeasureImageFilter.hxx) and [official Python example](https://examples.itk.org/src/nonunit/review/segmentbloodvesselswithmultiscalehessianbasedmeasure/documentation).

## Corrected ROI result

Using the exact fractional raw-crop landmarks and the preserved raw response:

- anatomical normalized ROI pixels: `199,962`
- response pixels at fixed threshold `0.65`: `132,937`
- largest response component: `105,472` pixels
- candidate result: `insufficient_evidence`
- the diagnostic label `thumb_side_curve` is not an anatomical life-line decision and is not a recovered palm line

The largest component occupied too much of the ROI and represented dense ridge/texture response, so the candidate was rejected. No gap bridging, path reconstruction, or same-photo parameter tuning was performed.

## Invalid evidence excluded

- Earlier rounded `prepared-crop-px` landmark run and its ROI numbers are invalid for the actual landmark evaluation and are not mixed with the corrected result.
- The manual/scaffold trace was post-hoc visualization only, never a seed or ground truth.
- The initial fractional-probe NaN/undefined indexing run is invalid and excluded; only the fixed finite-probe NMS run was retained for historical comparison.
- Temporary artifacts such as `path-undefined-undefined.json` and scaffold/manual-trace reports remain outside the repository and are not evidence in this document.

## Current customer path audit

The customer path still uses the existing three-class ONNX model:

- `src/lib/palm-line-onnx.ts` imports the vendored `palm-line-reader` model and maps classes `heart_line`, `head_line`, `life_line`.
- `src/lib/palm-detection.ts` stores those three outputs in `PalmFacts.onnxLines` and chooses raw/enhanced variants.
- `src/lib/palm-customer-reading.ts` turns a detected `lifeLine` curve into customer prose such as 생활/활동 리듬. This is still a model-classified segment, not a validated anatomical life line.
- `src/components/palm/palm-reading-sections.tsx` renders the resulting passage; if no passage is usable, the actual body is: `이번 사진에서는 개인 손금 풀이에 사용할 모양을 확인하지 못했습니다. 다시 촬영하거나 다른 사진을 선택해주세요.`
- Quality/model failure reasons are separately surfaced through `describePalmFailureReasons`, e.g. `손금선 분석 모델이 이번 사진을 처리하지 못했어요.` or `현재 분석 모델이 주요 선을 충분히 읽지 못했어요.`

Therefore the precise release blocker remains: the customer flow can still present the existing three-line model's life-line interpretation when its segment is marked detected, despite the diagnostic comparison not validating anatomical identity, whole-path completeness, or line semantics. The corrected prototype does not repair or replace that customer path.

## Prototype isolation

The new diagnostic modules are imported only by diagnostic scripts:

- `src/lib/prototypes/major-crease-candidates.ts`
- `src/lib/prototypes/connected-crease-paths.ts`
- `src/lib/prototypes/landmark-ridge-candidates.ts`

Repository import search found no imports from `src/lib/prototypes/*` in customer components, API routes, `palm-detection.ts`, or the customer reading modules. The provenance caller is an explicit review script only. Main/Production were not changed.

## Safe completed vs remaining blocker

Completed safely: provenance validation, raw response preservation, invalid fixture separation, diagnostic-only ROI guards, no-gap invariant tests, and prototype/customer import isolation.

Not complete: trustworthy automatic distinction of life/heart/head/fate/sun/wealth lines; replacement of the current three-line customer model; full rich two-hand/secondary-line interpretation; and release-quality customer palm readings. The app must not be marked fully launched on the strength of this diagnostic work.
