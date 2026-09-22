import Image from "next/image";

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="hero-scene pointer-events-none select-none">
      <Image
        src="/images/undon-hero-woman-cat.jpg"
        alt=""
        width={390}
        height={405}
        sizes="(max-width: 480px) 82vw, 390px"
        priority
        className="hero-background"
      />
    </div>
  );
}
