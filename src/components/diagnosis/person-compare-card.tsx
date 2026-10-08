"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, MessageCircle, Save, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BirthInput } from "@/lib/saju";
import { track } from "@/lib/analytics";
import { buildRelationshipShareUrl } from "@/lib/relationship-share";
import { SIJIN_OPTIONS, sijinFromHour, sijinOption, type SijinId } from "@/lib/korean-hour";
import { loadSavedPeople, upsertSavedPerson, type SavedPerson } from "@/lib/saved-people";
import {
  PERSON_COMPARE_PURPOSE_LABELS,
  PERSON_COMPARE_PURPOSES,
  type PersonComparePurpose,
  type PersonCompareResult,
} from "@/lib/person-compare";

function otherBirthFromForm(input: {
  birthDate: string;
  gender: "남" | "여";
  sijin: SijinId;
}): BirthInput | null {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  const option = sijinOption(input.sijin);
  return {
    year,
    month,
    day,
    hour: option.hour,
    minute: option.hour === null ? null : 0,
    gender: input.gender,
  };
}

function dateValue(input: BirthInput): string {
  return [
    String(input.year).padStart(4, "0"),
    String(input.month).padStart(2, "0"),
    String(input.day).padStart(2, "0"),
  ].join("-");
}

export function PersonCompareCard({ me }: { me: BirthInput }) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<PersonComparePurpose>("business_partner");
  const [otherName, setOtherName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"남" | "여">("남");
  const [sijin, setSijin] = useState<SijinId>("unknown");
  const [result, setResult] = useState<PersonCompareResult | null>(null);
  const [savedPeople, setSavedPeople] = useState<SavedPerson[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareDone, setShareDone] = useState<string | null>(null);
  const [savedDone, setSavedDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherBirth = useMemo(
    () => otherBirthFromForm({ birthDate, gender, sijin }),
    [birthDate, gender, sijin],
  );

  useEffect(() => {
    const refresh = () => setSavedPeople(loadSavedPeople().filter((person) => !person.isSelf));
    refresh();
    window.addEventListener("saju:saved-people-changed", refresh);
    return () => window.removeEventListener("saju:saved-people-changed", refresh);
  }, []);

  function applySavedPerson(person: SavedPerson) {
    setSelectedSavedId(person.id);
    setOtherName(person.name);
    setBirthDate(dateValue(person.birthInput));
    setGender(person.birthInput.gender);
    setSijin(sijinFromHour(person.birthInput.hour));
    setResult(null);
    setError(null);
    setSavedDone(false);
  }

  async function compare() {
    if (!otherBirth) {
      setError("상대방의 생년월일을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setShareDone(null);
    track("relationship_compare_started", { purpose });

    try {
      const response = await fetch("/api/person-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meName: "나",
          otherName: otherName.trim() || "상대",
          purpose,
          me,
          other: otherBirth,
        }),
      });
      const data = (await response.json()) as { result?: PersonCompareResult; error?: string };
      if (!response.ok || !data.result) {
        throw new Error(data.error || "두 사람의 사주를 비교하지 못했습니다.");
      }
      setResult(data.result);
      track("relationship_compare_completed", { purpose: data.result.purpose });
    } catch (err) {
      setError(err instanceof Error ? err.message : "두 사람의 사주를 비교하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function currentShare() {
    if (!result) return null;
    return buildRelationshipShareUrl(result, window.location.origin);
  }

  async function shareToKakao() {
    const shared = currentShare();
    if (!shared || !result) return;
    setSharing(true);
    setShareDone(null);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `운·돈 · 나와 이 사람 · ${result.purposeLabel}`,
          text: result.shareText,
          url: shared.url,
        });
        setShareDone("공유창에서 카카오톡으로 보낼 수 있어요");
        track("relationship_share_created", {
          shareId: shared.shareId,
          purpose: result.purpose,
          channel: "native_kakao_choice",
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${result.shareText}\n\n${shared.url}`);
        setShareDone("링크를 복사했어요. 카카오톡에 붙여넣어 보내주세요");
        track("relationship_share_created", {
          shareId: shared.shareId,
          purpose: result.purpose,
          channel: "clipboard_kakao_fallback",
        });
      }
    } catch {
      // 공유창을 닫은 경우는 오류로 보이지 않는다.
    } finally {
      setSharing(false);
    }
  }

  async function copyLink() {
    const shared = currentShare();
    if (!shared || !result || !navigator.clipboard) return;
    await navigator.clipboard.writeText(`${result.shareText}\n\n${shared.url}`);
    setShareDone("결과와 링크를 복사했어요");
    track("relationship_share_created", {
      shareId: shared.shareId,
      purpose: result.purpose,
      channel: "clipboard",
    });
  }

  function saveCurrentPerson() {
    if (!otherBirth) return;
    const saved = upsertSavedPerson({
      id: selectedSavedId ?? undefined,
      name: otherName.trim() || "상대",
      relation: PERSON_COMPARE_PURPOSE_LABELS[purpose],
      birthInput: otherBirth,
    });
    setSelectedSavedId(saved.id);
    setSavedDone(true);
  }

  function resetOther() {
    setSelectedSavedId(null);
    setOtherName("");
    setBirthDate("");
    setGender("남");
    setSijin("unknown");
    setResult(null);
    setError(null);
    setShareDone(null);
    setSavedDone(false);
  }

  if (!open) {
    return (
      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)">
          <UsersRound className="size-4" />
          <p className="section-eyebrow">나와 이 사람</p>
        </div>
        <h3 className="mt-2 text-lg leading-7 font-semibold">
          저장해둔 사람은 생년월일을 다시 입력하지 않아도 됩니다
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          연애·가족·직장·동업에서 잘 맞는 부분, 부딪히는 부분, 역할을 어떻게 나누면 좋은지 함께 봅니다.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="mt-4 h-12 w-full rounded-full text-base"
        >
          이 사람과 나 보기
        </Button>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-3xl border border-(--gold-soft) bg-card p-5">
      <div className="flex items-center gap-2 text-(--gold)">
        <UsersRound className="size-4" />
        <p className="section-eyebrow">나와 이 사람</p>
      </div>

      {!result ? (
        <>
          <h3 className="mt-2 text-xl leading-8 font-semibold">어떤 관계인지 먼저 골라주세요</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            같은 두 사람도 연애와 동업에서 봐야 할 지점이 다릅니다.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {PERSON_COMPARE_PURPOSES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={purpose === item}
                onClick={() => {
                  setPurpose(item);
                  setError(null);
                }}
                className={
                  "min-h-12 rounded-2xl border px-3 py-2 text-sm transition-colors " +
                  (purpose === item
                    ? "border-(--gold) bg-(--gold-soft) font-semibold text-foreground"
                    : "border-border bg-background text-foreground/80")
                }
              >
                {PERSON_COMPARE_PURPOSE_LABELS[item]}
              </button>
            ))}
          </div>

          {savedPeople.length > 0 && (
            <section className="mt-5 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">저장한 사람 불러오기</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {savedPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => applySavedPerson(person)}
                    className={
                      "rounded-full border px-3 py-2 text-sm " +
                      (selectedSavedId === person.id
                        ? "border-(--gold) bg-(--gold-soft)"
                        : "border-border bg-accent")
                    }
                  >
                    {person.name} · {person.relation}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mt-5 rounded-2xl bg-accent p-4">
            <p className="text-sm font-semibold">상대방 정보</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              내 정보는 다시 입력하지 않습니다. 저장한 사람은 위에서 한 번만 누르면 됩니다.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              알고 있고 사용할 수 있는 상대방 정보만 입력해 주세요.{" "}
              <Link href="/privacy" target="_blank" className="underline underline-offset-4">
                개인정보처리방침
              </Link>
            </p>

            <label className="mt-4 block">
              <span className="text-sm font-medium">이름 또는 호칭</span>
              <input
                value={otherName}
                maxLength={20}
                onChange={(event) => {
                  setOtherName(event.target.value);
                  setSelectedSavedId(null);
                  setSavedDone(false);
                }}
                placeholder="예: 민수, 배우자, 동업자"
                className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-(--gold)"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium">생년월일</span>
              <input
                type="date"
                value={birthDate}
                onChange={(event) => {
                  setBirthDate(event.target.value);
                  setSelectedSavedId(null);
                  setSavedDone(false);
                  setError(null);
                }}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-(--gold)"
              />
            </label>

            <div className="mt-4">
              <p className="text-sm font-medium">성별</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["남", "여"] as const).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={gender === item ? "default" : "outline"}
                    onClick={() => {
                      setGender(item);
                      setSelectedSavedId(null);
                    }}
                    className="h-11 rounded-xl"
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium">태어난 시 · 선택</span>
              <select
                value={sijin}
                onChange={(event) => {
                  setSijin(event.target.value as SijinId);
                  setSelectedSavedId(null);
                  setSavedDone(false);
                }}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-(--gold)"
              >
                {SIJIN_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id === "unknown" ? item.label : `${item.label} · ${item.range}`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                정확한 분을 몰라도 축시·묘시처럼 두 시간 단위의 시진만 알면 선택할 수 있습니다.
              </p>
            </label>
          </div>

          {error && <p className="mt-3 text-sm leading-6 text-destructive">{error}</p>}

          <Button
            size="lg"
            onClick={() => void compare()}
            disabled={loading}
            className="mt-5 h-14 w-full rounded-full text-base"
          >
            {loading ? "두 사람의 사주를 함께 보는 중..." : "두 사람 함께 보기"}
          </Button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 min-h-10 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            지금은 내 사주만 볼게요
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {result.meName} × {result.otherName} · {result.purposeLabel}
          </p>
          <h3 className="mt-2 text-xl leading-8 font-semibold">{result.headline}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.intro}</p>

          <div className="mt-5 space-y-3">
            {result.strengths.map((section) => (
              <div key={section.title} className="rounded-2xl bg-accent p-4">
                <p className="text-sm font-semibold text-(--gold)">{section.title}</p>
                <p className="mt-2 text-base leading-7 text-muted-foreground">{section.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="section-eyebrow">같이 있을 때 조심할 점</p>
            <div className="mt-3 space-y-3">
              {result.friction.map((section) => (
                <div key={section.title} className="rounded-2xl border border-border p-4">
                  <h4 className="font-semibold">{section.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="section-eyebrow">
              {purpose === "business_partner" || purpose === "work_colleague"
                ? "같이 일한다면"
                : "관계를 편하게 이어가려면"}
            </p>
            <div className="mt-3 space-y-3">
              {result.roles.map((section) => (
                <div key={section.title} className="rounded-2xl border border-(--gold-soft) p-4">
                  <h4 className="font-semibold">{section.title}</h4>
                  <p className="mt-2 text-base leading-7 text-muted-foreground">{section.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="section-eyebrow">지금의 두 사람</p>
            <div className="mt-3 space-y-3">
              {result.timing.map((section) => (
                <div key={section.title} className="rounded-2xl border border-border p-4">
                  <h4 className="font-semibold">{section.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.text}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">{result.note}</p>

          <div className="mt-5 grid gap-2">
            <Button
              type="button"
              onClick={() => void shareToKakao()}
              disabled={sharing}
              className="h-12 w-full rounded-full"
            >
              <MessageCircle className="size-4" />
              {sharing ? "공유창 여는 중..." : "카카오톡으로 보내기"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyLink()}
              className="h-12 w-full rounded-full"
            >
              <Copy className="size-4" />
              결과와 링크 복사
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={saveCurrentPerson}
              className="h-12 w-full rounded-full"
            >
              <Save className="size-4" />
              {savedDone ? "사람 정보 저장됨" : "이 사람 저장하기"}
            </Button>
          </div>
          {shareDone && <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">{shareDone}</p>}
          <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
            공유 링크에는 두 사람의 생년월일이나 손 사진을 넣지 않습니다.
          </p>

          <Button
            type="button"
            variant="ghost"
            onClick={resetOther}
            className="mt-3 h-11 w-full rounded-full"
          >
            다른 사람과 비교해보기
          </Button>
        </>
      )}
    </section>
  );
}
