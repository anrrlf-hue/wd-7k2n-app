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
  const isDebugParam = Object.keys(params).length === 1 && params.palmDebug === "1";
  const nonDebugParams = Object.keys(params).filter((key) => key !== "palmDebug");
  if (nonDebugParams.length > 0 || (Object.hasOwn(params, "palmDebug") && !isDebugParam)) redirect("/diagnosis/palm/old-link");
  return <PalmEntryGate />;
}
