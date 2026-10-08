export const PAID_PRODUCT = {
  sku: "person-situation-deep-dive-v1",
  name: "이 사람·이 상황 깊게 보기",
  priceKrw: null,
  promise:
    "연애·동업·직장·이직·사업처럼 지금 가장 궁금한 사람이나 상황 하나를 골라, 사주 흐름과 관계 맥락을 더 깊게 이어봅니다.",
  included: [
    "궁금한 사람 또는 상황 1개",
    "지금 관계·상황의 핵심",
    "잘 맞는 부분과 부딪히는 부분",
    "가장 눈여겨볼 시기",
    "좋은 방향과 조심할 방향",
    "한 번 더 좁혀보는 후속 질문",
  ],
  excluded: [
    "의료·법률·투자 결과를 확정적으로 예측하지 않습니다.",
    "미래 사건이나 상대의 행동을 보장하지 않습니다.",
    "무제한 상담이나 상시 관리는 포함하지 않습니다.",
  ],
  priceStatus: "unvalidated" as const,
  status: "beta_not_for_sale" as const,
};

export const PAID_PRODUCT_INCLUDED = PAID_PRODUCT.included;
