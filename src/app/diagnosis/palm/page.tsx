import { PalmPageClient } from "@/components/palm/palm-page-client";
import type { BirthInput } from "@/lib/saju";

function parseBirthInput(sp: Record<string, string | string[] | undefined>): BirthInput | null {
  const get = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hourRaw = get("hour");
  const minuteRaw = get("minute");
  const gender = get("gender");

  if (!year || !month || !day || (gender !== "남" && gender !== "여")) return null;

  return {
    year,
    month,
    day,
    hour: hourRaw ? Number(hourRaw) : null,
    minute: minuteRaw ? Number(minuteRaw) : null,
    gender,
  };
}

export default async function PalmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const birthInput = parseBirthInput(sp);

  return <PalmPageClient birthInput={birthInput} />;
}
