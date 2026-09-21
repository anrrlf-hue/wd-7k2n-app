export interface PriceCandidate {
  amountKrw: number;
  label: string;
  hypothesis: string;
}

export const PRICE_CANDIDATES: PriceCandidate[] = [
  {
    amountKrw: 9900,
    label: "9,900원",
    hypothesis: "첫 유료 현실판정 기준 가격. 무료와 다른 개인 답변·선택지·30일 재점검까지 포함한다.",
  },
];

export const RECOMMENDED_PRICE: PriceCandidate = PRICE_CANDIDATES[0];

export const PAYMENT_METHODS: string[] =
  process.env.NEXT_PUBLIC_PAYMENT_METHODS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  ["카카오페이", "토스페이"];
