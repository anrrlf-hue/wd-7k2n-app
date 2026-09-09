import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <LandingReveal>
        <p className="mb-4 text-sm font-medium tracking-wide text-muted-foreground">
          1분이면 끝나는 무료 진단
        </p>
        <h1 className="mx-auto max-w-sm text-balance text-4xl font-semibold leading-snug tracking-tight">
          왜 나는
          <br />
          돈이 안 모일까?
        </h1>
        <p className="mx-auto mt-5 max-w-xs text-balance text-base leading-relaxed text-muted-foreground">
          재물운의 문제일까요, 돈을 대하는 방식의 문제일까요?
          <br />
          생년월일로 나의 돈 성향을 확인해보세요.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="h-13 w-full max-w-xs rounded-full text-base">
            <Link href="/diagnosis">내 돈 성향 무료로 보기</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          재미로 보는 콘텐츠예요. 특정 금융상품을 권유하지 않아요.
        </p>
      </LandingReveal>
    </main>
  );
}
