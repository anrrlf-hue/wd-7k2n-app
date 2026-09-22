import Link from "next/link";
import { ArrowRight, Hand, MoonStar, Sparkles, TrendingUp, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { HeroVisual } from "@/components/landing/hero-visual";

const REASONS = [
  {
    icon: MoonStar,
    title: "사주를 현실 언어로 풀어줍니다",
    text: "복잡한 사주를 지금의 삶에 맞는 언어로 쉽고 명확하게 해석합니다.",
  },
  {
    icon: Hand,
    title: "손금과 함께 입체적으로 봅니다",
    text: "사주와 손금을 함께 보아 더 깊고 구체적인 해석을 제공합니다.",
  },
  {
    icon: TrendingUp,
    title: "운의 흐름을 오늘의 선택으로 연결합니다",
    text: "타고난 운의 흐름을 지금 할 수 있는 선택과 돈의 방향으로 이어줍니다.",
  },
];

export default function Home() {
  return (
    <main className="landing-screen">
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
            <p className="landing-kicker">운이 흐르면, 오늘이 달라집니다.</p>
            <h1 className="landing-headline">
              사주풀이의 운이
              <br />
              <span>현실로 이어진다</span>
            </h1>
            <p className="landing-subcopy">
              타고난 흐름을 읽고,
              <br />
              지금의 선택과 돈의 방향까지 연결합니다.
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

          <section className="landing-how" aria-label="운돈이 특별한 이유">
            <h2>운·돈이 특별한 이유</h2>
            <p className="landing-how-subcopy">타고난 흐름이, 더 나은 오늘로 이어지도록</p>
            <div className="landing-steps">
              {REASONS.map(({ icon: Icon, title, text }) => (
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
    </main>
  );
}
