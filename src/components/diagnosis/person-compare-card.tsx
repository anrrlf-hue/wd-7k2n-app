"use client";

import { useMemo, useState } from "react";
import { Copy, Share2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BirthInput } from "@/lib/saju";
import {
  PERSON_COMPARE_PURPOSE_LABELS,
  PERSON_COMPARE_PURPOSES,
  type PersonComparePurpose,
  type PersonCompareResult,
} from "@/lib/person-compare";

function otherBirthFromForm(input: {
  birthDate: string;
  gender: "남" | "여";
  knowsTime: boolean;
  birthTime: string;
}): BirthInput | null {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;

  const [hour, minute] =
    input.knowsTime && input.birthTime
      ? input.birthTime.split(":").map(Number)
      : [null, null];

  return {
    year,
    month,
    day,
    hour,
    minute,
    gender: input.gender,
  };
}

export function PersonCompareCard({ me }: { me: BirthInput }) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<PersonComparePurpose>("business_partner");
  const [otherName, setOtherName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"남" | "여">("남");
  const [knowsTime, setKnowsTime] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [result, setResult] = useState<PersonCompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareDone, setShareDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherBirth = useMemo(
    () => otherBirthFromForm({ birthDate, gender, knowsTime, birthTime }),
    [birthDate, gender, knowsTime, birthTime],
  );

  async function compare() {
    if (!otherBirth) {
      setError("상대방의 생년월일을 입력해주세요.");
      return;
    }
    if (knowsTime && !birthTime) {
      setError("출생시간을 안다면 시간을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setShareDone(false);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "두 사람의 사주를 비교하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function shareResult() {
    if (!result) return;
    setSharing(true);
    setShareDone(false);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `운·돈 · 나와 이 사람 · ${result.purposeLabel}`,
          text: result.shareText,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(result.shareText);
        setShareDone(true);
      }
    } catch {
      // 사용자가 공유창을 닫은 경우도 오류 화면으로 바꾸지 않는다.
    } finally {
      setSharing(false);
    }
  }

  function resetOther() {
    setOtherName("");
    setBirthDate("");
    setGender("남");
    setKnowsTime(false);
    setBirthTime("");
    setResult(null);
    setError(null);
    setShareDone(false);
  }

  if (!open) {
    return (
      <section className="mt-4 rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-(--gold)">
          <UsersRound className="size-4" />
          <p className="section-eyebrow">나와 이 사람</p>
        </div>
        <h3 className="mt-2 text-lg leading-7 font-semibold">
          내 사주를 사람 관계로 이어서 볼 수 있어요
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          연애·가족·직장·동업에서 누가 더 좋은 사람인지 점수를 매기지 않고,
          서로 잘 맞는 부분과 부딪히는 부분, 같이할 때 역할을 어떻게 나누면 좋은지 봅니다.
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
            같은 두 사람도 연애와 동업에서 봐야 할 지점이 다릅니다. 관계 목적에 맞춰 풀이 내용을 바꿉니다.
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

          <div className="mt-5 rounded-2xl bg-accent p-4">
            <p className="text-sm font-semibold">상대방 정보</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              내 생년월일은 다시 입력하지 않습니다. 상대방 정보만 추가하면 됩니다.
            </p>

            <label className="mt-4 block">
              <span className="text-sm font-medium">이름 또는 호칭 · 선택</span>
              <input
                value={otherName}
                maxLength={20}
                onChange={(event) => setOtherName(event.target.value)}
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
                    onClick={() => setGender(item)}
                    className="h-11 rounded-xl"
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <input
                type="checkbox"
                checked={knowsTime}
                onChange={(event) => {
                  setKnowsTime(event.target.checked);
                  if (!event.target.checked) setBirthTime("");
                  setError(null);
                }}
                className="size-4"
              />
              <span>
                <span className="block text-sm font-medium">출생시간을 알고 있어요</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  모르면 기본 관계는 볼 수 있고, 현재 시기 비교만 덜 정밀해집니다.
                </span>
              </span>
            </label>

            {knowsTime && (
              <label className="mt-3 block">
                <span className="text-sm font-medium">출생시간</span>
                <input
                  type="time"
                  value={birthTime}
                  onChange={(event) => {
                    setBirthTime(event.target.value);
                    setError(null);
                  }}
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-(--gold)"
                />
              </label>
            )}
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

          <section className="mt-5 rounded-2xl bg-accent p-4">
            <p className="section-eyebrow">이어서 궁금해질 수 있는 것</p>
            <div className="mt-3 space-y-2">
              {result.nextQuestions.map((question) => (
                <p key={question} className="text-sm leading-6 text-foreground/85">
                  · {question}
                </p>
              ))}
            </div>
          </section>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">{result.note}</p>

          <Button
            type="button"
            variant="outline"
            onClick={() => void shareResult()}
            disabled={sharing}
            className="mt-5 h-12 w-full rounded-full"
          >
            {navigator.share ? <Share2 className="size-4" /> : <Copy className="size-4" />}
            {sharing ? "공유 준비 중..." : shareDone ? "결과를 복사했습니다" : "이 결과 함께 보기"}
          </Button>
          <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">
            공유 문구에는 두 사람의 생년월일을 넣지 않습니다.
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
