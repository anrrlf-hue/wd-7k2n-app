// 결제로 받는 첫 실행 리포트의 구성 항목 — analysis-result-card.tsx(결제 전
// 미리보기)와 payment-screen.tsx(PaywallOffer의 includedItems)가 같은
// 목록을 공유한다. 두 화면에서 문구가 어긋나지 않도록 한 곳에만 둔다.
// analysis-result-copy.ts와 같은 패턴으로 순수 데이터만 담아 운영자가
// 통째로 교체할 수 있게 한다.

export const REPORT_CONTENTS: string[] = ["병목 진단 1개와 이유", "지금 안 해도 되는 것", "30일 실행계획", "90일 돈관리 시스템"];
