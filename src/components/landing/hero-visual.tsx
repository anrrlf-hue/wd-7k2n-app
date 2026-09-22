import Image from "next/image";

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="hero-scene pointer-events-none select-none">
      <Image
        src="/images/master-hero.webp"
        alt=""
        width={300}
        height={594}
        sizes="(max-width: 480px) 48vw, 230px"
        priority
        className="hero-background"
      />
    </div>
  );
}
