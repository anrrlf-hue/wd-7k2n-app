// 결제 직전 다리에서 받는 최소한의 현실정보. 상세 재무상담 신청서가 아니라
// 모바일에서 탭 몇 번으로 끝나는 7개 단일선택 질문이다. 전부 구간형
// 선택지로만 받는다 — 정확한 금액을 텍스트로 입력받지 않는다(입력 부담을
// 줄이고, 실제로 정밀 계산에 쓰지도 않는다. connection-diagnosis.ts는 이
// 구간값만으로 사주 방향과 비교한다).

export interface RealityOption {
  value: string;
  label: string;
}

export const JOB_TYPE_OPTIONS: RealityOption[] = [
  { value: "employee", label: "직장인" },
  { value: "freelancer", label: "프리랜서·개인사업" },
  { value: "business_owner", label: "사업체 운영" },
  { value: "job_seeking", label: "구직·이직 준비 중" },
  { value: "student", label: "학생·무직" },
];

export const INCOME_RANGE_OPTIONS: RealityOption[] = [
  { value: "under_200", label: "200만원 미만" },
  { value: "200_400", label: "200~400만원" },
  { value: "400_700", label: "400~700만원" },
  { value: "over_700", label: "700만원 이상" },
  { value: "irregular", label: "들쭉날쭉함" },
];

export const EXPENSE_LEVEL_OPTIONS: RealityOption[] = [
  { value: "much_less", label: "소득보다 훨씬 적음" },
  { value: "less", label: "소득보다 조금 적음" },
  { value: "similar", label: "소득과 비슷함" },
  { value: "more", label: "소득보다 많음" },
];

export const SAVINGS_OPTIONS: RealityOption[] = [
  { value: "none", label: "저축 여력 없음" },
  { value: "under_10", label: "월 10만원 미만" },
  { value: "10_50", label: "월 10~50만원" },
  { value: "over_50", label: "월 50만원 이상" },
];

export const DEBT_OPTIONS: RealityOption[] = [
  { value: "none", label: "없음" },
  { value: "under_1000", label: "1천만원 이하" },
  { value: "1000_5000", label: "1천~5천만원" },
  { value: "over_5000", label: "5천만원 이상" },
];

export const MAIN_CONCERN_OPTIONS: RealityOption[] = [
  { value: "not_saving", label: "돈이 안 모임" },
  { value: "low_income", label: "버는 돈 자체가 부족함" },
  { value: "career", label: "이직·사업 방향이 고민됨" },
  { value: "debt", label: "빚 정리가 급함" },
  { value: "vague_anxiety", label: "막연히 불안함" },
];

export const CONSIDERING_OPTIONS: RealityOption[] = [
  { value: "none", label: "특별히 없음" },
  { value: "job_change", label: "이직" },
  { value: "startup", label: "창업·독립" },
  { value: "investment", label: "투자" },
  { value: "saving_boost", label: "저축·지출 구조 바꾸기" },
];

export interface RealityInput {
  jobType: string;
  incomeRange: string;
  expenseLevel: string;
  savings: string;
  debt: string;
  mainConcern: string;
  considering: string;
}

export const REALITY_INPUT_QUESTIONS: {
  key: keyof RealityInput;
  question: string;
  options: RealityOption[];
}[] = [
  { key: "jobType", question: "지금 어떤 형태로 일하고 계세요?", options: JOB_TYPE_OPTIONS },
  { key: "incomeRange", question: "월 소득은 어느 정도예요?", options: INCOME_RANGE_OPTIONS },
  { key: "expenseLevel", question: "월 지출은 소득과 비교하면 어때요?", options: EXPENSE_LEVEL_OPTIONS },
  { key: "savings", question: "매달 저축하거나 저축할 수 있는 돈은 얼마나 돼요?", options: SAVINGS_OPTIONS },
  { key: "debt", question: "대출이나 빚이 있다면 규모가 어느 정도예요?", options: DEBT_OPTIONS },
  { key: "mainConcern", question: "지금 가장 해결하고 싶은 돈·일 문제는요?", options: MAIN_CONCERN_OPTIONS },
  { key: "considering", question: "지금 고민 중인 선택지가 있다면요?", options: CONSIDERING_OPTIONS },
];
