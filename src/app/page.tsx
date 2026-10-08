import Link from "next/link";
import { Hand, MoonStar, UsersRound } from "lucide-react";
import { LaunchAnalytics } from "@/components/launch-analytics";
import styles from "./page.module.css";

const BENEFITS = [
  {
    icon: MoonStar,
    title: "타고난 나를 먼저 봅니다",
    description: "성향·연애·일·재물·생활과 큰 흐름을 사주로 넓게 살펴봅니다.",
  },
  {
    icon: Hand,
    title: "양손으로 지금의 변화를 봅니다",
    description: "주로 쓰는 손을 기준으로 타고난 경향과 지금의 모습을 비교합니다.",
  },
  {
    icon: UsersRound,
    title: "나와 이 사람까지 이어봅니다",
    description: "궁금한 분야를 깊게 보고 연애·가족·직장·동업 관계까지 함께 봅니다.",
  },
]

export default function Home() {
  return (
    <main className={styles.home}>
      <LaunchAnalytics />
      <div className={styles.screen}>
        <img
          src="/images/generated-home-master.png"
          alt="운·돈"
          className={styles.master}
        />

        <Link
          href="/management"
          aria-label="내 관리"
          className={`${styles.hotspot} ${styles.management}`}
        />

        <div className={styles.heroPromise}>
          <span>사주로 타고난 나를 보고,</span>
          <strong>양손으로 지금의 나를 보고,</strong>
          <span>나와 이 사람까지 이어봅니다.</span>
        </div>

        <Link
          href="/diagnosis?mode=free&focus=overall&start=free"
          aria-label="내 사주 무료로 보기"
          className={styles.primarySajuCta}
        >
          내 사주 무료로 보기 <span aria-hidden="true">→</span>
        </Link>

        <section className={styles.benefitPanel} aria-label="운돈이 특별한 이유">
          <div className={styles.benefitHeading}>
            <h2>운·돈이 특별한 이유</h2>
            <div className={styles.moonDivider} aria-hidden="true">☾</div>
            <p>타고난 흐름부터 지금의 변화와 사람 관계까지</p>
          </div>

          <div className={styles.benefitGrid}>
            {BENEFITS.map(({ icon: Icon, title, description }) => (
              <article key={title} className={styles.benefitCard}>
                <div className={styles.benefitIcon} aria-hidden="true">
                  <Icon strokeWidth={1.8} />
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <Link
          href="/management"
          aria-label="기존 이용자 내 관리"
          className={`${styles.hotspot} ${styles.returning}`}
        />
      </div>
    </main>
  );
}
