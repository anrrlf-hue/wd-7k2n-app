// 분석 결과 화면 카피 — 순수 데이터, 로직 없음(운영자 교체 가능).
// BottleneckCode별 {제목, 왜, 생활에서의 의미, 지금 안 해도 되는 것 + 그 이유}.
// 특정 금융상품·해법은 지목하지 않는다. notUrgentReason은 "왜 뒤로 밀리는지"를
// 반드시 설명한다(결과만 던지지 않는다 — 운영 문서 §5 요구사항).

import type { BottleneckCode } from "@/lib/bottleneck-engine";

export interface BottleneckCopyEntry {
  title: string;
  why: string;
  lifeMeaning: string;
  notUrgent: string;
  notUrgentReason: string;
}

export const BOTTLENECK_COPY: Record<BottleneckCode, BottleneckCopyEntry> = {
  purpose_fund_confirmation: {
    title: "목적자금 추가 확인", why: "준비한 비율만으로는 일정까지 돈이 부족할지 판단할 수 없어요.",
    lifeMeaning: "전체 저축액이 이 목표에 쓰일 돈과 같지는 않습니다. 아직 부족하다고 판정하지 않았어요.",
    notUrgent: "목표를 포기하거나 차입을 결정하는 것", notUrgentReason: "실제 필요액·준비액·월 배정액·기한을 먼저 확인해야 해요.",
  },
  maturity_preparation: {
    title: "만기 상환 준비", why: "대출 만기가 3개월 이내라고 답했어요. 금리가 높다는 뜻은 아닙니다.",
    lifeMeaning: "만기에 실제로 갚아야 하는 잔액과 따로 준비한 돈을 맞춰볼 시점이에요.",
    notUrgent: "상환 준비가 부족하다고 단정하는 것", notUrgentReason: "원리금상환 중인 대출도 만기 잔액은 계약과 상환내역을 확인해야 해요.",
  },
  income_variability_risk: {
    title: "소득이 낮은 달의 생활비 준비", why: "입력한 낮은 달 소득이 고정지출·생활비 합계보다 적어요.",
    lifeMeaning: "평균 소득만 보면 놓치는 달이 있어요. 부족분을 준비한 현금으로 충당할 수 있는지 확인해요.",
    notUrgent: "높은 달 소득을 기준으로 지출을 늘리는 것", notUrgentReason: "높은 달의 여유가 매달 반복된다고 볼 수 없어요.",
  },
  insufficient_data: {
    title: "추가 정보 확인", why: "현재 답변만으로는 우선순위를 정하기 어렵습니다.",
    lifeMeaning: "빈칸은 0원과 다릅니다. 한 달 소득과 지출, 준비된 현금을 확인해 주세요.",
    notUrgent: "관리방법을 결정하는 것", notUrgentReason: "확인되지 않은 숫자로 계획을 세우면 실제 상황과 어긋날 수 있어요.",
  },
  no_priority_bottleneck: {
    title: "현재 흐름 유지", why: "입력한 범위에서는 먼저 해결할 뚜렷한 병목이 보이지 않습니다.",
    lifeMeaning: "투자를 더 해야 한다는 뜻은 아닙니다. 목표와 자산 구성이 있어야 다음 판단이 가능해요.",
    notUrgent: "새로운 투자 방법을 찾는 것", notUrgentReason: "지금 답변으로는 투자 효율을 평가할 수 없어요.",
  },
  cash_flow_deficit: {
    title: "현금흐름",
    why: "월 소득에서 고정지출·생활비·저축과 투자를 빼면 마이너스입니다.",
    lifeMeaning: "매달 쓸 수 있는 돈보다 나가는 돈이 더 많다는 뜻입니다. 저축 배분까지 포함한 예산이 소득을 넘습니다. 실제 차입 여부는 별도로 확인해야 해요.",
    notUrgent: "투자나 저축을 늘리는 것",
    notUrgentReason: "지금은 나가는 돈부터 줄이는 게 먼저이고, 마이너스 상태에서 늘리는 저축은 오히려 부담만 키우기 때문입니다.",
  },
  income_interruption_risk: {
    title: "소득 중단 위험",
    why: "곧 소득이 끊기거나 줄어들 수 있는 시기입니다.",
    lifeMeaning: "지금 소득 흐름이 당연하게 계속될 거라 가정하고 있다면 위험합니다.",
    notUrgent: "장기 투자 계획",
    notUrgentReason: "소득이 불안정한 시기엔 장기 계획보다 지금 당장의 현금 흐름을 지키는 게 우선이기 때문입니다.",
  },
  high_interest_debt: {
    title: "고금리 부채",
    why: "대출 금리가 연 15% 이상 구간이라고 답했어요.",
    lifeMeaning: "실제 이자 부담은 잔액과 상환 방식에 따라 달라요. 월 상환액 전체를 이자로 보지 않습니다.",
    notUrgent: "저축을 늘리는 것",
    notUrgentReason: "빚의 이자율이 저축으로 버는 수익보다 훨씬 크면, 저축보다 빚부터 줄이는 쪽이 실질적으로 더 이득이기 때문입니다.",
  },
  near_future_funds_shortfall: {
    title: "가까운 목적자금",
    why: "입력한 필요액·준비액·월 배정액·기한으로 계산한 계획에 부족분이 있어요.",
    lifeMeaning: "정확한 입금일과 추가 자금에 따라 달라질 수 있어요. 월 배정액이나 목표 규모를 조정할 수 있는지 먼저 살펴보세요.",
    notUrgent: "장기 자산관리",
    notUrgentReason: "가까운 시점에 필요한 돈부터 확보되지 않으면, 장기 계획은 그 전에 흔들릴 수 있기 때문입니다.",
  },
  emergency_fund_shortage: {
    title: "비상자금",
    why: "비상자금이 부족합니다.",
    lifeMeaning: "예상 못 한 지출이 생기면 바로 흔들릴 수 있는 구조입니다.",
    notUrgent: "투자",
    notUrgentReason: "비상자금이 채워지기 전엔 투자 수익률보다, 그 돈이 필요할 때 바로 쓸 수 있는지가 더 중요하기 때문입니다.",
  },
  biz_personal_mixed: {
    title: "사업자금·생활비 혼합",
    why: "사업자금과 생활비가 섞여 있습니다.",
    lifeMeaning: "실제로 얼마나 벌고 얼마나 쓰는지 스스로도 파악하기 어려운 상태입니다.",
    notUrgent: "저축 시스템을 만드는 것",
    notUrgentReason: "지금 얼마가 진짜 내 돈인지부터 명확해지지 않으면, 저축 목표 자체를 정하기 어렵기 때문입니다.",
  },
  card_installment_dependence: {
    title: "카드·할부 의존",
    why: "생활비 부족을 카드로 반복 충당한다고 직접 답했어요.",
    lifeMeaning: "이번 달 지출이 다음 달로 계속 넘어가는 구조입니다.",
    notUrgent: "투자",
    notUrgentReason: "매달 카드값이 먼저 빠져나가는 구조에서는 투자할 여윳돈 자체가 계속 줄어들기 때문입니다.",
  },
  no_expense_awareness: {
    title: "지출 파악",
    why: "실제 지출을 정확히 모르고 계십니다.",
    lifeMeaning: "어디서 새는지 모르는 채로 절약을 시도하면 효과가 안 보입니다.",
    notUrgent: "저축액부터 늘리는 것",
    notUrgentReason: "어디서 새는지 모르는 채로 저축만 늘리면, 결국 새는 곳을 못 막아 저축도 오래 못 가기 때문입니다.",
  },
  no_savings_system: {
    title: "저축 시스템",
    why: "정해진 저축 시스템이 없습니다.",
    lifeMeaning: "남으면 저축하는 방식이라 남는 달도 있고 아예 없는 달도 있을 수 있습니다.",
    notUrgent: "투자 상품을 고르는 것",
    notUrgentReason: "저축 자체가 자동으로 안 되는 구조에서는 투자 상품을 골라도 매달 넣을 돈이 달라지기 때문입니다.",
  },
  long_term_goal_pace_short: {
    title: "장기 목표 속도",
    why: "장기 목표 대비 준비 속도가 느립니다.",
    lifeMeaning: "지금 속도로는 목표 시점에 필요한 만큼 모이지 않을 수 있습니다.",
    notUrgent: "단기 지출 관리",
    notUrgentReason: "장기 목표의 속도 자체가 문제라면, 단기 지출을 아무리 관리해도 목표 시점을 맞추기 어렵기 때문입니다.",
  },
  investment_efficiency: {
    title: "자산 운용 효율",
    why: "기본적인 자금 구조는 안정적입니다.",
    lifeMeaning: "이제는 지금 자산을 얼마나 효율적으로 굴리고 있는지 볼 차례입니다.",
    notUrgent: "추가 소득원을 찾는 것",
    notUrgentReason: "지금 구조가 안정적이라면, 새 소득원을 찾기 전에 있는 자산을 효율적으로 굴리는 쪽이 먼저이기 때문입니다.",
  },
};
