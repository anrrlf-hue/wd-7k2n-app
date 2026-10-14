export type PalmFinger = "thumb" | "index" | "middle" | "ring" | "pinky";
export interface PalmHandGeometry {
  version: "landmark-geometry-v1";
  status: "observed" | "not_usable";
  reasons: Array<"cropped" | "perspective" | "overlap" | "bent" | "missing_points">;
  /** MCP span / wrist-to-middle-MCP distance: a proxy, not outer palm width. */
  palmWidthToLength: number | null;
  /** Image proportions, not physical lengths. Only extended, visible fingers. */
  fingerToPalm: Partial<Record<PalmFinger, number>>;
  indexRing: "index_longer" | "ring_longer" | "similar" | null;
}

/** Reuse the local 21 landmarks, retaining only ratios. Reject foreshortened,
 * cropped and overlapping poses; bent fingers do not receive a length claim. */
export function measurePalmHandGeometry(points: Array<{ x: number; y: number; z?: number }>, width: number, height: number): PalmHandGeometry {
  const result: PalmHandGeometry = { version: "landmark-geometry-v1", status: "not_usable", reasons: [], palmWidthToLength: null, fingerToPalm: {}, indexRing: null };
  if (points.length !== 21 || width <= 0 || height <= 0 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z ?? 0))) {
    result.reasons.push("missing_points"); return result;
  }
  const p = points.map(v => ({ x: v.x * width, y: v.y * height, z: (v.z ?? 0) * width }));
  const distance = (a: number, b: number) => Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y);
  const palmLength = distance(0, 9), palmWidth = distance(5, 17);
  if (palmLength < 1 || palmWidth < 1) { result.reasons.push("missing_points"); return result; }
  if (points.some(v => v.x < 0.02 || v.x > 0.98 || v.y < 0.02 || v.y > 0.98)) {
    result.reasons.push("cropped"); return result;
  }
  const palmDepth = [0, 5, 9, 13, 17].map(i => p[i].z);
  if ((Math.max(...palmDepth) - Math.min(...palmDepth)) / palmLength > 0.55 || palmWidth / palmLength < 0.35) {
    result.reasons.push("perspective"); return result;
  }
  const chains: Record<PalmFinger, number[]> = { thumb: [2, 3, 4], index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
  const hidden = new Set<PalmFinger>();
  const adjacent: PalmFinger[] = ["index", "middle", "ring", "pinky"];
  for (let i = 1; i < adjacent.length; i++) {
    const a = adjacent[i - 1], b = adjacent[i];
    if (distance(chains[a].at(-1)!, chains[b].at(-1)!) / palmLength < 0.08) {
      hidden.add(a); hidden.add(b);
    }
  }
  if (hidden.size) result.reasons.push("overlap");
  for (const [finger, chain] of Object.entries(chains) as Array<[PalmFinger, number[]]>) {
    if (hidden.has(finger)) continue;
    const path = chain.slice(1).reduce((sum, point, i) => sum + distance(chain[i], point), 0);
    const chord = distance(chain[0], chain.at(-1)!);
    if (!path || chord / path < 0.86) { if (!result.reasons.includes("bent")) result.reasons.push("bent"); continue; }
    result.fingerToPalm[finger] = Math.round(chord / palmLength * 1000) / 1000;
  }
  if (Object.keys(result.fingerToPalm).length < 3) return result;
  result.status = "observed";
  result.palmWidthToLength = Math.round(palmWidth / palmLength * 1000) / 1000;
  const { index, ring } = result.fingerToPalm;
  if (index != null && ring != null) result.indexRing = Math.abs(index - ring) / Math.max(index, ring) < 0.05
    ? "similar" : index > ring ? "index_longer" : "ring_longer";
  return result;
}
