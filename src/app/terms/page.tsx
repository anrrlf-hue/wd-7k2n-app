import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-8">
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">처음으로</Link>
        <p className="mt-5 section-eyebrow">운·돈</p>
        <h1 className="mt-2 text-2xl font-semibold">이용안내</h1>

        <div className="mt-6 space-y-4 text-sm leading-7">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">서비스 성격</h2>
            <p className="mt-2 text-muted-foreground">
              운·돈은 전통 사주·손금 해석을 바탕으로 자기이해, 관계, 일·직업, 재물, 생활의 흐름을 재미있고 이해하기 쉽게 보여주는 콘텐츠 서비스입니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">결과의 활용</h2>
            <p className="mt-2 text-muted-foreground">
              결과는 중요한 의료·법률·투자·채용·신용 판단을 대신하지 않습니다. 실제 결정에는 현재 상황과 전문적인 정보를 함께 확인해 주세요.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">다른 사람 정보</h2>
            <p className="mt-2 text-muted-foreground">
              관계 비교에는 상대방의 정보를 입력할 수 있습니다. 이용자는 본인이 적법하게 알고 있고 서비스 이용에 사용할 수 있는 정보만 입력해야 합니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">무료 베타</h2>
            <p className="mt-2 text-muted-foreground">
              현재 공개 단계는 무료 베타입니다. 기능과 표현은 실제 이용 반응에 따라 개선될 수 있으며, 유료 기능은 결제 조건을 별도로 고지한 뒤 시작합니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
