export interface PriceCandidate {
  amountKrw: number | null;
  label: string;
  hypothesis: string;
}

export const PRICE_CANDIDATES: PriceCandidate[] = [
  {
    amountKrw: 4900,
    label: "4,900원",
    hypothesis: "첫 결제 장벽을 낮춘 단건 심화풀이 가격 실험 후보",
  },
  {
    amountKrw: 9900,
    label: "9,900원",
    hypothesis: "관계·상황 심화와 시기·후속질문까지 포함한 단건 가격 실험 후보",
  },
];

export const RECOMMENDED_PRICE: PriceCandidate = {
  amountKrw: null,
  label: "무료 베타",
  hypothesis:
    "현재는 결제를 받지 않고 전환 데이터를 확인합니다. 유료 전환 전 4,900원/9,900원 후보를 실제 결제 테스트로 검증합니다.",
};

export const PAYMENT_METHODS: string[] =
  process.env.NEXT_PUBLIC_PAYMENT_METHODS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  ["카카오페이", "토스페이"];
