// One-shot diagnostic caller. The production/customer path does not call this.
// It intentionally refuses rounded prepared-crop fixtures.
import fs from "node:fs";
import crypto from "node:crypto";
import "./register-test-typescript.mjs";
const { analyzeLandmarkRidgeMap } = await import("../src/lib/prototypes/landmark-ridge-candidates.ts");

const base = process.env.PALM_EVIDENCE_DIR ?? "/tmp/palm-public-af9b9a9";
const transformPath = `${base}/exact-transform-meta.json`;
const cropPath = `${base}/prepared-crop-browser-canvas.png`;
const responsePath = `${base}/itk-v540-fixed-1-2-4-8/maximum-response-f32.raw`;
const outputPath = `${base}/itk-v540-fixed-1-2-4-8/landmark-ridge-provenance-analysis.json`;
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const fail = message => { throw new Error(`PROVENANCE_FAIL: ${message}`); };
const transform = JSON.parse(fs.readFileSync(transformPath, "utf8"));
const cropSha = sha256(cropPath);
if (transform.sourceSha256 !== "c49aeecada0c1f72714b3220b9bd37b588c76955602dbb504018ac32158dde5f") fail("source photo hash mismatch");
if (cropSha !== "9eb92ec2abe81b27fc13a2e2607c1ff59e78a409accaac1581580fb5cf233dc3") fail("browser crop hash mismatch");
if (transform.expectedPriorPngSha256 !== cropSha) fail("transform/crop provenance mismatch");
if (transform.landmarksCoordinateSpace !== "raw-crop-px") fail("non-raw-crop landmark coordinate space");
if (transform.rawCropTransform?.rawCropSize?.width !== 924 || transform.rawCropTransform?.rawCropSize?.height !== 1186) fail("landmark crop dimensions mismatch");
const landmarks = transform.landmarks;
if (!Array.isArray(landmarks) || landmarks.length !== 21 || landmarks.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) fail("landmarks are not the exact 21 finite raw-crop points");
if (Math.abs(landmarks[0].x - 512.83266991041) > 1e-9 || Math.abs(landmarks[0].y - 1085.9465293965736) > 1e-9) fail("point 0 is not the exact metadata value");
const bytes = fs.readFileSync(responsePath);
if (bytes.byteLength !== 924 * 1186 * 4) fail("raw response byte length mismatch");
const response = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
const result = analyzeLandmarkRidgeMap({ width: 924, height: 1186, response }, landmarks);
const summary = {
  input: { sourceSha256: transform.sourceSha256, cropSha256: cropSha, responsePath, responseFormat: "little-endian Float32Array", responseRange: [response.reduce((value, item) => Math.min(value, item), Infinity), response.reduce((value, item) => Math.max(value, item), -Infinity)], dimensions: [924, 1186] },
  landmarks: { coordinateSpace: transform.landmarksCoordinateSpace, count: landmarks.length, point0: landmarks[0], fixtureRejected: true },
  analysis: { status: result.status, roiPixels: result.roiMask.reduce((sum, value) => sum + value, 0), responsePixels: result.responseMask.reduce((sum, value) => sum + value, 0), candidates: result.candidates.map(candidate => ({ kind: candidate.kind, status: candidate.status, componentSize: candidate.componentSize, responseMean: candidate.responseMean, density: candidate.density, alongSpan: candidate.alongSpan, acrossSpan: candidate.acrossSpan, occupiedBins: candidate.occupiedBins, maximumEmptyBinRun: candidate.maximumEmptyBinRun, directionTurnMaxDeg: candidate.directionTurnMaxDeg })) },
  interpretation: "Diagnostic ridge evidence only; thumb_side_curve is not an anatomical 판정 or recovered palm line. No ITK rerun, parameter tuning, gap bridging, or path reconstruction was performed."
};
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
