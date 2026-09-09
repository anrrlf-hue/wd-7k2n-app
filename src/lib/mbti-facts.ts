// MBTI는 공식 문항을 재현하지 않는다(라이선스/정확도 문제). 이미 자신의
// 유형을 아는 사용자가 "선택"만 하는 자기보고 입력이며, 정확도 엔진에는
// 전혀 관여하지 않고 교차 비교 텍스트에서 참고용으로만 인용된다.

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export type MbtiType = (typeof MBTI_TYPES)[number];

export type MbtiSelfReport = { type: MbtiType } | { type: "모름" };
