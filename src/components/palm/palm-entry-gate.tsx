"use client";

import { useEffect, useState } from "react";
import { PalmPageClient } from "@/components/palm/palm-page-client";
import { readPalmEntry, type PalmEntryState } from "@/lib/palm-entry-state";

export function PalmEntryGate() {
  const [entry, setEntry] = useState<PalmEntryState | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setEntry(readPalmEntry()); });
    return () => { cancelled = true; };
  }, []);

  if (entry === undefined) return <p role="status" className="p-6 text-center">입력 정보를 확인하고 있어요.</p>;
  return <PalmPageClient
    key={JSON.stringify([entry?.birthInput, entry?.personalityInput, entry?.focus])}
    birthInput={entry?.birthInput ?? null}
    personalityInput={entry?.personalityInput}
    focus={entry?.focus}
    initialQuestion={entry?.initialQuestion}
  />;
}
