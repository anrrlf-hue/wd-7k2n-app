import { PalmPageClient } from "@/components/palm/palm-page-client";
import type { BirthInput, PersonalityInputEcho } from "@/lib/saju";
import { MBTI_TYPES, type MbtiType } from "@/lib/mbti-facts";

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

/** 무료 사주 단계에서 넘어온 성향정보를 압축 형식(id:value,id:value)에서 복원.
 * 형식이 이상하면 그냥 무시한다(손금 핵심 흐름을 막으면 안 됨). */
function parsePersonalityInput(sp: Record<string, string | string[] | undefined>): PersonalityInputEcho {
  const get = (key: string) => {
    const v = sp[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const pcRaw = get("pc");
  const personalityAnswers: Record<string, number> | null = pcRaw
    ? Object.fromEntries(
        pcRaw
          .split(",")
          .map((pair) => pair.split(":"))
          .filter((pair): pair is [string, string] => pair.length === 2 && !Number.isNaN(Number(pair[1])))
          .map(([id, v]) => [id, Number(v)]),
      )
    : null;

  const mbtiRaw = get("mbti");
  const mbti: MbtiType | null = mbtiRaw && (MBTI_TYPES as readonly string[]).includes(mbtiRaw) ? (mbtiRaw as MbtiType) : null;

  return {
    personalityAnswers: personalityAnswers && Object.keys(personalityAnswers).length > 0 ? personalityAnswers : null,
    mbti,
  };
}

export default async function PalmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const birthInput = parseBirthInput(sp);
  const personalityInput = parsePersonalityInput(sp);

  return <PalmPageClient birthInput={birthInput} personalityInput={personalityInput} />;
}
