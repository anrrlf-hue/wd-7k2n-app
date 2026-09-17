import Image from "next/image";
export function HeroVisual() {
  return <div aria-hidden="true" className="hero-art pointer-events-none relative mx-auto w-full max-w-sm select-none">
    <Image src="/images/wealth-orbit-hero.png" alt="" width={1536} height={1024} sizes="(max-width: 440px) 100vw, 384px" priority className="h-full w-full object-contain" />
  </div>;
}
