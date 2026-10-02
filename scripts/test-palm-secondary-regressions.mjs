import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import ts from "typescript";
import { registerHooks } from "node:module";

const root = process.cwd();
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let target = path.join(root, "src", specifier.slice(2));
      if (fs.existsSync(target + ".ts")) target += ".ts";
      return nextResolve(pathToFileURL(target).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      const file = fileURLToPath(url);
      if (file.startsWith(root)) return {
        format: "module",
        source: ts.transpileModule(fs.readFileSync(file, "utf8"), {
          compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
const palm = await import(pathToFileURL(path.join(root, "src/lib/palm-line-features.ts")).href);
const reading = await import(pathToFileURL(path.join(root, "src/lib/palm-observation-text.ts")).href);

function image(width = 128, height = 128, value = 180) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

function setGray(img, x, y, v) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = v;
  img.data[i + 1] = v;
  img.data[i + 2] = v;
}

function signal(img) {
  return palm.analyzeVerticalCreaseBand(img, { x: 0, y: 0, width: img.width, height: img.height });
}

function classify(s) {
  if (
    s.continuity >= 0.38 &&
    s.contrast >= 0.25 &&
    s.density >= 0.08 &&
    s.widthSpan <= 0.42
  ) return "clear";
  if (
    s.continuity >= 0.22 &&
    s.contrast >= 0.18 &&
    s.density >= 0.04 &&
    s.widthSpan <= 0.55
  ) return "faint";
  return "not_seen";
}
const cases = [];

const blank = image();
cases.push(["blank", classify(signal(blank)), signal(blank)]);

const crease = image();
for (let y = 8; y < 120; y++) {
  setGray(crease, 63, y, 70);
  setGray(crease, 64, y, 70);
}
cases.push(["continuous_crease", classify(signal(crease)), signal(crease)]);

const wideTexture = image();
for (let y = 8; y < 120; y++) {
  const x = 28 + Math.round((y - 8) * 0.62);
  setGray(wideTexture, x, y, 70);
  setGray(wideTexture, x + 1, y, 70);
}
cases.push(["wide_vertical_texture", classify(signal(wideTexture)), signal(wideTexture)]);

const shadow = image();
for (let y = 0; y < shadow.height; y++) {
  for (let x = 0; x < shadow.width / 2; x++) setGray(shadow, x, y, 105);
}
cases.push(["shadow_boundary", classify(signal(shadow)), signal(shadow)]);

const horizontal = image();
for (let x = 8; x < 120; x++) {
  setGray(horizontal, x, 63, 70);
  setGray(horizontal, x, 64, 70);
}
cases.push(["horizontal_line", classify(signal(horizontal)), signal(horizontal)]);

const fragments = image();
for (let start = 8; start < 120; start += 24) {
  for (let y = start; y < Math.min(start + 7, 120); y++) {
    setGray(fragments, 63, y, 70);
    setGray(fragments, 64, y, 70);
  }
}
cases.push(["disconnected_fragments", classify(signal(fragments)), signal(fragments)]);
const noise = image();
let seed = 123456789;
for (let i = 0; i < 420; i++) {
  seed = (1664525 * seed + 1013904223) >>> 0;
  const x = seed % noise.width;
  seed = (1664525 * seed + 1013904223) >>> 0;
  const y = seed % noise.height;
  setGray(noise, x, y, 40);
}
cases.push(["salt_noise", classify(signal(noise)), signal(noise)]);

const byName = Object.fromEntries(cases.map(([name, status, s]) => [name, {
  status,
  continuity: s.continuity,
  widthSpan: s.widthSpan,
  contrast: s.contrast,
  density: s.density,
}]));
if (byName.continuous_crease.status !== "clear") throw new Error("continuous crease was not clear");
for (const name of ["blank", "wide_vertical_texture", "shadow_boundary", "horizontal_line", "disconnected_fragments", "salt_noise"]) {
  if (byName[name].status === "clear") throw new Error(`${name} incorrectly classified clear`);
}

console.log("PALM SECONDARY REGRESSION RESULTS");
for (const [name, result] of Object.entries(byName)) console.log(name, result);
console.log("PASS 7/7");

const sampleLines = {
  modelExecuted: true,
  heartLine: {
    detected: true,
    length: "보통",
    curve: "완만한 곡선",
    depthStrength: "보통",
    start: { x: 0.1, y: 0.2 },
    end: { x: 0.8, y: 0.25 },
    branchDetected: null,
  },
  headLine: {
    detected: true,
    length: "김",
    curve: "직선에 가까움",
    depthStrength: "강함",
    start: { x: 0.12, y: 0.4 },
    end: { x: 0.85, y: 0.42 },
    branchDetected: null,
  },
  lifeLine: {
    detected: true,
    length: "김",
    curve: "완만한 곡선",
    depthStrength: "보통",
    start: { x: 0.2, y: 0.35 },
    end: { x: 0.32, y: 0.9 },
    branchDetected: null,
  },
  fateLine: { presence: "unknown", note: "" },
  mounts: "unknown",
  marks: "unknown",
};

const clearSecondary = {
  fate: {
    status: "clear",
    strength: 0.7,
    span: 0.72,
    note: "운명선 후보 clear",
    modelConfidence: 0.8,
    modelVerticalSpan: 0.75,
    corroborated: true,
  },
  sun: {
    status: "clear",
    strength: 0.62,
    span: 0.6,
    note: "태양선 후보 clear",
  },
  wealth: {
    status: "clear",
    strength: 0.58,
    span: 0.52,
    note: "재물선 후보 clear",
  },
};

const richSections = reading.buildPalmReadingSections(sampleLines, clearSecondary);
const richKeys = richSections.map((section) => section.key);
for (const key of ["heartLine", "headLine", "lifeLine", "fate", "sun", "wealthLine", "together", "secondaryTogether", "wealth"]) {
  if (!richKeys.includes(key)) throw new Error(`missing palm reading section: ${key}`);
}
const sunSection = richSections.find((section) => section.key === "sun");
const wealthLineSection = richSections.find((section) => section.key === "wealthLine");
const comboSection = richSections.find((section) => section.key === "secondaryTogether");
if (!/성과|인정|평판/.test(sunSection?.text ?? "")) throw new Error("sun line reading lacks recognition/performance interpretation");
if (!/수입|거래|보상|돈/.test(wealthLineSection?.text ?? "")) throw new Error("wealth line reading lacks money-opportunity interpretation");
if (!/운명선.*태양선.*재물선|일의 방향/.test(comboSection?.text ?? "")) throw new Error("secondary-line combination reading missing");
const richText = richSections.map((section) => section.text).join("\n");
if (/(반드시 성공|수익 보장|부자가 된다|무조건)/.test(richText)) throw new Error("deterministic success/money claim leaked into palm reading");

const faintSecondary = {
  ...clearSecondary,
  sun: { status: "faint", strength: 0.35, span: 0.3, note: "태양선 후보 faint" },
  wealth: { status: "faint", strength: 0.3, span: 0.28, note: "재물선 후보 faint" },
};
const cautiousSections = reading.buildPalmReadingSections(sampleLines, faintSecondary);
const cautiousKeys = cautiousSections.map((section) => section.key);
if (cautiousKeys.includes("sun") || cautiousKeys.includes("wealthLine")) {
  throw new Error("faint secondary line was promoted to a customer interpretation");
}
if (!cautiousKeys.includes("fate")) throw new Error("existing corroborated fate reading was lost");
if (!cautiousKeys.includes("heartLine") || !cautiousKeys.includes("headLine") || !cautiousKeys.includes("lifeLine")) {
  throw new Error("existing three major-line readings were lost");
}

const funnelSource = fs.readFileSync(path.join(root, "src/components/palm/reality-answer-funnel.tsx"), "utf8");
if (!funnelSource.includes('work: ["fate", "sun", "secondaryTogether"')) {
  throw new Error("work question flow does not reuse new sun/secondary palm readings");
}
if (!funnelSource.includes('money: ["wealthLine", "secondaryTogether", "wealth"')) {
  throw new Error("money question flow does not prioritize the detected wealth line");
}
console.log("PASS palm reading expansion: preserve major/fate + add clear sun/wealth + combination + faint guard + question reuse");
hooks.deregister?.();
