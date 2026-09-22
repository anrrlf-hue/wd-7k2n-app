import Image from "next/image";
import { BrandCompanion, type CompanionState } from "@/components/brand-companion";

/** Decorative transition only. Reading, choices and forms stay in HTML. */
export function JourneyScene({ scene, compact = false, companion }: { scene: "palm" | "choice" | "reality"; compact?: boolean; companion?: CompanionState }) {
  return <div className={`journey-scene ${compact ? "journey-scene-compact" : ""}`} data-scene={scene} aria-hidden="true">
    <Image src={`/images/journey-${scene}.webp`} alt="" width={960} height={640} sizes="(max-width: 480px) 100vw, 440px" className="h-full w-full object-cover" />
    {companion && <div className="scene-companion"><BrandCompanion state={companion} presence="scene" /></div>}
  </div>;
}
