"use client";

import { PaywallOffer } from "@/components/diagnosis/paywall-offer";

/** 결제 화면 — 분석 결과 화면과 분리된 별도 단계. 기존 PaywallOffer를
 * 그대로 재사용한다(독립적인 카드 컴포넌트라 구조 변경 불필요). 결제는
 * 여전히 준비 중 — PaywallOffer의 CTA는 실제 결제를 완료시키지 않는다. */
export function PaymentScreen() {
  return (
    <div className="mt-8">
      <PaywallOffer
        title="당신에게 맞는 실행 방법"
        includedItems={[
          "지금 가장 먼저 손대야 할 부분",
          "왜 그게 우선인지에 대한 설명",
          "지금 당장은 안 해도 되는 것",
        ]}
        ctaText="결제하고 실행 방법 확인하기"
      />
    </div>
  );
}
