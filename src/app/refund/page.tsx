import Link from "next/link";

export default function RefundPage() {
  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-8">
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">처음으로</Link>
        <p className="mt-5 section-eyebrow">운·돈</p>
        <h1 className="mt-2 text-2xl font-semibold">결제·환불 안내</h1>

        <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
          <h2 className="font-semibold">현재는 무료 베타입니다</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            지금 공개된 사주·손금·관계 기능에서는 결제가 발생하지 않습니다.
          </p>
        </section>

        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">유료 기능을 시작할 때</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            상품명, 가격, 제공 범위, 제공 시점, 취소·환불 조건을 결제 전에 한 화면에서 확인할 수 있도록 고지하고, 실제 결제수단이 연결된 뒤에만 결제를 받습니다.
          </p>
        </section>
      </div>
    </main>
  );
}
