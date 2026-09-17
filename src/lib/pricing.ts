// 소액 유료 리포트 가격 A/B 가설. 실제 결제는 붙이지 않으며, 여기서
// RECOMMENDED_PRICE만 실제 화면에 노출한다. 나머지 후보는 추후 실험용으로
// 구조만 남겨둔다 — 가격 자체를 확정하지 않는다는 요구사항을 코드 구조로도
// 지킨다(하드코딩된 단일 가격이 아니라 후보 배열 + 추천 인덱스).

export interface PriceCandidate {
  amountKrw: number;
  label: string;
  /** 이 가격을 가설로 세운 이유 (A/B 테스트 근거) */
  hypothesis: string;
}

export const PRICE_CANDIDATES: PriceCandidate[] = [
  {
    amountKrw: 2900,
    label: "2,900원",
    hypothesis:
      "가장 낮은 결제 장벽. 다만 콘텐츠 단독 상품 치고 너무 저렴하면 '별거 없겠지' 하는 신뢰 저하 리스크가 있음.",
  },
  {
    amountKrw: 4900,
    label: "4,900원",
    hypothesis:
      "국내 디지털 콘텐츠 단건 결제의 대표적인 심리적 임계선(5,000원 미만). 충동구매 허들은 낮게 유지하면서 '싸구려' 인상은 피함.",
  },
  {
    amountKrw: 7900,
    label: "7,900원",
    hypothesis:
      "체감 가치는 높아지지만 '한번 생각해볼게요' 이탈이 늘어날 가능성. 호기심 기반 충동 구매 맥락에는 다소 무거움.",
  },
];

function priceFromEnv(): PriceCandidate | null {
  const raw = process.env.NEXT_PUBLIC_PAYMENT_PRICE_KRW;
  const amountKrw = raw ? Number(raw) : NaN;
  if (!Number.isFinite(amountKrw) || amountKrw <= 0) return null;
  return { amountKrw, label: `${amountKrw.toLocaleString("ko-KR")}원`, hypothesis: "운영자 설정값(NEXT_PUBLIC_PAYMENT_PRICE_KRW)" };
}

/** 1순위 추천: 결제 장벽은 낮으면서 저가 인상은 덜한 지점. 가격이 아직
 * 미정이라 운영자가 코드 수정 없이(Vercel 환경변수 NEXT_PUBLIC_PAYMENT_PRICE_KRW)
 * 바꿔볼 수 있게 한다 — 값을 못 읽으면 후보 중 추천값(4,900원)으로 떨어진다. */
export const RECOMMENDED_PRICE: PriceCandidate = priceFromEnv() ?? PRICE_CANDIDATES[1];

/** 결제수단 노출 목록. 아직 실제 결제 연동 전이라 문구만 준비한다 — 마찬가지로
 * 환경변수(쉼표 구분)로 운영자가 바꿀 수 있다. */
export const PAYMENT_METHODS: string[] =
  process.env.NEXT_PUBLIC_PAYMENT_METHODS?.split(",").map((s) => s.trim()).filter(Boolean) ?? ["카카오페이", "토스페이"];
