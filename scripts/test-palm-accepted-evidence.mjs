import "./register-test-typescript.mjs";
import assert from "node:assert/strict";
import { palmFixture } from "./fixtures/palm-analysis.mjs";

const { buildPalmContextReading } = await import("../src/lib/palm-context-reading.ts");
const { buildPalmBilateralReading } = await import("../src/lib/palm-bilateral.ts");
const { validateReadingPlan } = await import("../src/lib/reading-plan.ts");

const left = structuredClone(palmFixture);
left.handSide = "left";
const right = structuredClone(palmFixture);

// Keep ONNX candidates present but reject the corresponding final Sobel
// selections. These are the conditions that previously leaked into prose.
left.lineFeatures[1].detected = false; // heart
right.lineFeatures[1].detected = false; // heart
left.lineFeatures[2].detected = true; // head accepted on the left only
right.lineFeatures[2].detected = false;
left.onnxLines.heartLine.curve = "������ �����";
right.onnxLines.heartLine.curve = "�ϸ��� �";
left.onnxLines.headLine.curve = "������ �����";
right.onnxLines.headLine.curve = "�ϸ��� �";

const plan = buildPalmContextReading(left, right, "right");
validateReadingPlan(plan);
assert.ok(!plan.passages.some(p => p.id === "heartLine-bilateral-difference"));
assert.ok(!plan.passages.some(p => p.id === "headLine-bilateral-difference"));
assert.ok(!plan.passages.some(p => p.id === "head-heart-composition"));
assert.equal(plan.evidence.some(e => e.id === "right.heartLine.curve"), false);
assert.equal(plan.evidence.some(e => e.id === "right.headLine.curve"), false);

const report = buildPalmBilateralReading(left, right, "right");
assert.equal(report.items.some(item => item.text.includes("������ �����") || item.text.includes("�ϸ��� �")), false);
assert.equal(report.items.some(item => item.text.includes("�������� ����� ����� ����")), false);

console.log("PASS accepted line evidence gates bilateral prose and evidence fields");
