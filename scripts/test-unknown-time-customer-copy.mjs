// Narrow ASTRA regression: inspect the same sections rendered by the broad
// customer consultation, including current/next daeun paragraphs.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
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
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) return { format: "module", source: ts.transpileModule(fs.readFileSync(fileURLToPath(url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
const factsMod = await import(pathToFileURL(path.join(root, "src/lib/saju-facts.ts")).href);
const reportMod = await import(pathToFileURL(path.join(root, "src/lib/free-report-mock.ts")).href);
const styleMod = await import(pathToFileURL(path.join(root, "src/lib/free-consultation-style-v1.ts")).href);
const displayed = (report) => styleMod.buildFreeConsultationSections(report).flatMap(section => section.paragraphs).join("\n");
const unknown = reportMod.buildFreeSajuReport(factsMod.computeSajuFacts({ year: 1995, month: 7, day: 15, hour: null, minute: null, gender: "여" }));
const known = reportMod.buildFreeSajuReport(factsMod.computeSajuFacts({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: "남" }));
if (!/출생시간|확정하지|단정하지/.test(displayed(unknown))) throw new Error("ASTRA-T5: unknown-time notice missing from displayed customer sections");
if (/출생시간이 확인되지 않아 큰 운의 세밀한 시기는 남겨 두었습니다/.test(displayed(known))) throw new Error("ASTRA-T5b: unknown-time notice leaked into known-time displayed sections");
console.log("PASS ASTRA-T5 displayed customer sections: unknown-time notice preserved, known-time notice absent");
hooks.deregister?.();
