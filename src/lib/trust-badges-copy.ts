export interface TrustBadge {
  text: string;
  enabled: boolean;
}

export const TRUST_BADGES: TrustBadge[] = [
  {
    text: "20년간 실제 재무상담을 진행하며 쌓인 상담 경험과 사례를 바탕으로 설계했습니다.",
    enabled: true,
  },
  {
    text: "사주풀이만으로 재무 판단을 하지 않고, 입력한 소득·지출·저축·부채 등 확인된 정보를 기준으로 봅니다.",
    enabled: true,
  },
  {
    text: "특정 금융상품을 판매하기 위한 진단이 아닙니다.",
    enabled: true,
  },
];
