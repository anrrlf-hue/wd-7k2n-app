export const PAID_PRODUCT = {
  sku: "finance-one-question-v1",
  name: "내 돈 고민 한 가지 현실판정",
  priceKrw: 9900,
  promise:
    "한 가지 돈 고민을 실제 금액과 날짜로 확인해, 지금 계획이 가능한지와 무엇을 바꿀지까지 정리합니다.",
  included: [
    "내가 고른 돈 고민 1개",
    "확인한 금액·날짜와 빠진 정보",
    "가능 / 부족 / 추가 확인이 필요한지 현실판정",
    "지금 선택할 수 있는 방향 2개",
    "오늘 시작할 첫 행동 1개",
    "30일 뒤 재점검 1회",
  ],
  excluded: [
    "사주·손금으로 수익이나 투자 결과를 예측하지 않습니다.",
    "특정 금융상품 매수·가입을 권하지 않습니다.",
    "무제한 상담이나 상시 관리는 포함하지 않습니다.",
  ],
  recheckCount: 1,
  status: "preview" as const,
};

export const PAID_PRODUCT_INCLUDED = PAID_PRODUCT.included;
