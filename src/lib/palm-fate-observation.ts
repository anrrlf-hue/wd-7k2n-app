import type { SecondaryPalmLineSignal } from "@/lib/palm-facts";

export interface FateCandidateObservation {
  version: "fate-candidate-v1";
  position: "middle" | "thumb_side" | "pinky_side";
  /** Visible pixel component extent / wrist-to-middle-MCP distance, not full line length. */
  visibleVerticalSpan: number;
  /** Connected crease coverage of its search region, not a complete anatomical path. */
  creaseContinuity: number;
  /** Actual connected foreground samples used for the candidate location. */
  pathPoints: Array<{ x: number; y: number }>;
}

/** Retain position only when the real connected pixels overlap the model box.
 * Never infer a complete line, physical endpoints, gaps or life events. */
export function observeFateCandidate(base: SecondaryPalmLineSignal, model: { bbox: { x0: number; y0: number; x1: number; y1: number } } | null,
  landmarks: Array<{ x: number; y: number }>, width: number, height: number): FateCandidateObservation | undefined {
  const observation = base.creaseObservation;
  if (!model || !observation?.pathPoints || observation.pathPoints.length < 5 || landmarks.length < 18 || width <= 0 || height <= 0) return;
  const b = observation.bounds, m = model.bbox;
  const overlapX = Math.max(0, Math.min(b.x1, m.x1) - Math.max(b.x0, m.x0));
  const overlapY = Math.max(0, Math.min(b.y1, m.y1) - Math.max(b.y0, m.y0));
  const componentArea = (b.x1 - b.x0) * (b.y1 - b.y0);
  if (componentArea <= 0 || overlapX * overlapY / componentArea < 0.5) return;
  const index = landmarks[5], pinky = landmarks[17], wrist = landmarks[0], middle = landmarks[9];
  const dx = pinky.x - index.x, dy = pinky.y - index.y;
  const center = { x: (b.x0 + b.x1) * width / 2, y: (b.y0 + b.y1) * height / 2 };
  const denominator = dx * dx + dy * dy;
  const palmLength = Math.hypot(middle.x - wrist.x, middle.y - wrist.y);
  if (!Number.isFinite(denominator) || denominator < 1 || palmLength < 1) return;
  const position = ((center.x - index.x) * dx + (center.y - index.y) * dy) / denominator;
  if (!Number.isFinite(position) || position < 0 || position > 1) return;
  const visibleVerticalSpan = (b.y1 - b.y0) * height / palmLength;
  if (!Number.isFinite(visibleVerticalSpan) || visibleVerticalSpan <= 0 || visibleVerticalSpan > 2) return;
  return { version: "fate-candidate-v1", position: position < 0.33 ? "thumb_side" : position > 0.67 ? "pinky_side" : "middle",
    visibleVerticalSpan, creaseContinuity: observation.continuity, pathPoints: observation.pathPoints };
}
