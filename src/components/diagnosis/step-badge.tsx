"use client";

import { BrandCompanion } from "@/components/brand-companion";
import type { ReactNode } from "react";

export function StepBadge({ icon }: { icon: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <span className="flex size-10 items-center justify-center rounded-full bg-(--gold-soft) text-(--gold)">{icon}</span>
      <BrandCompanion state="input-guide" presence="regular" />
    </div>
  );
}
