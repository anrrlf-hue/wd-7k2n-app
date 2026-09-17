import Image from "next/image";
export function HeroVisual() {
  return (
    <div aria-hidden="true" className="hero-scene pointer-events-none relative w-full select-none">
      <Image
        src="/images/wealth-study-hero.webp"
        alt=""
        width={960}
        height={1200}
        sizes="(max-width: 480px) 100vw, 480px"
        preload
        className="h-full w-full object-cover"
      />
    </div>
  );
}
