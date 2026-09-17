import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import { EXPERIENCE_SCENES, INNATE_TENDENCY, TENDENCY_LABEL, type ChoiceTendency } from "@/lib/indirect-experience-data";
export function getExperienceScenes() { return EXPERIENCE_SCENES; }
export function computeExperienceOutcome(code: WealthTypeCode, choices: ChoiceTendency[]): string {
  if (choices.length === 0) return "아직 선택 기록이 없어요. 세 장면을 선택하면 비교할 수 있습니다.";
  const counts = { security: 0, flexibility: 0, growth: 0 };
  choices.forEach((choice) => { counts[choice] += 1; });
  const highest = Math.max(...Object.values(counts));
  const strongest = (Object.keys(counts) as ChoiceTendency[]).filter((key) => counts[key] === highest);
  const actual = strongest.length > 1 ? "여러 기준을 고르게 사용했습니다" : TENDENCY_LABEL[strongest[0]] + "을 더 자주 선택했습니다";
  return "사주에서는 " + INNATE_TENDENCY[code] + " 경향을 읽었고, 이번 " + choices.length + "번의 선택에서는 " + actual + ". 세 장면에서의 선택이며, 고정된 성격이나 재무 능력을 뜻하지는 않아요.";
}
