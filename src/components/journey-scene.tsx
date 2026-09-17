import Image from "next/image";

/** Decorative transition only. Reading, choices and forms stay in HTML. */
export function JourneyScene({ scene, compact = false }: { scene: "palm" | "choice" | "reality"; compact?: boolean }) {
  return <div className={`journey-scene ${compact ? "journey-scene-compact" : ""}`} aria-hidden="true">
    <Image src={`/images/journey-${scene}.webp`} alt="" width={960} height={640} sizes="(max-width: 480px) 100vw, 440px" className="h-full w-full object-cover" />
  </div>;
}
