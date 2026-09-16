// 간접체험 로직 — 순수 함수, 난수 없음(같은 유형·같은 선택=같은 결과).
import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import { INDIRECT_EXPERIENCE_SCENES, EXPERIENCE_OUTCOME_TEXT, type ExperienceScene, type ExperienceChoice } from "@/lib/indirect-experience-data";

export function getExperienceScenes(code: WealthTypeCode): ExperienceScene[] {
  return INDIRECT_EXPERIENCE_SCENES[code];
}

export function computeExperienceOutcome(code: WealthTypeCode, tones: ExperienceChoice["tone"][]): string {
  const total = tones.length || 1;
  const goodCount = tones.filter((t) => t === "good").length;
  const badCount = tones.filter((t) => t === "bad").length;
  const text = EXPERIENCE_OUTCOME_TEXT[code];
  if (goodCount > total / 2) return text.good;
  if (badCount > total / 2) return text.bad;
  return text.mixed;
}
