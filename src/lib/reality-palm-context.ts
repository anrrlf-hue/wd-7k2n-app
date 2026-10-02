import type { OnnxPalmLines, PalmFacts } from "@/lib/palm-facts";

export type RealityDominantHand = "left" | "right";

export interface RealityPalmHandContext {
  handSide: PalmFacts["handSide"];
  handShape: PalmFacts["handShape"];
  onnxLines: OnnxPalmLines | null;
  secondaryLines?: PalmFacts["secondaryLines"];
}

export interface RealityPalmContext {
  dominantHand: RealityDominantHand | null;
  primary: RealityPalmHandContext | null;
  left: RealityPalmHandContext | null;
  right: RealityPalmHandContext | null;
}

function handContext(facts: PalmFacts | null | undefined): RealityPalmHandContext | null {
  if (!facts) return null;
  return {
    handSide: facts.handSide,
    handShape: facts.handShape,
    onnxLines: facts.onnxLines,
    secondaryLines: facts.secondaryLines,
  };
}

export function buildRealityPalmContext(input: {
  primary?: PalmFacts | null;
  left?: PalmFacts | null;
  right?: PalmFacts | null;
  dominantHand?: RealityDominantHand | null;
}): RealityPalmContext | null {
  const primary = handContext(input.primary);
  const left = handContext(input.left);
  const right = handContext(input.right);
  if (!primary && !left && !right) return null;
  return {
    dominantHand: input.dominantHand ?? null,
    primary,
    left,
    right,
  };
}
