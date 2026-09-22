import Image from "next/image";

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="hero-scene pointer-events-none select-none">
      <Image
        src="/images/undon-woman-cat-scene.png"
        alt=""
        width={600}
        height={760}
        sizes="(max-width: 480px) 72vw, 360px"
        priority
        className="hero-background"
      />
    </div>
  );
}
