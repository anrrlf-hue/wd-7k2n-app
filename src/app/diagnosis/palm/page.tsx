import { redirect } from "next/navigation";
import { PalmEntryGate } from "@/components/palm/palm-entry-gate";

export default async function PalmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Legacy bookmarked links can contain someone else's personal fields. Never
  // let their stripped URL read a different person's same-tab entry state.
  const params = await searchParams;
  const validDevParams = Object.entries(params).every(([key, value]) =>
    (key === "palmDebug" && value === "1") || (key === "palmInput" && value === "padding"),
  );
  if (Object.keys(params).length > 0 && !validDevParams) redirect("/diagnosis/palm/old-link");
  return <PalmEntryGate />;
}
