import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { HeroVisual } from "@/components/landing/hero-visual";
export default function Home() {
  return <main className="landing-screen flex flex-1 flex-col items-center justify-center text-center">
    <LandingReveal>
      <p className="landing-brand text-sm font-semibold tracking-widest">재물사주</p>
      <HeroVisual />
      <div className="landing-content px-6">
      <h1 className="landing-headline font-semibold tracking-tight">타고난 운세로 끝내지 않고,<br /><span>현실로 연결합니다.</span></h1>
      <div className="mx-auto mt-7 w-full max-w-sm">
        <Button asChild size="lg" className="primary-cta h-14 w-full rounded-full text-base">
          <Link href="/diagnosis">내 재물사주 무료로 보기 <ArrowRight className="size-4" /></Link>
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">약 1분 · 출생시간 몰라도 가능</p>
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground">사주·손금에서 시작해, 나의 돈 관리까지</p>
      </div>
    </LandingReveal>
  </main>;
}
