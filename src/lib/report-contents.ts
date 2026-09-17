// 결제로 받는 첫 실행 리포트의 구성 항목 — analysis-result-card.tsx(결제 전
// 미리보기)와 payment-screen.tsx(PaywallOffer의 includedItems)가 같은
// 목록을 공유한다. 두 화면에서 문구가 어긋나지 않도록 한 곳에만 둔다.

export const REPORT_CONTENTS: string[] = [
  "지금 가장 먼저 손대야 할 부분",
  "왜 그게 우선인지에 대한 설명",
  "지금 당장은 안 해도 되는 것",
];
