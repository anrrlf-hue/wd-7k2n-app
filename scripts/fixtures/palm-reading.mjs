// Invented observations for reading tests, not recognition evidence.
import { palmFixture } from './palm-analysis.mjs';
export const geometryFixture = (wide, long, indexRing) => ({ version: 'landmark-geometry-v1', status: 'observed', reasons: [],
  palmWidthToLength: wide ? 0.86 : 0.61,
  fingerToPalm: { index: indexRing === 'index_longer' ? 0.83 : 0.55, middle: long ? 0.95 : 0.7, ring: indexRing === 'index_longer' ? 0.71 : 0.67 }, indexRing });
const unsupported = { status: 'not_seen', strength: 0, span: 0, note: '', assessment: 'unsupported' };
export const fateFixture = (side, position, span = 0.65, continuity = 0.8) => ({ ...structuredClone(palmFixture), handSide: side,
  secondaryLines: { sun: { ...unsupported }, wealth: { ...unsupported },
    fate: { status: 'clear', strength: 0.8, span: 0.8, note: '', corroborated: true, assessment: 'observed',
      candidateObservation: { version: 'fate-candidate-v1', position, visibleVerticalSpan: span, creaseContinuity: continuity, pathPoints: Array.from({ length: 8 }, (_, i) => ({ x: 0.5, y: 0.35 + i * 0.04 })) } } } });
export const leftReadingFixture = { ...fateFixture('left', 'thumb_side'), handGeometry: geometryFixture(false, true, 'index_longer') };
export const rightReadingFixture = { ...fateFixture('right', 'pinky_side', 0.3, 0.4), handGeometry: geometryFixture(true, false, 'ring_longer') };
