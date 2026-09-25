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
      if (file.startsWith(root)) {
        return {
          format: "module",
          source: ts.transpileModule(fs.readFileSync(file, "utf8"), {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
          }).outputText,
          shortCircuit: true,
        };
      }
    }
    return nextLoad(url, context);
  },
});

const { fuseFateSignal } = await import(
  pathToFileURL(path.join(root, "src/lib/palm-fate-fusion.ts")).href
);

function base(status, strength = 0.2, span = 0.3) {
  return { status, strength, span, note: "base" };
}

function model(confidence, verticalSpan, horizontalSpan) {
  return { confidence, verticalSpan, horizontalSpan };
}

const cases = [
  ["none", base("not_seen", 0, 0), null, "not_seen", false],
  ["heuristic_faint_only", base("faint"), null, "not_seen", false],
  ["heuristic_clear_only", base("clear", 0.6, 0.7), null, "faint", false],
  ["real_photo_like", base("faint", 0.35, 0.4), model(0.159, 0.41, 0.04), "faint", true],
  ["faint_plus_strong_model", base("faint", 0.35, 0.4), model(0.29, 0.45, 0.04), "clear", true],
  ["clear_plus_medium_model", base("clear", 0.6, 0.7), model(0.14, 0.4, 0.04), "clear", true],
  ["model_only_strong", base("not_seen", 0, 0), model(0.32, 0.42, 0.05), "faint", false],
  ["wide_shape_rejected", base("faint", 0.3, 0.35), model(0.6, 0.18, 0.18), "not_seen", false],
  ["short_shape_rejected", base("faint", 0.3, 0.35), model(0.7, 0.1, 0.02), "not_seen", false],
];

console.log("PALM FATE FUSION REGRESSION RESULTS");
for (const [name, baseSignal, modelSignal, expectedStatus, expectedCorroborated] of cases) {
  const result = fuseFateSignal(baseSignal, modelSignal);
  if (result.status !== expectedStatus) {
    throw new Error(`${name}: expected status ${expectedStatus}, got ${result.status}`);
  }
  if (Boolean(result.corroborated) !== expectedCorroborated) {
    throw new Error(`${name}: expected corroborated=${expectedCorroborated}, got ${result.corroborated}`);
  }
  console.log(name, {
    status: result.status,
    corroborated: result.corroborated,
    modelConfidence: result.modelConfidence,
    modelVerticalSpan: result.modelVerticalSpan,
  });
}
console.log(`PASS ${cases.length}/${cases.length}`);
hooks.deregister?.();
