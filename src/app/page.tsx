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
          href="/diagnosis"
          aria-label="내 사주 무료 보기"
          className={styles.diagnosisCta}
        >
          내 사주 무료 보기 <span aria-hidden="true">→</span>
        </Link>

        <div className={styles.benefitThirdCopy}>
          궁금한 내용을 사주로 풀고,
          <br />
          현실에서 어떻게 움직일지 알려줍니다.
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
