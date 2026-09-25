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
const factsMod = await import(pathToFileURL(path.join(root, "src/lib/saju-facts.ts")).href);
const adapter = await import(pathToFileURL(path.join(root, "src/lib/oh-my-saju-adapter.ts")).href);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runCase(label, input) {
  const shallow = factsMod.computeSajuFacts(input);
  const enriched = adapter.enrichSajuFacts(shallow, input);
  console.log(label, {
    source: enriched.geukgukSource,
    pillars: Object.fromEntries(enriched.pillars.map((p) => [p.pillar, p.ganzhi])),
    daeunAnalysis: enriched.daeunAnalysis?.length ?? 0,
    yongsin: enriched.yongsin,
    currentDaeun: enriched.currentDaeun?.ganzhi ?? null,
  });
  return { shallow, enriched };
}

const normal = runCase("normal", {
  year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남",
});
assert(normal.enriched.geukgukSource === "ziping_ditianshui", "normal case should accept matching enrichment");

const boundary = runCase("solar-term-boundary", {
  year: 2024, month: 2, day: 4, hour: 17, minute: 26, gender: "남",
});
assert(boundary.enriched.geukgukSource === "ssaju_fallback", "mismatched natal pillars must reject enrichment");
assert(boundary.enriched.daeunAnalysis === null, "mismatched natal pillars must reject timing enrichment");

const unknown = runCase("unknown-time", {
  year: 1990, month: 5, day: 15, hour: null, minute: null, gender: "남",
});
assert(unknown.enriched.geukgukSource === "ssaju_fallback", "unknown-time must not accept precise enrichment");
assert(unknown.enriched.yongsin.length === 0, "unknown-time must not expose yongsin");
assert(unknown.enriched.currentDaeun === null, "unknown-time must not expose current daeun");
assert(unknown.enriched.nextDaeun === null, "unknown-time must not expose next daeun");
assert(unknown.enriched.daeunList.length === 0, "unknown-time must not expose daeun list");

console.log("PASS saju engine identity 3/3");
hooks.deregister?.();
