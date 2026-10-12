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
    text: "공유 링크는 무료 사주 시작 주소만 전달하며 이름·출생정보·손 사진·개인 풀이를 담지 않습니다.",
    enabled: true,
  },
];
