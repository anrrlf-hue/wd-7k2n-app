import { PAID_PRODUCT } from "@/lib/paid-product";

export interface PriceCandidate {
  amountKrw: number;
  label: string;
  hypothesis: string;
}

export const PRICE_CANDIDATES: PriceCandidate[] = [
  {
    amountKrw: PAID_PRODUCT.priceKrw,
    label: "9,900원",
    hypothesis:
      "한 가지 현실 재무 질문을 숫자로 판단하고 선택지 2개·첫 행동·30일 재점검 1회까지 제공하는 파일럿 가격입니다.",
  },
];

export const RECOMMENDED_PRICE: PriceCandidate = PRICE_CANDIDATES[0];

export const PAYMENT_METHODS: string[] =
  process.env.NEXT_PUBLIC_PAYMENT_METHODS?.split(",").map((s) => s.trim()).filter(Boolean) ??
  ["카카오페이", "토스페이"];
