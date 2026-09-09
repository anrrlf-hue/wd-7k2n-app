import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { HeroVisual } from "@/components/landing/hero-visual";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <LandingReveal>
        <HeroVisual />

        <p className="mb-4 text-sm font-medium tracking-wide text-(--gold)">
          1분이면 끝나는 무료 사주 진단
        </p>
        <h1 className="mx-auto max-w-xs text-balance text-4xl leading-snug font-semibold tracking-tight">
          내 사주엔
          <br />
          얼마나 큰 재물운이
          <br />
          숨어 있을까?
        </h1>
        <p className="mx-auto mt-5 max-w-xs text-balance text-base leading-relaxed text-muted-foreground">
          타고난 재물운부터 돈을 버는 방식, 기회를 잡는 힘까지.
          <br />
          생년월일 하나로 지금 확인해보세요.
        </p>
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            className="h-13 w-full max-w-xs rounded-full text-base shadow-[0_0_24px_var(--gold-soft)]"
          >
            <Link href="/diagnosis">내 재물운 무료로 확인하기</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          재미로 보는 콘텐츠예요. 특정 금융상품을 권유하지 않아요.
        </p>
      </LandingReveal>
    </main>
  );
}
