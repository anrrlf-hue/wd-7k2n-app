import { z } from "zod";
import { MBTI_TYPES } from "@/lib/mbti-facts";
import { SAJU_FOCUS_VALUES } from "@/lib/saju-focus";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import type { SajuFocus } from "@/lib/saju-focus";

export const PALM_ENTRY_KEY = "saju-app:palm-entry:v1";

const entrySchema = z.object({
  version: z.literal(1),
  birthInput: z.object({
    year: z.number().int().min(1900).max(2035),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    hour: z.number().int().min(0).max(23).nullable(),
    minute: z.number().int().min(0).max(59).nullable(),
    gender: z.enum(["남", "여"]),
  }),
  personalityInput: z.object({
    personalityAnswers: z.record(z.string(), z.number().finite()).nullable(),
    mbti: z.enum(MBTI_TYPES).nullable(),
  }),
  focus: z.enum(SAJU_FOCUS_VALUES),
  initialQuestion: z.string().nullable(),
});

export type PalmEntryState = {
  birthInput: BirthInput;
  personalityInput: PersonalityInputEcho;
  focus: SajuFocus;
  initialQuestion: string | null;
};

export function savePalmEntry(state: PalmEntryState): boolean {
  try {
    const parsed = entrySchema.parse({ version: 1, ...state });
    sessionStorage.setItem(PALM_ENTRY_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

export function readPalmEntry(): PalmEntryState | null {
  try {
    const raw = sessionStorage.getItem(PALM_ENTRY_KEY);
    if (!raw) return null;
    const parsed = entrySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const { birthInput, personalityInput, focus, initialQuestion } = parsed.data;
    return { birthInput, personalityInput, focus, initialQuestion };
  } catch {
    return null;
  }
}
