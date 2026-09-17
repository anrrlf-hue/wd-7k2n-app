"use client";

import { AngelCompanion } from "@/components/angel-companion";
import type { ReactNode } from "react";

export function StepBadge({ icon }: { icon: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between">
      <span className="flex size-10 items-center justify-center rounded-full bg-(--gold-soft) text-(--gold)">{icon}</span>
      <AngelCompanion state="input-guide" />
    </div>
  );
}
