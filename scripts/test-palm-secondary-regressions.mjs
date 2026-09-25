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
hooks.deregister?.();
