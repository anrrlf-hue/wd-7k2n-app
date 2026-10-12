import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
import ts from "typescript";

const root = process.cwd();
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/")) {
      const target = path.join(root, "src", specifier.slice(2));
      return next(pathToFileURL(target + (fs.existsSync(target + ".ts") ? ".ts" : ".tsx")).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url) && fileURLToPath(url).startsWith(root)) {
      return { format: "module", shortCircuit: true, source: ts.transpileModule(fs.readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, jsx: ts.JsxEmit.ReactJSX },
      }).outputText };
    }
    return next(url, context);
  },
});
