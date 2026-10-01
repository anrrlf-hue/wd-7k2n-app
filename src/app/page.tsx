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
    icon: Clock3,
    title: "궁금한 건 시기까지 묻습니다",
    description: "무료 사주를 본 뒤 같은 정보로 질문에 대한 답과 시기를 이어봅니다.",
  },
  {
    icon: Hand,
    title: "원하면 손금까지 더합니다",
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
          <span>내 사주를 먼저 보고,</span>
          <strong>궁금한 것은 답과 시기까지</strong>
          <span>한 흐름으로 이어봅니다.</span>
        </div>

        <Link
          href="/diagnosis?mode=free&focus=overall&start=free"
          aria-label="내 사주 무료로 보기"
          className={styles.primarySajuCta}
        >
          내 사주 무료로 보기 <span aria-hidden="true">→</span>
        </Link>

        <Link
          href="/diagnosis?mode=question"
          aria-label="궁금한 것 바로 물어보기"
          className={styles.questionLink}
        >
          궁금한 것 바로 물어보기
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
