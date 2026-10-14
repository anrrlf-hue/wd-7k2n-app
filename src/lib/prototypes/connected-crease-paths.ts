/**
 * Evidence-gated segment path ranking. This is diagnostic-only: it never
 * bridges a missing pixel and never changes the model class shown to a user.
 */
export interface ConnectedPathPoint { x: number; y: number }
export interface ConnectedPathSegment {
  componentId: number;
  points: ConnectedPathPoint[];
  pathLengthPx: number;
  supportPixelCount: number;
  responseMean: number;
  status: "measurable" | "ambiguous";
}
export interface ConnectedPathComponent { componentId: number; supportPoints?: ConnectedPathPoint[]; pixelCount: number; responseMean: number }
export interface RidgeEvidencePoint { valleyResponse: number; probeAngleDeg?: number | null; }
export type RidgeEvidence = Map<string, RidgeEvidencePoint> | Record<string, RidgeEvidencePoint>;
export interface PalmPathFrame {
  axisAngleDeg?: number;
  thumbRegion?: { xMin: number; xMax: number; yMin: number; yMax: number };
}
export interface PathSearchBudget { used: number; limit: number; }
export interface ConnectedPathCandidate {
  orderedPoints: ConnectedPathPoint[];
  orientedSegmentRefs: Array<{ segmentIndex: number; direction: "forward" | "reverse" }>;
  actualSupportLengthPx: number;
  score: number;
  scoreItems: { length: number; junctionContinuity: number; probeAgreement: number; ridgeSupport: number; thumbPrior: number };
  terminationReason: "terminal" | "loop" | "no_extension" | "searchTruncated";
  competingBranches: number;
  ambiguous: boolean;
  searchTruncated: boolean;
}

export interface RankConnectedPathResult {
  pathCandidates: ConnectedPathCandidate[];
  searchTruncated: boolean;
  budget: PathSearchBudget;
}

const MAX_STARTS = 16;
const BEAM_WIDTH = 8;
const MAX_EXTENSIONS = 8192;
const MAX_FINAL = 3;

const key = (componentId: number, point: ConnectedPathPoint) => `${componentId}:${point.x},${point.y}`;
const samePoint = (a: ConnectedPathPoint, b: ConnectedPathPoint) => a.x === b.x && a.y === b.y;
const lengthOf = (points: ConnectedPathPoint[]) => points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
const angle = (a: ConnectedPathPoint, b: ConnectedPathPoint) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
const angleDistance = (a: number, b: number) => {
  const d = Math.abs(((a - b + 180) % 360 + 360) % 360 - 180);
  return Math.min(d, 180);
};
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function evidenceAt(evidence: RidgeEvidence, point: ConnectedPathPoint): RidgeEvidencePoint | undefined {
  const k = `${point.x},${point.y}`;
  return evidence instanceof Map ? evidence.get(k) : evidence[k];
}

function endpointTangent(segment: ConnectedPathSegment, direction: 1 | -1): number {
  const points = direction === 1 ? segment.points : [...segment.points].reverse();
  if (points.length < 2) return 0;
  return angle(points[0], points[1]);
}

function junctionScores(a: ConnectedPathSegment, aDirection: 1 | -1, b: ConnectedPathSegment, bDirection: 1 | -1, evidence: RidgeEvidence) {
  const aPoints = aDirection === 1 ? a.points : [...a.points].reverse();
  const bPoints = bDirection === 1 ? b.points : [...b.points].reverse();
  const junction = aPoints[aPoints.length - 1];
  const incoming = endpointTangent(a, aDirection);
  const outgoing = endpointTangent(b, bDirection);
  const continuity = (1 + Math.cos((angleDistance(incoming, outgoing) * Math.PI) / 180)) / 2;
  const probeAngles = bPoints.slice(0, 3).map(point => evidenceAt(evidence, point)?.probeAngleDeg).filter((value): value is number => Number.isFinite(value));
  const normalTarget = outgoing + 90;
  const probeAgreement = probeAngles.length ? mean(probeAngles.map(probe => Math.max(Math.cos((angleDistance(probe, normalTarget) * Math.PI) / 180), Math.cos((angleDistance(probe, outgoing - 90) * Math.PI) / 180)))) : 0;
  return { continuity, probeAgreement, junction };
}

function supportScore(points: ConnectedPathPoint[], evidence: RidgeEvidence): number {
  return mean(points.map(point => Math.max(0, evidenceAt(evidence, point)?.valleyResponse ?? 0)));
}

