import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { HeroVisual } from "@/components/landing/hero-visual";
export default function Home() {
  return <main className="landing-screen flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
    <LandingReveal>
      <p className="section-eyebrow">재물사주</p>
      <HeroVisual />
      <h1 className="mx-auto max-w-sm text-balance text-[2rem] leading-tight font-semibold tracking-tight">내 돈의 흐름에는<br />어떤 내가 있을까?</h1>
      <p className="mx-auto mt-4 max-w-xs text-balance text-base leading-relaxed text-muted-foreground">타고난 운세로 끝내지 않고,<br />현실로 연결합니다.</p>
      <div className="mx-auto mt-7 w-full max-w-sm">
        <Button asChild size="lg" className="primary-cta h-14 w-full rounded-full text-base">
          <Link href="/diagnosis">내 재물사주 무료로 보기 <ArrowRight className="size-4" /></Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">약 1분 · 출생시간 몰라도 가능</p>
      </div>
      <p className="mt-7 text-[11px] text-muted-foreground">사주와 손금은 재미와 자기이해를 위한 콘텐츠예요.</p>
    </LandingReveal>
  </main>;
}
