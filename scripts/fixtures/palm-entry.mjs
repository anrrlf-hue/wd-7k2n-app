export const PALM_ENTRY_KEY = "saju-app:palm-entry:v1";

export function palmEntry(birthInput, personalityInput = { personalityAnswers: null, mbti: null }, focus = "overall", initialQuestion = null) {
  return JSON.stringify({ version: 1, birthInput, personalityInput, focus, initialQuestion });
}
