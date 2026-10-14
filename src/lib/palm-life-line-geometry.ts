import type { OnnxLineDetail } from "@/lib/palm-facts";

export type LifeLineGeometryStatus = "supported" | "rejected" | "unconfirmed";
export interface LifeLineGeometryResult {
  status: LifeLineGeometryStatus;
  reason: "thumb_side_segment" | "central_vertical_segment" | "short_or_missing_geometry" | "ambiguous_geometry";
}

/**
 * Conservative anatomical guard for the existing three-class model.
 * The model class is not treated as anatomical identity. A segment is only
 * supported when its crop coordinates occupy the thumb-side palm region; a
 * clearly central, short vertical segment is rejected as a life-line reading.
 * Left/right and rotation are handled through the landmark-derived frame.
 */
export function classifyLifeLineGeometry(
  line: Pick<OnnxLineDetail, "detected" | "geometryStatus" | "start" | "end" | "length" | "pathPoints">,
  landmarks: Array<{ x: number; y: number }>,
  cropWidth: number,
  cropHeight: number,
): LifeLineGeometryResult {
  if (!line.detected || !line.length || line.length === "짧음" || !line.start || !line.end || line.geometryStatus !== "measurable") return { status: "unconfirmed", reason: line.geometryStatus === "ambiguous" ? "ambiguous_geometry" : "short_or_missing_geometry" };
  if (!line.pathPoints || line.pathPoints.length < 5) return { status: "unconfirmed", reason: "short_or_missing_geometry" };
  if (landmarks.length !== 21 || cropWidth <= 1 || cropHeight <= 1) return { status: "unconfirmed", reason: "short_or_missing_geometry" };
  const [wrist, thumbMcp, middleMcp] = [landmarks[0], landmarks[2], landmarks[9]];
  const axisX = middleMcp.x - wrist.x, axisY = middleMcp.y - wrist.y, axisLength = Math.hypot(axisX, axisY);
  const palmWidth = Math.hypot(landmarks[5].x - landmarks[17].x, landmarks[5].y - landmarks[17].y);
  if (axisLength < 2 || palmWidth < 2) return { status: "unconfirmed", reason: "short_or_missing_geometry" };
  const ux = axisX / axisLength, uy = axisY / axisLength, nx = -uy, ny = ux;
  const cross = axisX * (thumbMcp.y - wrist.y) - axisY * (thumbMcp.x - wrist.x), side = cross >= 0 ? 1 : -1;
  const point = (p: { x: number; y: number }) => {
    const x = p.x * cropWidth, y = p.y * cropHeight, rx = x - wrist.x, ry = y - wrist.y;
    return { along: (rx * ux + ry * uy) / axisLength, across: side * (rx * nx + ry * ny) / palmWidth };
  };
  const path = line.pathPoints.map(point), a = point(line.start), b = point(line.end);
  const midpoint = path[Math.floor(path.length / 2)];
  const acrossValues = path.map(item => item.across), alongValues = path.map(item => item.along);
  const acrossSpan = Math.max(...acrossValues) - Math.min(...acrossValues), alongSpan = Math.max(...alongValues) - Math.min(...alongValues);
  const centralVertical = path.every(item => Math.abs(item.across) <= 0.18) && alongSpan >= 0.2;
  if (centralVertical) return { status: "rejected", reason: "central_vertical_segment" };
  const chord = Math.hypot(b.along - a.along, b.across - a.across);
  const arc = path.slice(1).reduce((sum, item, index) => sum + Math.hypot(item.along - path[index].along, item.across - path[index].across), 0);
  const thumbSide = path.some(item => item.across >= 0.18) && midpoint.across >= 0.12 && acrossSpan >= 0.12 && alongSpan >= 0.2 && arc / Math.max(chord, 1e-6) >= 1.04;
  return thumbSide ? { status: "supported", reason: "thumb_side_segment" } : { status: "unconfirmed", reason: "short_or_missing_geometry" };
}
