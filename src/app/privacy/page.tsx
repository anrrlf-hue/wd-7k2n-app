import Link from "next/link";
import { ReadingStorageControls } from "@/components/reading-storage-controls";

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
              손 사진은 브라우저에서 손금 특징을 분석하는 데 사용합니다. 서버에는 원본 손 사진 대신 분석된 손금 특징 정보가 전달됩니다. 사진 원본은 브라우저 저장소에 보관하지 않습니다. 같은 화면에서 재시도하는 동안에는 사진이 메모리에 남을 수 있고, 화면을 떠날 때 미리보기를 해제합니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">이용기록과 저장</h2>
            <p className="mt-2 text-muted-foreground">
              진행 중인 사주 입력, 손금 화면으로 이어갈 입력, 완료된 손금 특징, 풀이와 이전 리포트는 같은 탭의 세션 저장소에 보관합니다. 탭을 닫아도 브라우저의 탭 복원 기능에 따라 다시 나타날 수 있습니다. 사주 분석 후 내 생년월일은 로컬 저장소에도 자동 저장되며, 저장된 비교할 사람의 정보와 관리 기록도 다음 방문까지 남습니다.
            </p>
            <p className="mt-2 text-muted-foreground">통합 연간 풀이와 손금 해석은 서비스 내부의 계산·문장 규칙으로 만듭니다. 별도의 무료 사주·질문 기능은 운영 설정에 따라 외부 해석 서비스(Anthropic)에 계산된 사주 정보와 입력한 질문 등을 전달할 수 있습니다. 손 사진 원본은 이 요청에 포함하지 않습니다.</p>
            <p className="mt-2 text-muted-foreground">이용 통계가 켜진 경우 임의로 만든 세션 식별자와 완료·공유·질문 같은 제품 이용 이벤트를 기록합니다. 해당 이벤트에는 생년월일·질문 본문·손 사진·풀이 원문을 넣지 않습니다. 결제카드 정보는 현재 수집하지 않습니다.</p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">공유 링크</h2>
            <p className="mt-2 text-muted-foreground">
              서비스 공유 링크는 무료 사주 시작 화면의 주소만 전달합니다. 이름·생년월일·태어난 시각·손 사진·개인 풀이를 링크에 넣거나 공유용으로 공개 저장하지 않습니다. 이전 형식의 링크를 열어도 개인 풀이를 표시하지 않고 무료 사주 시작 화면으로 이동합니다.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">이용자의 선택</h2>
            <p className="mt-2 text-muted-foreground">
              출생시간과 MBTI는 선택할 수 있습니다. 아래 기능은 이 탭에서 접근 가능한 사주 서비스의 세션·로컬 저장소 기록을 지웁니다. 방문 기록의 URL, 다른 기기와 서버의 이용 통계는 지우지 않습니다. 다른 탭이 열려 있다면 진행 내용을 다시 저장할 수 있습니다.
            </p>
            <ReadingStorageControls />
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
