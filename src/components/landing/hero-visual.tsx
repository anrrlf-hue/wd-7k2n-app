import Image from "next/image";

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="hero-scene pointer-events-none relative w-full select-none">
      <div className="hero-moon" />
      <div className="hero-world">
        <Image
          src="/images/undon-hero-woman-cat.jpg"
          alt=""
          width={390}
          height={405}
          sizes="(max-width: 480px) 100vw, 480px"
          preload
          className="hero-background"
        />
        <div className="hero-vignette" />
      </div>
    </div>
  );
}