function thumbPrior(points: ConnectedPathPoint[], frame: PalmPathFrame): number {
  const region = frame.thumbRegion;
  if (!region || !points.length) return 0;
  const inside = points.filter(point => point.x >= region.xMin && point.x <= region.xMax && point.y >= region.yMin && point.y <= region.yMax).length;
  return inside / points.length * .15;
}

function selectStarts(segments: ConnectedPathSegment[], adjacency: Map<string, number[]>): Array<{ segmentIndex: number; direction: 1 | -1 }> {
  const refs: Array<{ segmentIndex: number; direction: 1 | -1; point: ConnectedPathPoint }> = [];
  segments.forEach((segment, segmentIndex) => {
    if (segment.points.length < 2) return;
    for (const direction of [1, -1] as const) {
      const point = direction === 1 ? segment.points[0] : segment.points[segment.points.length - 1];
      const degree = adjacency.get(key(segment.componentId, point))?.length ?? 0;
      if (degree <= 1) refs.push({ segmentIndex, direction, point });
    }
  });
  if (!refs.length) segments.forEach((segment, segmentIndex) => {
    if (segment.points.length >= 2) refs.push({ segmentIndex, direction: 1, point: segment.points[0] });
  });
  refs.sort((a, b) => segments[b.segmentIndex].responseMean - segments[a.segmentIndex].responseMean || segments[b.segmentIndex].pathLengthPx - segments[a.segmentIndex].pathLengthPx);
  const selected: typeof refs = [];
  for (const ref of refs) {
    if (selected.length >= MAX_STARTS) break;
    const distinct = selected.every(existing => Math.hypot(existing.point.x - ref.point.x, existing.point.y - ref.point.y) >= 3);
    if (distinct || selected.length < 2) selected.push(ref);
  }
  return selected.map(({ segmentIndex, direction }) => ({ segmentIndex, direction }));
}

interface State {
  refs: Array<{ segmentIndex: number; direction: 1 | -1 }>;
  nodes: Set<string>;
  edges: Set<string>;
  score: number;
  length: number;
  junction: number;
  probe: number;
  support: number;
  prior: number;
  terminationReason: ConnectedPathCandidate["terminationReason"];
  branches: number;
}

