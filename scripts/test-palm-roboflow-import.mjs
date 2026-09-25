import {
  parseClassNamesFromDataYaml,
  findSunClassIds,
  parseYoloSegRow,
  polygonToCenterline,
  convertSegLabelText,
} from "./import-roboflow-palm-secondary.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const yaml = [
  "path: .",
  "train: train/images",
  "valid: valid/images",
  "names:",
  "  0: fate_line",
  "  1: head_line",
  "  2: heart_line",
  "  3: life_line",
  "  4: mercury_line",
  "  5: solar_line",
].join("\n");

const names = parseClassNamesFromDataYaml(yaml);
assert(names.get(5) === "solar_line", "solar class parse failed");
assert(findSunClassIds(names).join(",") === "5", "solar class id detection failed");

const row = parseYoloSegRow("5 0.45 0.85 0.47 0.55 0.48 0.2 0.52 0.2 0.53 0.55 0.55 0.85");
assert(row.classId === 5, "class id parse failed");
assert(row.points.length === 6, "point parse failed");

const curvedThinPolygon = [
  [0.45, 0.86],
  [0.46, 0.68],
  [0.47, 0.50],
  [0.49, 0.32],
  [0.51, 0.18],
  [0.55, 0.18],
  [0.53, 0.32],
  [0.51, 0.50],
  [0.50, 0.68],
  [0.49, 0.86],
];

const center = polygonToCenterline(curvedThinPolygon, 10);
assert(center.length === 10, "centerline sample count failed");
assert(center.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1), "centerline outside normalized bounds");

const segText = [
  "4 0.70 0.85 0.72 0.55 0.74 0.25 0.78 0.25 0.76 0.55 0.74 0.85",
  "5 " + curvedThinPolygon.flat().join(" "),
].join("\n");

const doc = convertSegLabelText(segText, names, {
  filename: "sample.jpg",
  dataset: "fixture",
  license: "CC BY 4.0",
});

assert(doc.lines.sun.points.length === 10, "sun line was not imported");
assert(doc.lines.wealth.points.length === 0, "mercury must not silently become wealth");
assert(doc.provenance.sourceClass === "solar_line/sun_line", "provenance class missing");
assert(/not mapped to wealth/.test(doc.provenance.note), "semantic guard note missing");

console.log("PALM ROBoflow IMPORT REGRESSION RESULTS");
console.log({
  sunClassIds: findSunClassIds(names),
  sunPoints: doc.lines.sun.points.length,
  wealthPoints: doc.lines.wealth.points.length,
  sourceClass: doc.provenance.sourceClass,
});
console.log("PASS 5/5");
