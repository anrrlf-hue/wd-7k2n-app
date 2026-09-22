import Link from "next/link";
import { ArrowRight, BarChart3, Hand, MoonStar, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { HeroVisual } from "@/components/landing/hero-visual";

const STEPS = [
  { icon: MoonStar, title: "사주", text: "타고난 기질과 돈의 흐름을 이해해요." },
  { icon: Hand, title: "손금", text: "지금의 성향과 변화 가능성을 함께 읽어요." },
  { icon: BarChart3, title: "재무 방향", text: "현실 숫자로 내 돈의 방향을 점검해요." },
];

export default function Home() {
  return <main className="landing-screen">
    <LandingReveal>
      <div className="landing-shell">
        <header className="landing-topbar">
          <Link href="/" className="landing-logo" aria-label="운돈 홈">
            <Sparkles className="size-5" />
            <span>운·돈</span>
          </Link>
          <Button asChild size="sm" className="landing-management rounded-full">
            <Link href="/login?next=/management">
              <UserRound className="size-4" />
              내 관리
            </Link>
          </Button>
        </header>
        <section className="landing-hero-copy">
          <p className="landing-kicker">타고난 흐름, 더 나은 오늘로</p>
          <h1 className="landing-headline">
            타고난 흐름을
            <br />
            <span>현실로 연결합니다</span>
          </h1>
          <p className="landing-subcopy">
            사주와 손금에서 시작해,
            <br />
            지금의 나에게 맞는 현실적인 돈의 방향까지 연결합니다.
          </p>

          <HeroVisual />

          <Button asChild size="lg" className="primary-cta landing-main-cta h-14 w-full rounded-full text-base">
            <Link href="/diagnosis">
              내 재물운 무료 보기
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <p className="landing-note">무료 · 약 1분 · 출생시간을 몰라도 시작할 수 있어요</p>
        </section>

        <section className="landing-how" aria-label="진행 방식">
          <p className="landing-kicker">이렇게 진행돼요</p>
          <h2>나를 이해하고, 현실의 방향을 찾는 3단계</h2>
          <div className="landing-steps">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="landing-step-card">
                <span className="landing-step-icon"><Icon className="size-5" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <span>운·돈</span>
          <p>타고난 흐름이, 더 나은 오늘로</p>
        </footer>
      </div>
    </LandingReveal>
  </main>;
}
