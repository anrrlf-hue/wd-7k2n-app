import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const tsc = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
const bundleDir = path.join(root, ".tmp", "additional-crease-browser");
fs.mkdirSync(bundleDir, { recursive: true });
execFileSync(tsc, ["--target", "ES2020", "--module", "ES2020", "--lib", "ES2020,DOM", "--strict", "--skipLibCheck", "--outDir", bundleDir, "src/lib/prototypes/additional-vertical-crease.ts", "src/lib/prototypes/additional-vertical-crease-worker.ts", "src/lib/prototypes/additional-vertical-crease-worker-entry.ts"], { stdio: "inherit" });
if (!process.env.PLAYWRIGHT_MODULE) throw new Error("Set PLAYWRIGHT_MODULE to the existing browser-test provider before running the browser regression.");
execFileSync(process.execPath, ["scripts/test-additional-vertical-crease-browser.mjs"], { stdio: "inherit", env: { ...process.env, CREASE_BUNDLE: path.join(bundleDir, "additional-vertical-crease.js"), CREASE_WORKER_BUNDLE: path.join(bundleDir, "additional-vertical-crease-worker-entry.js"), CREASE_WORKER_ADAPTER_BUNDLE: path.join(bundleDir, "additional-vertical-crease-worker.js") } });
