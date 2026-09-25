import fs from "node:fs";
import path from "node:path";

const SUN_CLASS_ALIASES = new Set([
  "sun_line",
  "sun line",
  "solar_line",
  "solar line",
  "apollo_line",
  "apollo line",
]);

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[-]+/g, "_")
    .replace(/\s+/g, " ");
}

export function parseClassNamesFromDataYaml(text) {
  const names = new Map();
  const lines = String(text).split(/\r?\n/);
  let inNames = false;
  let namesIndent = null;

  for (const raw of lines) {
    const line = raw.replace(/\t/g, "    ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!inNames) {
      const inline = trimmed.match(/^names\s*:\s*\[(.*)\]\s*$/);
      if (inline) {
        const items = inline[1]
          .split(",")
          .map((x) => x.trim().replace(/^["']|["']$/g, ""));
        items.forEach((name, index) => names.set(index, name));
        continue;
      }

      if (/^names\s*:\s*$/.test(trimmed)) {
        inNames = true;
        namesIndent = line.search(/\S/);
      }
      continue;
    }

    const indent = line.search(/\S/);
    if (indent <= namesIndent) {
      inNames = false;
      continue;
    }

    const m = trimmed.match(/^(\d+)\s*:\s*(.+?)\s*$/);
    if (m) {
      names.set(Number(m[1]), m[2].replace(/^["']|["']$/g, ""));
      continue;
    }

    const list = trimmed.match(/^[-]\s*(.+?)\s*$/);
    if (list) {
      names.set(names.size, list[1].replace(/^["']|["']$/g, ""));
    }
  }

  if (!names.size) throw new Error("Could not parse class names from data.yaml");
  return names;
}

export function findSunClassIds(classNames) {
  const ids = [];
  for (const [id, name] of classNames.entries()) {
    const normalized = normalizeName(name).replace(/_/g, " ");
    const underscore = normalized.replace(/ /g, "_");
    if (SUN_CLASS_ALIASES.has(normalized) || SUN_CLASS_ALIASES.has(underscore)) ids.push(id);
  }
  return ids;
}

export function parseYoloSegRow(line) {
  const fields = String(line).trim().split(/\s+/).map(Number);
  if (fields.length < 7 || fields.some((v) => !Number.isFinite(v))) {
    throw new Error("Invalid YOLO segmentation row");
  }
  const classId = Math.trunc(fields[0]);
  const coords = fields.slice(1);
  if (coords.length % 2 !== 0) throw new Error("YOLO segmentation row must contain x/y pairs");
  const points = [];
  for (let i = 0; i < coords.length; i += 2) {
    points.push([
      Math.max(0, Math.min(1, coords[i])),
      Math.max(0, Math.min(1, coords[i + 1])),
    ]);
  }
  return { classId, points };
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

export function resamplePolyline(points, count = 10) {
  if (!Array.isArray(points) || points.length < 2) return [];
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const length = dist(points[i - 1], points[i]);
    segs.push({ a: points[i - 1], b: points[i], start: total, length });
    total += length;
  }
  if (total <= 1e-9) return Array.from({ length: count }, () => [...points[0]]);

  const out = [];
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    let seg = segs[segs.length - 1];
    for (const candidate of segs) {
      if (target <= candidate.start + candidate.length) {
        seg = candidate;
        break;
      }
    }
    const t = seg.length ? (target - seg.start) / seg.length : 0;
    out.push([
      seg.a[0] + (seg.b[0] - seg.a[0]) * t,
      seg.a[1] + (seg.b[1] - seg.a[1]) * t,
    ]);
  }
  return out;
}

function forwardPath(points, from, to) {
  const out = [points[from]];
  let i = from;
  while (i !== to) {
    i = (i + 1) % points.length;
    out.push(points[i]);
    if (out.length > points.length + 1) throw new Error("polygon traversal overflow");
  }
  return out;
}

function backwardPath(points, from, to) {
  const out = [points[from]];
  let i = from;
  while (i !== to) {
    i = (i - 1 + points.length) % points.length;
    out.push(points[i]);
    if (out.length > points.length + 1) throw new Error("polygon traversal overflow");
  }
  return out;
}

export function polygonToCenterline(points, count = 10) {
  if (!Array.isArray(points) || points.length < 4) return [];

  let bestI = 0;
  let bestJ = 1;
  let bestDistance = -1;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = dist(points[i], points[j]);
      if (d > bestDistance) {
        bestDistance = d;
        bestI = i;
        bestJ = j;
      }
    }
  }

  const sideA = resamplePolyline(forwardPath(points, bestI, bestJ), count);
  const sideB = resamplePolyline(backwardPath(points, bestI, bestJ), count);
  if (!sideA.length || !sideB.length) return [];

  return sideA.map((p, i) => [
    Math.max(0, Math.min(1, (p[0] + sideB[i][0]) / 2)),
    Math.max(0, Math.min(1, (p[1] + sideB[i][1]) / 2)),
  ]);
}

export function convertSegLabelText(text, classNames, source = {}) {
  const sunIds = new Set(findSunClassIds(classNames));
  if (!sunIds.size) throw new Error("No solar_line/sun_line class found in dataset");

  const candidates = [];
  for (const raw of String(text).split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const row = parseYoloSegRow(raw);
    if (!sunIds.has(row.classId)) continue;
    const centerline = polygonToCenterline(row.points, 10);
    if (centerline.length) candidates.push(centerline);
  }

  candidates.sort((a, b) => polylineLength(b) - polylineLength(a));
  const sun = candidates[0] ?? [];

  return {
    schemaVersion: 1,
    source: {
      filename: source.filename ?? "unknown",
      width: source.width ?? null,
      height: source.height ?? null,
    },
    handSide: "unknown",
    lines: {
      fate: { points: [] },
      sun: { points: sun },
      wealth: { points: [] },
    },
    provenance: {
      importedFrom: source.dataset ?? "roboflow-yolo-seg",
      sourceLabelFile: source.labelFile ?? null,
      sourceClass: "solar_line/sun_line",
      license: source.license ?? null,
      note: "Mercury-line is deliberately not mapped to wealth without a separate semantic review.",
    },
  };
}

function main() {
  const datasetRoot = process.argv[2];
  const outRoot = process.argv[3];
  if (!datasetRoot || !outRoot) {
    console.error("Usage: node scripts/import-roboflow-palm-secondary.mjs <roboflowDatasetRoot> <outRoot>");
    process.exit(2);
  }

  const dataYaml = fs.readFileSync(path.join(datasetRoot, "data.yaml"), "utf8");
  const classNames = parseClassNamesFromDataYaml(dataYaml);
  const sunIds = findSunClassIds(classNames);
  if (!sunIds.length) throw new Error("Dataset has no supported sun/solar line class");

  let converted = 0;
  let withSun = 0;
  for (const split of ["train", "valid", "val", "test"]) {
    const labelsDir = path.join(datasetRoot, split, "labels");
    if (!fs.existsSync(labelsDir)) continue;
    const outDir = path.join(outRoot, split === "val" ? "valid" : split);
    fs.mkdirSync(outDir, { recursive: true });

    for (const name of fs.readdirSync(labelsDir).filter((x) => x.endsWith(".txt")).sort()) {
      const labelPath = path.join(labelsDir, name);
      const doc = convertSegLabelText(fs.readFileSync(labelPath, "utf8"), classNames, {
        filename: name.replace(/\.txt$/, ""),
        labelFile: path.relative(datasetRoot, labelPath).replace(/\\/g, "/"),
        dataset: "Roboflow Universe export",
      });
      if (doc.lines.sun.points.length) withSun++;
      const outName = name.replace(/\.txt$/, ".palm-labels.json");
      fs.writeFileSync(path.join(outDir, outName), JSON.stringify(doc, null, 2) + "\n");
      converted++;
    }
  }

  console.log(`IMPORT PASS files=${converted} withSun=${withSun} sunClassIds=${sunIds.join(",")}`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) main();
