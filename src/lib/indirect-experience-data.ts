import type { WealthTypeCode } from "@/lib/wealth-type-copy";
import type { PalmKeyword } from "@/lib/palm-keyword";
export type ChoiceTendency = "security" | "flexibility" | "growth";
export interface ExperienceChoice { id: string; label: string; tendency: ChoiceTendency }
export interface ExperienceScene { id: string; situation: string; choices: ExperienceChoice[] }
export const PALM_FLAVOR_LINE: Record<PalmKeyword, string | null> = {
  square: "손에서 읽은 실용적인 결은 실제 선택에서도 이어질까요?",
  rectangular: "손에서 읽은 신중한 결은 실제 선택에서도 이어질까요?",
  elongated: "손에서 읽은 섬세한 결은 실제 선택에서도 이어질까요?",
  slender: "손에서 읽은 유연한 결은 실제 선택에서도 이어질까요?", unknown: null,
};
export const INNATE_TENDENCY: Record<WealthTypeCode, string> = {
  ACCUM: "돈을 만들고 쌓아가는", LEAK: "돈의 흐름을 활발하게 만드는",
  HOLD: "가진 것을 신중하게 지키는", TIGHT: "여유를 만들 기반을 다져가는",
};
export const TENDENCY_LABEL: Record<ChoiceTendency, string> = {
  security: "안정과 예측 가능성", flexibility: "상황에 맞춘 유연함", growth: "경험과 성장 가능성",
};
// 선택마다 이점과 포기하는 것이 있다. 좋고 나쁨은 채점하지 않는다.
export const EXPERIENCE_SCENES: ExperienceScene[] = [
  { id: "extra-income", situation: "예상 밖의 30만원이 생겼어요. 이번 달 필요한 지출은 이미 마련했습니다. 가장 먼저 마음이 가는 쪽은요?", choices: [
    { id: "reserve", label: "다음 달을 편하게 보내도록 예비비에 보탠다", tendency: "security" },
    { id: "experience", label: "미뤄둔 배움이나 경험에 일부를 써본다", tendency: "growth" },
    { id: "available", label: "이번 달 상황을 보며 쓸 수 있게 남겨둔다", tendency: "flexibility" },
  ] },
  { id: "weekend", situation: "이번 주말, 같은 비용과 시간이 드는 세 가지 일정이 생겼어요. 지금 내게 더 필요한 것은요?", choices: [
    { id: "connect", label: "새로운 사람과 아이디어를 만나는 모임", tendency: "growth" },
    { id: "rest", label: "그날 컨디션에 맞춰 정하는 가벼운 외출", tendency: "flexibility" },
    { id: "routine", label: "익숙한 장소에서 확실히 쉬는 시간", tendency: "security" },
  ] },
  { id: "new-work", situation: "수입과 총 업무시간이 비슷한 일을 고른다면, 어떤 환경이 더 끌리나요?", choices: [
    { id: "autonomy", label: "그때그때 일정과 방식을 조절할 수 있는 일", tendency: "flexibility" },
    { id: "predictable", label: "역할과 일정이 미리 정해져 있는 일", tendency: "security" },
    { id: "learn", label: "낯선 역할을 맡아 새로운 역량을 쌓는 일", tendency: "growth" },
  ] },
];
