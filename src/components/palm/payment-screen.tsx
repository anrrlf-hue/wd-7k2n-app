"use client";

import { PaywallOffer } from "@/components/diagnosis/paywall-offer";
import { TrustBadges } from "@/components/palm/trust-badges";
import { REPORT_CONTENTS } from "@/lib/report-contents";
import { PAYMENT_TIMING_NOTICE, REFUND_POLICY_NOTICE } from "@/lib/payment-notices";
import { JourneyScene } from "@/components/journey-scene";
import type { ManagementMethod } from "@/lib/management-method";

/** 결제 화면 — 분석 결과 화면과 분리된 별도 단계. 기존 PaywallOffer를
 * 그대로 재사용한다(독립적인 카드 컴포넌트라 구조 변경 불필요). 결제는
 * 여전히 준비 중 — PaywallOffer의 CTA는 실제 결제를 완료시키지 않는다.
 * 리포트 구성 항목은 analysis-result-card.tsx의 미리보기와 같은 목록을
 * 공유한다(report-contents.ts) — 두 화면 문구가 어긋나지 않게. 신뢰 신호
 * (TrustBadges)와 결제 소요시간·환불정책 안내를 이 화면에 배치한다. */
export function PaymentScreen({ method, onBack }: { method: ManagementMethod | null; onBack: () => void }) {
  return (
    <div>
      <JourneyScene scene="reality" compact />
      <p className="section-eyebrow mt-6">맞춤 관리 리포트</p>
      <h2 className="mt-3 text-2xl font-semibold">알게 된 나를,<br />지속할 수 있는 방법으로</h2>
      <p className="mt-3 text-sm text-muted-foreground">현재 준비 중인 리포트의 구성입니다. 결제 기능과 리포트 제공은 아직 시작되지 않았어요.</p>
      {method && <div className="mt-6 rounded-2xl border border-border p-5">
        <p className="section-eyebrow">내 응답에서 찾은 실행 방향</p>
        <h3 className="mt-2 text-base font-semibold">{method.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{method.routine}</p>
      </div>}
      <PaywallOffer
        title="나에게 맞는 실제 돈 관리방법"
        includedItems={REPORT_CONTENTS}
        ctaText="나에게 맞는 관리계획 받기"
      />
      <TrustBadges />
      <p className="mt-3 text-center text-xs text-muted-foreground">{PAYMENT_TIMING_NOTICE}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{REFUND_POLICY_NOTICE}</p>
      <button type="button" onClick={onBack} className="mt-6 min-h-11 w-full text-xs text-muted-foreground underline underline-offset-4">무료 종합진단 다시 보기</button>
    </div>
  );
}
