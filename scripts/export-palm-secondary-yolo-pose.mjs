import fs from "node:fs";
import path from "node:path";

const CLASS_ID = { fate: 0, sun: 1, wealth: 2 };
const CLASS_NAMES = ["fate", "sun", "wealth"];
const KEYPOINT_COUNT = 10;

function fail(message) {
  throw new Error(message);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v)));
}

function validatePoints(points, name, file) {
  if (!Array.isArray(points)) fail(`${file}: ${name}.points must be an array`);
  for (const p of points) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) {
      fail(`${file}: invalid point in ${name}`);
    }
    if (p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1) {
      fail(`${file}: ${name} point outside 0..1`);
    }
  }
}

export function resamplePolyline(points, count = KEYPOINT_COUNT) {
  if (points.length < 2) return [];
  const segments = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const length = Math.hypot(dx, dy);
    segments.push({ from: points[i - 1], to: points[i], length, start: total });
    total += length;
  }
  if (total <= 1e-8) return Array.from({ length: count }, () => [...points[0]]);

  const result = [];
  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    let seg = segments[segments.length - 1];
    for (const candidate of segments) {
      if (target <= candidate.start + candidate.length) {
        seg = candidate;
        break;
      }
    }
    const local = seg.length > 0 ? (target - seg.start) / seg.length : 0;
    result.push([
      clamp01(seg.from[0] + (seg.to[0] - seg.from[0]) * local),
      clamp01(seg.from[1] + (seg.to[1] - seg.from[1]) * local),
    ]);
  }
  return result;
}

export function toYoloPoseRow(classId, points, padding = 0.02) {
  const sampled = resamplePolyline(points, KEYPOINT_COUNT);
  if (!sampled.length) return null;

  const xs = sampled.map((p) => p[0]);
  const ys = sampled.map((p) => p[1]);
  const x0 = clamp01(Math.min(...xs) - padding);
  const y0 = clamp01(Math.min(...ys) - padding);
  const x1 = clamp01(Math.max(...xs) + padding);
  const y1 = clamp01(Math.max(...ys) + padding);
  const w = Math.max(1e-5, x1 - x0);
  const h = Math.max(1e-5, y1 - y0);
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;

  const fields = [classId, cx, cy, w, h];
  for (const [x, y] of sampled) fields.push(x, y, 2);
  return fields.map((v, i) => i === 0 ? String(v) : Number(v).toFixed(6)).join(" ");
}

export function convertLabelDocument(doc, file = "label.json") {
  if (doc?.schemaVersion !== 1) fail(`${file}: unsupported schemaVersion`);
  if (!doc?.lines || typeof doc.lines !== "object") fail(`${file}: missing lines`);

  const rows = [];
  for (const name of CLASS_NAMES) {
    const points = doc.lines?.[name]?.points ?? [];
    validatePoints(points, name, file);
    if (points.length === 0) continue;
    if (points.length < 2) fail(`${file}: ${name} needs at least 2 points or 0 points`);
    const row = toYoloPoseRow(CLASS_ID[name], points);
    if (row) rows.push(row);
  }
  return rows;
}

function main() {
  const labelsDir = process.argv[2];
  const outDir = process.argv[3];
  if (!labelsDir || !outDir) {
    console.error("Usage: node scripts/export-palm-secondary-yolo-pose.mjs <labelsDir> <outDir>");
    process.exit(2);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(labelsDir).filter((name) => name.endsWith(".palm-labels.json")).sort();
  let exported = 0;

  for (const name of files) {
    const full = path.join(labelsDir, name);
    const doc = JSON.parse(fs.readFileSync(full, "utf8"));
    const rows = convertLabelDocument(doc, name);
    const stem = name.replace(/\.palm-labels\.json$/, "");
    fs.writeFileSync(path.join(outDir, stem + ".txt"), rows.join("\n") + (rows.length ? "\n" : ""));
    exported++;
  }

  const yaml = [
    "# YOLO pose dataset config for palm secondary lines",
    "path: .",
    "train: images/train",
    "val: images/val",
    "test: images/test",
    "kpt_shape: [10, 3]",
    "flip_idx: [9,8,7,6,5,4,3,2,1,0]",
    "names:",
    "  0: fate",
    "  1: sun",
    "  2: wealth",
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "data.yaml"), yaml);
  console.log(`EXPORT PASS files=${exported} classes=${CLASS_NAMES.join(",")}`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) main();
