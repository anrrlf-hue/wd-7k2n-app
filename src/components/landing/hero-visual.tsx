import Image from "next/image";

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="hero-scene pointer-events-none select-none">
      <Image
        src="/images/undon-hero-reference.png"
        alt=""
        width={340}
        height={690}
        sizes="(max-width: 480px) 72vw, 340px"
        preload
        className="hero-background"
      />
    </div>
  );
}
