// Synthetic observations for lifecycle tests; these are not recognition evidence.
const line = { detected: true, length: "보통", curve: "완만한 곡선", depthStrength: "보통", start: { x: 0.2, y: 0.3 }, end: { x: 0.7, y: 0.8 }, branchDetected: null, pathPoints: [{ x: 0.2, y: 0.3 }, { x: 0.15, y: 0.45 }, { x: 0.32, y: 0.62 }, { x: 0.7, y: 0.8 }], anatomicalStatus: "supported", anatomicalReason: "thumb_side_segment" };
export const palmFixture = {
  handSide: "right", imageQuality: "good", handShape: "square",
  majorLines: ["생명선", "감정선", "두뇌선"],
  lineFeatures: ["생명선", "감정선", "두뇌선"].map(name => ({ name, detected: true, length: "보통", direction: "완만한 곡선", confidence: 0.8 })),
  onnxLines: { modelExecuted: true, heartLine: structuredClone(line), headLine: structuredClone(line), lifeLine: structuredClone(line), fateLine: { presence: "unknown", note: "" }, mounts: "unknown", marks: "unknown" },
  confidence: 0.8, warnings: [],
};
export const birthFixture = { year: 2001, month: 2, day: 3, hour: 10, minute: 0, gender: "남" };

