import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored MediaPipe WASM glue code copied into public/ for
    // self-hosting (see src/lib/palm-detection.ts) — generated, not ours.
    "public/mediapipe/**",
    // Vendored onnxruntime-web WASM bundle, self-hosted the same way.
    "public/ort/**",
    // Vendored third-party source (palm-line-reader by Sam Barber, MIT) —
    // kept verbatim for license/attribution, not ours to reformat.
    "src/lib/vendor/**",
    // Vendored oh-my-saju CLI bundle (Apache-2.0, JaeSang1998/oh-my-saju) —
    // self-contained esbuild output, kept verbatim. See vendor/oh-my-saju/README.md.
    "vendor/**",
  ]),
]);

export default eslintConfig;
