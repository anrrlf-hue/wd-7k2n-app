import {
  convertLabelDocument,
  resamplePolyline,
  toYoloPoseRow,
} from "./export-palm-secondary-yolo-pose.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sampled = resamplePolyline([[0.2, 0.8], [0.5, 0.2]], 10);
assert(sampled.length === 10, "expected 10 keypoints");
assert(Math.abs(sampled[0][0] - 0.2) < 1e-6, "first x changed");
assert(Math.abs(sampled[0][1] - 0.8) < 1e-6, "first y changed");
assert(Math.abs(sampled[9][0] - 0.5) < 1e-6, "last x changed");
assert(Math.abs(sampled[9][1] - 0.2) < 1e-6, "last y changed");

const row = toYoloPoseRow(1, [[0.4, 0.9], [0.42, 0.6], [0.45, 0.3]]);
assert(row, "row missing");
const fields = row.split(" ");
assert(fields.length === 35, `expected 35 fields, got ${fields.length}`);
assert(fields[0] === "1", "wrong class id");

const doc = {
  schemaVersion: 1,
  source: { filename: "sample.jpg", width: 1000, height: 1200 },
  handSide: "unknown",
  lines: {
    fate: { points: [[0.5, 0.9], [0.51, 0.5], [0.52, 0.2]] },
    sun: { points: [] },
    wealth: { points: [[0.75, 0.5], [0.77, 0.25]] },
  },
};
const rows = convertLabelDocument(doc, "sample.palm-labels.json");
assert(rows.length === 2, `expected 2 labeled rows, got ${rows.length}`);
assert(rows[0].startsWith("0 "), "fate class missing");
assert(rows[1].startsWith("2 "), "wealth class missing");

let rejected = false;
try {
  convertLabelDocument({
    schemaVersion: 1,
    lines: {
      fate: { points: [[0.5, 0.5]] },
      sun: { points: [] },
      wealth: { points: [] },
    },
  }, "bad.palm-labels.json");
} catch {
  rejected = true;
}
assert(rejected, "single-point label must be rejected");

console.log("PALM SECONDARY EXPORT REGRESSION RESULTS");
console.log("keypoint_resampling PASS");
console.log("yolo_pose_row PASS");
console.log("empty_line_skip PASS");
console.log("invalid_single_point_rejected PASS");
console.log("PASS 4/4");
