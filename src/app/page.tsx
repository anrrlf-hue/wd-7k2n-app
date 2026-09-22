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
          aria-label="내 재물운 무료 보기"
          className={`${styles.hotspot} ${styles.diagnosis}`}
        />
        <Link
          href="/management"
          aria-label="기존 이용자 내 관리"
          className={`${styles.hotspot} ${styles.returning}`}
        />
      </div>
    </main>
  );
}
