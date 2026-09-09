import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { HeroVisual } from "@/components/landing/hero-visual";
import { DestinyCardPreview } from "@/components/landing/destiny-card-preview";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-14 text-center">
      <LandingReveal>
        <HeroVisual />

        <p className="mb-4 text-sm font-medium tracking-wide text-(--gold)">
          1분이면 끝나는 무료 사주 진단
        </p>
        <h1 className="mx-auto max-w-xs text-balance text-4xl leading-snug font-semibold tracking-tight">
          나는 돈을
          <br />
          끌어당기는 사람일까,
          <br />
          놓치는 사람일까?
        </h1>
        <p className="mx-auto mt-5 max-w-xs text-balance text-base leading-relaxed text-muted-foreground">
          내 사주엔 큰돈이 들어오는 때가 있을까?
          <br />
          생년월일 하나로 지금 확인해보세요.
        </p>

        <DestinyCardPreview />

        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="h-13 w-full max-w-xs rounded-full text-base shadow-[0_0_24px_var(--gold-soft)]"
          >
            <Link href="/diagnosis">내 재물운 무료로 확인하기</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>1분 무료 진단</span>
          <span aria-hidden="true">·</span>
          <span>결과 이미지 저장 가능</span>
          <span aria-hidden="true">·</span>
          <span>출생시간 몰라도 진행 가능</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          재미로 보는 콘텐츠예요. 특정 금융상품을 권유하지 않아요.
        </p>
      </LandingReveal>
    </main>
  );
}
