export const PAID_PRODUCT = {
  sku: "premium-annual-report-v1",
  name: "프리미엄 1년 리포트",
  priceKrw: null,
  promise:
    "무료풀이에서 본 성향을 반복하지 않고, 부족한 부분을 어떻게 채울지·강점을 좋은 결과로 연결하려면 무엇을 해야 할지·앞으로 12개월의 월별 흐름까지 한 번에 정리합니다.",
  included: [
    "무료보다 깊은 핵심 성향과 반복 패턴",
    "부족한 부분과 구체적인 보완 방법",
    "연애·관계 / 일·직업·사업 / 돈·재물 / 생활·건강 심화",
    "앞으로 12개월 월별 운세",
    "좋게 쓰기 좋은 시기와 조심할 시기",
    "좋은 결과를 만들기 위한 실행 방향",
    "양손 손금이 있으면 타고난 나와 현재 변화까지 반영",
  ],
  excluded: [
    "의료·법률·투자 결과를 확정적으로 예측하지 않습니다.",
    "특정 사건이나 상대의 행동을 보장하지 않습니다.",
    "무제한 상담이나 반복 질문 기능은 포함하지 않습니다.",
  ],
  priceStatus: "unvalidated" as const,
  status: "beta_not_for_sale" as const,
};

export const PAID_PRODUCT_INCLUDED = PAID_PRODUCT.included;
