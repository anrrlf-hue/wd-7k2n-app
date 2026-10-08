import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-8">
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">처음으로</Link>
        <p className="mt-5 section-eyebrow">운·돈</p>
        <h1 className="mt-2 text-2xl font-semibold">개인정보처리방침</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          무료 베타 기준으로 실제 서비스가 처리하는 정보와 보관 방식을 설명합니다.
        </p>

        <div className="mt-6 space-y-4 text-sm leading-7">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">처리하는 정보</h2>
            <p className="mt-2 text-muted-foreground">
              사주 계산을 위해 생년월일, 성별, 선택 입력인 출생시간과 MBTI를 사용합니다. 관계 비교를 이용하면 상대방의 생년월일, 성별, 선택 입력인 출생시간과 호칭을 추가로 사용합니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">손 사진</h2>
            <p className="mt-2 text-muted-foreground">
              손 사진은 브라우저에서 손금 특징을 분석하는 데 사용합니다. 서버에는 원본 손 사진 대신 분석된 손금 특징 정보가 전달되도록 구성되어 있습니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">이용기록과 저장</h2>
            <p className="mt-2 text-muted-foreground">
              진행 중인 결과와 질문 기록 일부는 브라우저의 세션·로컬 저장소에 보관될 수 있습니다. 서비스 개선을 위해 익명 세션 식별자와 완료·공유·질문 같은 제품 이용 이벤트를 기록할 수 있으며, 결제카드 정보는 현재 서비스가 수집하지 않습니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">공유 링크</h2>
            <p className="mt-2 text-muted-foreground">
              관계 결과 공유 링크에는 두 사람의 생년월일이나 손 사진을 직접 넣지 않고, 공유용으로 축약한 관계 풀이만 담습니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">이용자의 선택</h2>
            <p className="mt-2 text-muted-foreground">
              출생시간과 MBTI는 선택할 수 있습니다. 브라우저에 저장된 기록은 서비스의 다시 시작·기록 삭제 기능 또는 브라우저 저장공간 삭제를 통해 지울 수 있습니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">문의</h2>
            <p className="mt-2 text-muted-foreground">
              무료 베타 기간의 운영자 연락처는 정식 도메인 연결과 함께 서비스 화면에 고정해 공개할 예정입니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
