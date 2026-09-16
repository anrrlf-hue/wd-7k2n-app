// 분석 결과 화면 카피 — 순수 데이터, 로직 없음(운영자 교체 가능).
// BottleneckCode별 {제목, 왜, 생활에서의 의미, 지금 안 해도 되는 것}.
// 특정 금융상품·해법은 지목하지 않는다.

import type { BottleneckCode } from "@/lib/bottleneck-engine";

export interface BottleneckCopyEntry {
  title: string;
  why: string;
  lifeMeaning: string;
  notUrgent: string;
}

export const BOTTLENECK_COPY: Record<BottleneckCode, BottleneckCopyEntry> = {
  cash_flow_deficit: {
    title: "현금흐름",
    why: "월 소득에서 고정지출과 저축을 빼면 마이너스입니다.",
    lifeMeaning: "매달 쓸 수 있는 돈보다 나가는 돈이 더 많다는 뜻입니다. 카드값이나 마이너스통장으로 메우고 있을 가능성이 높습니다.",
    notUrgent: "투자나 저축을 늘리는 것",
  },
  income_interruption_risk: {
    title: "소득 중단 위험",
    why: "곧 소득이 끊기거나 줄어들 수 있는 시기입니다.",
    lifeMeaning: "지금 소득 흐름이 당연하게 계속될 거라 가정하고 있다면 위험합니다.",
    notUrgent: "장기 투자 계획",
  },
  high_interest_debt: {
    title: "고금리 부채",
    why: "금리가 높거나 만기가 임박한 빚이 있습니다.",
    lifeMeaning: "이자만으로 매달 상당액이 그냥 빠져나가고 있을 수 있습니다.",
    notUrgent: "저축을 늘리는 것",
  },
  near_future_funds_shortfall: {
    title: "가까운 목적자금",
    why: "가까운 시일 안에 목돈이 필요한데 준비된 돈이 부족합니다.",
    lifeMeaning: "그 시점이 왔을 때 급하게 빚을 내거나 계획을 미뤄야 할 수 있습니다.",
    notUrgent: "장기 자산관리",
  },
  emergency_fund_shortage: {
    title: "비상자금",
    why: "비상자금이 부족합니다.",
    lifeMeaning: "예상 못 한 지출이 생기면 바로 흔들릴 수 있는 구조입니다.",
    notUrgent: "투자 효율을 높이는 것",
  },
  biz_personal_mixed: {
    title: "사업자금·생활비 혼합",
    why: "사업자금과 생활비가 섞여 있습니다.",
    lifeMeaning: "실제로 얼마나 벌고 얼마나 쓰는지 스스로도 파악하기 어려운 상태입니다.",
    notUrgent: "저축 시스템을 만드는 것",
  },
  card_installment_dependence: {
    title: "카드·할부 의존",
    why: "카드나 할부에 반복적으로 의존하고 있습니다.",
    lifeMeaning: "이번 달 지출이 다음 달로 계속 넘어가는 구조입니다.",
    notUrgent: "투자",
  },
  no_expense_awareness: {
    title: "지출 파악",
    why: "실제 지출을 정확히 모르고 계십니다.",
    lifeMeaning: "어디서 새는지 모르는 채로 절약을 시도하면 효과가 안 보입니다.",
    notUrgent: "저축액부터 늘리는 것",
  },
  no_savings_system: {
    title: "저축 시스템",
    why: "정해진 저축 시스템이 없습니다.",
    lifeMeaning: "남으면 저축하는 방식이라 남는 달도 있고 아예 없는 달도 있을 수 있습니다.",
    notUrgent: "투자 상품을 고르는 것",
  },
  long_term_goal_pace_short: {
    title: "장기 목표 속도",
    why: "장기 목표 대비 준비 속도가 느립니다.",
    lifeMeaning: "지금 속도로는 목표 시점에 필요한 만큼 모이지 않을 수 있습니다.",
    notUrgent: "단기 지출 관리",
  },
  investment_efficiency: {
    title: "자산 운용 효율",
    why: "기본적인 자금 구조는 안정적입니다.",
    lifeMeaning: "이제는 지금 자산을 얼마나 효율적으로 굴리고 있는지 볼 차례입니다.",
    notUrgent: "추가 소득원을 찾는 것",
  },
};