/** Connect only exact shared endpoint pixels within one component. */
export function rankConnectedCreasePaths(
  segments: ConnectedPathSegment[],
  _components: ConnectedPathComponent[],
  ridgeEvidence: RidgeEvidence,
  palmFrame: PalmPathFrame = {},
  budget: PathSearchBudget = { used: 0, limit: MAX_EXTENSIONS },
): RankConnectedPathResult {
  const adjacency = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    if (segment.points.length < 2) return;
    for (const point of [segment.points[0], segment.points[segment.points.length - 1]]) {
      const k = key(segment.componentId, point);
      const refs = adjacency.get(k) ?? [];
      if (!refs.includes(index)) refs.push(index);
      adjacency.set(k, refs);
    }
  });
  const starts = selectStarts(segments, adjacency);
  const perStart = Math.max(1, Math.floor(Math.min(MAX_EXTENSIONS, budget.limit) / Math.max(1, starts.length)));
  const finished: ConnectedPathCandidate[] = [];
  let searchTruncated = false;
  for (const start of starts) {
    const segment = segments[start.segmentIndex];
    const oriented = start.direction === 1 ? segment.points : [...segment.points].reverse();
    const startNode = key(segment.componentId, oriented[0]);
    const endNode = key(segment.componentId, oriented[oriented.length - 1]);
    let beam: State[] = [{ refs: [start], nodes: new Set([startNode, endNode]), edges: new Set([`${start.segmentIndex}:${start.direction}`]), score: 0, length: segment.pathLengthPx, junction: 0, probe: 0, support: supportScore(oriented, ridgeEvidence), prior: thumbPrior(oriented, palmFrame), terminationReason: "no_extension", branches: 0 }];
    let localExpansions = 0;
    while (beam.length && localExpansions < perStart) {
      const nextBeam: State[] = [];
      for (const state of beam) {
        const last = state.refs[state.refs.length - 1];
        const lastSegment = segments[last.segmentIndex];
        const lastPoints = last.direction === 1 ? lastSegment.points : [...lastSegment.points].reverse();
        const current = lastPoints[lastPoints.length - 1];
        const currentKey = key(lastSegment.componentId, current);
        const nextRefs = (adjacency.get(currentKey) ?? []).flatMap(index => index === last.segmentIndex || state.edges.has(`${index}:1`) || state.edges.has(`${index}:-1`) ? [] : [index]);
        if (!nextRefs.length) { state.terminationReason = state.nodes.has(startNode) && state.refs.length > 1 ? "loop" : "terminal"; nextBeam.push(state); continue; }
        state.branches = Math.max(state.branches, nextRefs.length);
        for (const nextIndex of nextRefs) {
          if (++localExpansions > perStart) { searchTruncated = true; break; }
          const nextSegment = segments[nextIndex];
          const direction: 1 | -1 = samePoint(nextSegment.points[0], current) ? 1 : -1;
          const nextPoints = direction === 1 ? nextSegment.points : [...nextSegment.points].reverse();
          const nextEnd = key(nextSegment.componentId, nextPoints[nextPoints.length - 1]);
          if (state.nodes.has(nextEnd)) {
            nextBeam.push({ ...state, terminationReason: "loop", branches: Math.max(state.branches, nextRefs.length) });
            continue;
          }
          const junction = junctionScores(lastSegment, last.direction, nextSegment, direction, ridgeEvidence);
          const nextLength = state.length + nextSegment.pathLengthPx;
          const nextSupport = (state.support * state.length + supportScore(nextPoints, ridgeEvidence) * nextSegment.pathLengthPx) / Math.max(1, nextLength);
          nextBeam.push({
            refs: [...state.refs, { segmentIndex: nextIndex, direction }], nodes: new Set([...state.nodes, currentKey, nextEnd]), edges: new Set([...state.edges, `${nextIndex}:${direction}`]),
            score: 0, length: nextLength, junction: (state.junction * Math.max(0, state.refs.length - 1) + junction.continuity) / state.refs.length,
            probe: (state.probe * Math.max(0, state.refs.length - 1) + junction.probeAgreement) / state.refs.length,
            support: nextSupport, prior: Math.max(state.prior, thumbPrior(nextPoints, palmFrame)), terminationReason: "no_extension", branches: state.branches,
          });
        }
      }
      beam = nextBeam.sort((a, b) => {
        const score = (state: State) => state.length / (state.length + 96) * .35 + state.junction * .2 + state.probe * .15 + Math.min(state.support / 32, 1) * .25 + state.prior * .05;
        return score(b) - score(a);
      }).slice(0, BEAM_WIDTH);
      if (!beam.some(state => state.terminationReason === "no_extension")) break;
    }
    if (localExpansions >= perStart && beam.some(state => state.terminationReason === "no_extension")) searchTruncated = true;
    for (const state of beam) {
      const scoreItems = { length: state.length / (state.length + 96), junctionContinuity: state.junction, probeAgreement: state.probe, ridgeSupport: Math.min(state.support / 32, 1), thumbPrior: state.prior };
      const score = scoreItems.length * .35 + scoreItems.junctionContinuity * .2 + scoreItems.probeAgreement * .15 + scoreItems.ridgeSupport * .25 + scoreItems.thumbPrior * .05;
      const orderedPoints: ConnectedPathPoint[] = [];
      state.refs.forEach(ref => {
        const points = ref.direction === 1 ? segments[ref.segmentIndex].points : [...segments[ref.segmentIndex].points].reverse();
        points.forEach(point => { if (!orderedPoints.length || !samePoint(orderedPoints[orderedPoints.length - 1], point)) orderedPoints.push(point); });
      });
      finished.push({ orderedPoints, orientedSegmentRefs: state.refs.map(ref => ({ segmentIndex: ref.segmentIndex, direction: ref.direction === 1 ? "forward" : "reverse" })), actualSupportLengthPx: lengthOf(orderedPoints), score, scoreItems, terminationReason: searchTruncated && state.terminationReason === "no_extension" ? "searchTruncated" : state.terminationReason, competingBranches: state.branches, ambiguous: false, searchTruncated });
    }
  }
  finished.sort((a, b) => b.score - a.score);
  const unique = finished.filter((candidate, index, list) => !list.slice(0, index).some(previous => candidate.orderedPoints.length === previous.orderedPoints.length && candidate.orderedPoints.every((point, i) => samePoint(point, previous.orderedPoints[i])))).slice(0, MAX_FINAL);
  const ambiguous = unique.length > 1 && Math.abs(unique[0].score - unique[1].score) < .06;
  unique.forEach(candidate => { candidate.ambiguous = ambiguous; });
  budget.used += Math.min(MAX_EXTENSIONS, starts.length * perStart);
  return { pathCandidates: unique, searchTruncated, budget };
}
