import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/95">
      <div className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-5 py-5 text-xs text-muted-foreground">
        <Link href="/privacy" className="underline-offset-4 hover:underline">개인정보처리방침</Link>
        <Link href="/terms" className="underline-offset-4 hover:underline">이용안내</Link>
        <Link href="/refund" className="underline-offset-4 hover:underline">결제·환불 안내</Link>
        <span className="basis-full text-center">운·돈 · 사주와 손금으로 나와 관계를 이해하는 서비스</span>
      </div>
    </footer>
  );
}
