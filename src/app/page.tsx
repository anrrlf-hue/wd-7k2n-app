import Link from "next/link";
import { Clock3, Hand, MoonStar } from "lucide-react";
import styles from "./page.module.css";

const BENEFITS = [
  {
    icon: MoonStar,
    title: "사주를 쉽게 풀어드립니다",
    description: "복잡한 용어 대신 지금의 삶에 맞는 말로 쉽고 분명하게 풀어드립니다.",
  },
  {
    icon: Clock3,
    title: "답과 시기를 함께 봅니다",
    description: "궁금한 질문에 먼저 답하고, 눈여겨볼 흐름과 시기를 함께 짚습니다.",
  },
  {
    icon: Hand,
    title: "손금을 함께 보면",
    description: "사주는 흐름과 시기를, 손금은 지금 드러난 모습을 보완해 함께 봅니다.",
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
          <span>타고난 흐름을 읽고,</span>
          <strong>궁금한 질문에 답과 시기를</strong>
          <span>함께 짚어드립니다.</span>
        </div>

        <Link
          href="/diagnosis?mode=question"
          aria-label="내 궁금증 답과 시기 보기"
          className={styles.diagnosisCta}
        >
          내 궁금증 답과 시기 보기 <span aria-hidden="true">→</span>
        </Link>

        <Link
          href="/diagnosis?mode=free"
          aria-label="전체 사주 무료로 보기"
          className={styles.freeSajuLink}
        >
          전체 사주 무료로 보기
        </Link>

        <section className={styles.benefitPanel} aria-label="운돈이 특별한 이유">
          <div className={styles.benefitHeading}>
            <h2>운·돈이 특별한 이유</h2>
            <div className={styles.moonDivider} aria-hidden="true">☾</div>
            <p>복잡한 사주를, 지금 궁금한 질문에 맞춰 쉽게</p>
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
