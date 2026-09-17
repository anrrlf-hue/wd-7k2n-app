"use client";

import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { TrustBadges } from "@/components/palm/trust-badges";
import { REPORT_CONTENTS } from "@/lib/report-contents";
import { PAYMENT_TIMING_NOTICE, REFUND_POLICY_NOTICE } from "@/lib/payment-notices";

/** 결제 화면 — 분석 결과 화면과 분리된 별도 단계. 기존 PaywallOffer를
 * 그대로 재사용한다(독립적인 카드 컴포넌트라 구조 변경 불필요). 결제는
 * 여전히 준비 중 — PaywallOffer의 CTA는 실제 결제를 완료시키지 않는다.
 * 리포트 구성 항목은 analysis-result-card.tsx의 미리보기와 같은 목록을
 * 공유한다(report-contents.ts) — 두 화면 문구가 어긋나지 않게. 신뢰 신호
 * (TrustBadges)와 결제 소요시간·환불정책 안내를 이 화면에 배치한다. */
export function PaymentScreen() {
  return (
    <div className="mt-8">
      <p className="section-eyebrow">맞춤 관리 리포트</p>
      <h2 className="mt-3 text-2xl font-semibold">알게 된 나를,<br />지속할 수 있는 방법으로</h2>
      <p className="mt-3 text-sm text-muted-foreground">현재 준비 중인 리포트의 구성입니다. 결제 기능과 리포트 제공은 아직 시작되지 않았어요.</p>
      <PaywallOffer
        title="나에게 맞는 실제 돈 관리방법"
        includedItems={REPORT_CONTENTS}
        ctaText="나에게 맞는 관리계획 받기"
      />
      <TrustBadges />
      <p className="mt-3 text-center text-xs text-muted-foreground">{PAYMENT_TIMING_NOTICE}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{REFUND_POLICY_NOTICE}</p>
    </div>
  );
}
