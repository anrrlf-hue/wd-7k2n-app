// MBTI는 공식 문항을 재현하지 않는다(라이선스/정확도 문제). 이미 자신의
// 유형을 아는 사용자가 "선택"만 하는 자기보고 입력이다.
//
// 복구 배경: 한때 제거했었다 — 어떤 비교·판정에도 실제로 쓰이지 않는
// 죽은 입력이었기 때문. 이번에는 실제로 쓴다: 사주 계산값을 바꾸는 보정
// 용도가 아니라, triple-compare.ts의 결정 방식/관계-감정 축에 네 번째
// 신호로 들어가 "사주에서 나온 성향이 현실에서 어떤 형태로 나타나는지"를
// 더 구체적으로 설명한다. J/P는 결정을 닫는 속도(결정 방식 축), F/T는
// 관계·감정을 얼마나 고려하는지(관계-감정 축)의 실제 MBTI 정의 그대로를
// 재사용한 것이지, 이번에 새로 지어낸 대응이 아니다. 사주와 다르면
// "다르다"고 그대로 보여준다 — MBTI에 맞춰 사주를 고치지 않는다.

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export type MbtiType = (typeof MBTI_TYPES)[number];

export type MbtiSelfReport = { type: MbtiType } | { type: "모름" };
