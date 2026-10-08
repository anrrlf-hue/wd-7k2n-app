export interface TrustBadge {
  text: string;
  enabled: boolean;
}

export const TRUST_BADGES: TrustBadge[] = [
  {
    text: "사주 계산에서 확인한 흐름과 손금에서 관측된 특징을 구분해 보여줍니다.",
    enabled: true,
  },
  {
    text: "양손을 함께 볼 때는 주로 쓰는 손과 반대손의 차이를 기준으로 변화 포인트를 정리합니다.",
    enabled: true,
  },
  {
    text: "관계 비교 공유 링크에는 생년월일이나 손 사진을 직접 넣지 않습니다.",
    enabled: true,
  },
];
