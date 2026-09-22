import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="reference-home">
      <div className="reference-screen">
        <Image
          src="/images/first-screen-final.png"
          alt=""
          width={805}
          height={1510}
          priority
          className="reference-screen-image"
          sizes="(max-width: 480px) 100vw, 480px"
        />
        <Link
          href="/login?next=/management"
          aria-label="내 관리"
          className="reference-hotspot reference-hotspot-management"
        />
        <Link
          href="/diagnosis"
          aria-label="내 재물운 무료 보기"
          className="reference-hotspot reference-hotspot-cta"
        />
        <Link
          href="/login?next=/management"
          aria-label="기존 이용자 로그인"
          className="reference-hotspot reference-hotspot-returning"
        />
      </div>
    </main>
  );
}
