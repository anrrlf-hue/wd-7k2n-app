import Link from "next/link";
import styles from "./page.module.css";

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

        <div className={styles.benefitThirdCopy}>
          당신의 궁금증에
          <br />
          답과 시기를 짚어드립니다
        </div>

        <section className={styles.questionPromise}>
          <p className={styles.questionPromiseEyebrow}>궁금한 건 직접 물어보세요</p>
          <strong>답과 시기를 함께 봅니다</strong>
          <p>연애·인간관계 · 일·직업·사업 · 돈·재물 · 생활·건강</p>
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
