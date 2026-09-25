export interface PriceCandidate {
  amountKrw: number | null;
  label: string;
  hypothesis: string;
}

export const PRICE_CANDIDATES: PriceCandidate[] = [];

export const RECOMMENDED_PRICE: PriceCandidate = {
  amountKrw: null,
  label: "가격 검증 중",
  hypothesis:
    "현재 가격은 확정되지 않았습니다. 고객가치·대체재·제공원가·실제 결제 반응을 확인한 뒤 가격을 정합니다.",
};

export const PAYMENT_METHODS: string[] =
  process.env.NEXT_PUBLIC_PAYMENT_METHODS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  ["카카오페이", "토스페이"];
