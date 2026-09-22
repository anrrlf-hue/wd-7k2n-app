import Image from "next/image";
import { BrandCompanion } from "@/components/brand-companion";

export function HeroVisual() {
  return (
    <div aria-hidden="true" className="hero-scene pointer-events-none relative w-full select-none">
      <div className="hero-moon" />
      <div className="hero-world">
        <Image
          src="/images/wealth-study-background.webp"
          alt=""
          width={960}
          height={1200}
          sizes="(max-width: 480px) 100vw, 480px"
          preload
          className="hero-background"
        />
        <div className="hero-vignette" />
        <div className="hero-companion">
          <BrandCompanion state="welcome" presence="scene" />
        </div>
      </div>
    </div>
  );
}
