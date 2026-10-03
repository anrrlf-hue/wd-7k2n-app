import Link from "next/link";
import { Clock3, Hand, MoonStar } from "lucide-react";
import styles from "./page.module.css";

const BENEFITS = [
  {
    icon: MoonStar,
    title: "무료 사주를 넓게 봅니다",
    description: "성향·연애·일·재물·생활과 큰 흐름을 한 번에 먼저 살펴봅니다.",
  },
  {
    icon: Hand,
    title: "손금까지 보면 더 입체적입니다",
    description: "사주로 전체 흐름을 본 뒤, 양손에서 지금 드러난 모습까지 함께 살펴봅니다.",
  },
  {
    icon: Clock3,
    title: "그다음 궁금한 분야를 깊게 봅니다",
    description: "연애·관계, 일·직업·사업, 돈·재물, 생활·건강 중 하나를 골라 자세히 보고 필요한 질문만 이어갑니다.",
  },
];

export default function Home() {
  return (
    <main className={styles.home}>
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
          <span>내 사주를 먼저 넓게 보고,</span>
          <strong>손금과 궁금한 분야까지</strong>
          <span>한 흐름으로 이어봅니다.</span>
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
            <p>전체를 먼저 보고, 필요한 부분만 더 깊고 쉽게</p>
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
