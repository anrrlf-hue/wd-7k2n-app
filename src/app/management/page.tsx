"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BirthInput } from "@/lib/saju";
import { SIJIN_OPTIONS, sijinFromHour, sijinLabelFromHour, sijinOption, type SijinId } from "@/lib/korean-hour";
import { loadSavedPeople, removeSavedPerson, upsertSavedPerson, type SavedPerson } from "@/lib/saved-people";

function dateValue(input: BirthInput): string {
  return [
    String(input.year).padStart(4, "0"),
    String(input.month).padStart(2, "0"),
    String(input.day).padStart(2, "0"),
  ].join("-");
}

function birthText(person: SavedPerson): string {
  const birth = person.birthInput;
  return `${birth.year}년 ${birth.month}월 ${birth.day}일 · ${birth.gender} · ${sijinLabelFromHour(birth.hour)}`;
}

export default function ManagementPage() {
  const [people, setPeople] = useState<SavedPerson[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("지인");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"남" | "여">("남");
  const [sijin, setSijin] = useState<SijinId>("unknown");
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setPeople(loadSavedPeople());
  }

  useEffect(() => {
    refresh();
    setLoaded(true);
    const onChange = () => refresh();
    window.addEventListener("saju:saved-people-changed", onChange);
    return () => window.removeEventListener("saju:saved-people-changed", onChange);
  }, []);

  const self = useMemo(() => people.find((person) => person.isSelf) ?? null, [people]);
  const others = useMemo(() => people.filter((person) => !person.isSelf), [people]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setRelation("지인");
    setBirthDate("");
    setGender("남");
    setSijin("unknown");
    setMessage(null);
  }

  function openNew() {
    resetForm();
    setFormOpen(true);
  }

  function edit(person: SavedPerson) {
    setEditingId(person.id);
    setName(person.name);
    setRelation(person.relation);
    setBirthDate(dateValue(person.birthInput));
    setGender(person.birthInput.gender);
    setSijin(sijinFromHour(person.birthInput.hour));
    setMessage(null);
    setFormOpen(true);
  }

  function save() {
    const [year, month, day] = birthDate.split("-").map(Number);
    if (!year || !month || !day) {
      setMessage("생년월일을 입력해주세요.");
      return;
    }
    const option = sijinOption(sijin);
    upsertSavedPerson({
      id: editingId ?? undefined,
      name: name.trim() || "저장한 사람",
      relation: relation.trim() || "지인",
      birthInput: {
        year,
        month,
        day,
        hour: option.hour,
        minute: option.hour === null ? null : 0,
        gender,
      },
      isSelf: false,
    });
    setFormOpen(false);
    resetForm();
  }

  function remove(id: string) {
    removeSavedPerson(id);
    if (editingId === id) {
      setFormOpen(false);
      resetForm();
    }
  }

  if (!loaded) {
    return <main className="journey-surface min-h-screen"><div className="journey-shell py-12" /></main>;
  }

  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-8">
        <Link href="/" className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          처음으로
        </Link>

        <p className="mt-3 section-eyebrow">내 관리</p>
        <h1 className="mt-2 text-2xl font-semibold">나와 가까운 사람을 한 번만 저장해두세요</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          다음에 사주·궁합·관계를 볼 때 생년월일과 태어난 시를 다시 입력하지 않아도 됩니다.
        </p>

        <section className="mt-6 rounded-3xl border border-(--gold-soft) bg-card p-5">
          <div className="flex items-center gap-2 text-(--gold)">
            <UserRound className="size-4" />
            <p className="section-eyebrow">내 정보</p>
          </div>
          {self ? (
            <>
              <h2 className="mt-2 text-lg font-semibold">{self.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{birthText(self)}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                무료 사주를 처음 볼 때 저장된 정보입니다. 다시 사주를 볼 때 이 정보를 재사용합니다.
              </p>
              <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-full">
                <Link href="/diagnosis?mode=free&focus=overall&start=free">내 사주 다시 보기</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                아직 내 출생정보가 저장되지 않았습니다. 무료 사주를 한 번 보면 자동으로 저장됩니다.
              </p>
              <Button asChild className="mt-4 h-11 w-full rounded-full">
                <Link href="/diagnosis?mode=free&focus=overall&start=free">내 정보 등록하기</Link>
              </Button>
            </>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-(--gold)">
                <UsersRound className="size-4" />
                <p className="section-eyebrow">저장한 사람</p>
              </div>
              <h2 className="mt-2 text-lg font-semibold">가족·연인·친구·동업자</h2>
            </div>
            <Button type="button" variant="outline" onClick={openNew} className="rounded-full">
              <Plus className="size-4" />
              추가
            </Button>
          </div>

          {others.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-accent p-4 text-sm leading-6 text-muted-foreground">
              아직 저장한 사람이 없습니다. 한 번 저장하면 ‘나와 이 사람’에서 바로 불러올 수 있습니다.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {others.map((person) => (
                <div key={person.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => edit(person)} className="min-w-0 flex-1 text-left">
                      <p className="font-semibold">{person.name} <span className="text-sm font-normal text-(--gold)">· {person.relation}</span></p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{birthText(person)}</p>
                    </button>
                    <button
                      type="button"
                      aria-label="사람 정보 삭제"
                      onClick={() => remove(person.id)}
                      className="rounded-full p-2 text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {formOpen && (
          <section className="mt-5 rounded-3xl border border-(--gold-soft) bg-card p-5">
            <h2 className="text-lg font-semibold">{editingId ? "사람 정보 수정" : "새 사람 저장"}</h2>

            <label className="mt-4 block">
              <span className="text-sm font-medium">이름 또는 호칭</span>
              <input
                value={name}
                maxLength={20}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 민수, 배우자, 동업자"
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-(--gold)"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium">관계</span>
              <input
                value={relation}
                maxLength={20}
                onChange={(event) => setRelation(event.target.value)}
                placeholder="예: 가족, 연인, 친구, 동업자"
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-(--gold)"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium">생년월일</span>
              <input
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-(--gold)"
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

            <label className="mt-4 block">
              <span className="text-sm font-medium">태어난 시</span>
              <select
                value={sijin}
                onChange={(event) => setSijin(event.target.value as SijinId)}
                className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-(--gold)"
              >
                {SIJIN_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id === "unknown" ? item.label : `${item.label} · ${item.range}`}
                  </option>
                ))}
              </select>
            </label>

            {message && <p className="mt-3 text-sm text-destructive">{message}</p>}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="h-12 rounded-full"
              >
                취소
              </Button>
              <Button type="button" onClick={save} className="h-12 rounded-full">
                저장
              </Button>
            </div>
          </section>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          저장한 출생정보는 현재 브라우저에 보관됩니다. 브라우저 저장공간을 지우면 함께 삭제될 수 있습니다.
        </p>
      </div>
    </main>
  );
}
