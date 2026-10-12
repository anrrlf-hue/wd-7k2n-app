// Synthetic observations for lifecycle tests; these are not recognition evidence.
const line = { detected: true, length: "보통", curve: "완만한 곡선", depthStrength: "보통", start: { x: 0.2, y: 0.3 }, end: { x: 0.7, y: 0.8 }, branchDetected: null };
export const palmFixture = {
  handSide: "right", imageQuality: "good", handShape: "square",
  majorLines: ["생명선", "감정선", "두뇌선"],
  lineFeatures: ["생명선", "감정선", "두뇌선"].map(name => ({ name, detected: true, length: "보통", direction: "완만한 곡선", confidence: 0.8 })),
  onnxLines: { modelExecuted: true, heartLine: line, headLine: line, lifeLine: line, fateLine: { presence: "unknown", note: "" }, mounts: "unknown", marks: "unknown" },
  confidence: 0.8, warnings: [],
};
export const birthFixture = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" };
