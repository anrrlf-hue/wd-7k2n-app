"use client";

import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { REPORT_CONTENTS } from "@/lib/report-contents";

/** 결제 화면 — 분석 결과 화면과 분리된 별도 단계. 기존 PaywallOffer를
 * 그대로 재사용한다(독립적인 카드 컴포넌트라 구조 변경 불필요). 결제는
 * 여전히 준비 중 — PaywallOffer의 CTA는 실제 결제를 완료시키지 않는다.
 * 리포트 구성 항목은 analysis-result-card.tsx의 미리보기와 같은 목록을
 * 공유한다(report-contents.ts) — 두 화면 문구가 어긋나지 않게. */
export function PaymentScreen() {
  return (
    <div className="mt-8">
      <PaywallOffer
        title="당신에게 맞는 실행 방법"
        includedItems={REPORT_CONTENTS}
        ctaText="결제하고 실행 방법 확인하기"
      />
    </div>
  );
}
