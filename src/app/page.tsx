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

        <div className={styles.benefitThirdCardCover} aria-hidden="true">
          <strong>
            당신의 궁금증에
            <br />
            답과 시기를 짚어드립니다
          </strong>
          <span>
            질문에 맞춰 답을 먼저 드리고
            <br />
            눈여겨볼 시기를 함께 봅니다.
          </span>
        </div>
        <Link
          href="/management"
          aria-label="기존 이용자 내 관리"
          className={`${styles.hotspot} ${styles.returning}`}
        />
      </div>
    </main>
  );
}
