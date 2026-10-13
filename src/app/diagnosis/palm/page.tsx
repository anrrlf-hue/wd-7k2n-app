import { redirect } from "next/navigation";
import { PalmEntryGate } from "@/components/palm/palm-entry-gate";

export default async function PalmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Legacy bookmarked links can contain someone else's personal fields. Never
  // let their stripped URL read a different person's same-tab entry state.
  if (Object.keys(await searchParams).length > 0) redirect("/diagnosis/palm/old-link");
  return <PalmEntryGate />;
}
