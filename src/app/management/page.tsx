"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RealityAnswerDomain } from "@/lib/reality-answer-contract";
import {
  loadRealityManagement,
  removeRealityRecord,
  updateRealityNote,
  type RealityManagementRecord,
} from "@/lib/reality-management";

function dateLabel(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function broadDomainLabel(domain: RealityAnswerDomain): string {
  if (domain === "love" || domain === "relationship") return "연애·인간관계";
  if (domain === "career" || domain === "work_business") return "일·직업·사업";
  if (domain === "money") return "돈·재물";
  if (domain === "wellbeing") return "생활·건강";
  return "전체 사주";
}

function birthLabel(record: RealityManagementRecord): string {
  const birth = record.birthInput;
  const time = birth.hour === null
    ? "출생시간 모름"
    : `${String(birth.hour).padStart(2, "0")}:${String(birth.minute ?? 0).padStart(2, "0")}`;
  return `${birth.year}년 ${birth.month}월 ${birth.day}일 · ${birth.gender} · ${time}`;
}

export default function ManagementPage() {
  const [records, setRecords] = useState<RealityManagementRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    const state = loadRealityManagement();
    queueMicrotask(() => {
      setRecords(state.records);
      setLoaded(true);
    });
  }, []);

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    setNoteDraft(selected?.note ?? "");
  }, [selected]);

  function refresh(selectId?: string | null) {
    const state = loadRealityManagement();
    setRecords(state.records);
    if (selectId !== undefined) setSelectedId(selectId);
  }

  function saveNote() {
    if (!selected) return;
    updateRealityNote(selected.id, noteDraft);
    refresh(selected.id);
  }

  function deleteRecord() {
    if (!selected) return;
    removeRealityRecord(selected.id);
    refresh(null);
  }

  if (!loaded) {
    return <main className="journey-surface min-h-screen"><div className="journey-shell py-12" /></main>;
  }

  if (selected) {
    const answer = selected.answer;
    return (
      <main className="journey-surface min-h-screen">
        <div className="journey-shell py-8">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex min-h-11 items-center gap-1 text-sm text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            내 질문 목록
          </button>

          <p className="mt-4 section-eyebrow">{broadDomainLabel(answer.question.domain)}</p>
          <h1 className="mt-2 text-2xl leading-snug font-semibold">{answer.question.raw}</h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{birthLabel(selected)}</p>

          <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">받은 답</p>
            <p className="mt-2 text-xl leading-8 font-semibold">{answer.headline}</p>
          </section>

          {answer.timing.windows && answer.timing.windows.length > 0 ? (
            <section className="mt-4 rounded-2xl border border-(--gold-soft) bg-card p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-(--gold)" />
                <h2 className="font-semibold">눈여겨볼 시기</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer.timing.now}</p>
              <div className="mt-3 space-y-3">
                {answer.timing.windows.map((window, index) => (
                  <div key={window.label} className="rounded-xl bg-accent p-4">
                    <p className="text-xs font-semibold text-(--gold)">
                      {index === 0 ? "가장 강하게 보이는 시기" : index === 1 ? "두 번째로 눈여겨볼 시기" : "한 번 더 살아나는 시기"}
                    </p>
                    <p className="mt-1 font-semibold">{window.label}</p>
                    <p className="mt-2 text-sm font-medium">이때는</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {window.meaning ?? window.reason}
                    </p>
                    {window.positive && (
                      <div className="mt-2 rounded-lg bg-background/70 px-3 py-2">
                        <p className="text-xs font-semibold text-(--gold)">좋은 흐름으로 나타나면</p>
                        <p className="mt-1 text-sm leading-6 text-foreground/80">{window.positive}</p>
                      </div>
                    )}
                    {window.caution && (
                      <div className="mt-2">
                        <p className="text-xs font-medium">조심할 점</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{window.caution}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {answer.timing.basis && (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{answer.timing.basis}</p>
              )}
            </section>
          ) : (
            <section className="mt-4 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-(--gold)" />
                <h2 className="font-semibold">현재 시기 흐름</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{answer.timing.now}</p>
            </section>
          )}

          {answer.report && (
            <section className="mt-4 space-y-3">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-semibold">이 질문을 사주로 풀면</h2>
                <p className="mt-3 text-base leading-8 text-muted-foreground">
                  {answer.report.questionReading}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-semibold">지금의 흐름</h2>
                <p className="mt-3 text-base leading-8 text-muted-foreground">
                  {answer.report.currentFlow}
                </p>
              </div>
              <div className="rounded-2xl border border-(--gold-soft) bg-card p-5">
                <h2 className="font-semibold">앞으로 어떻게 나타날 수 있나요?</h2>
                <p className="mt-3 text-base leading-8 text-muted-foreground">
                  {answer.report.solutionReading}
                </p>
              </div>
            </section>
          )}

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">반복해서 나타나기 쉬운 흐름</h2>
            <p className="mt-2 text-base leading-7 text-muted-foreground">{answer.repeatingPattern}</p>
          </section>

          <section className="mt-4 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="text-sm text-muted-foreground">가장 중요하게 볼 점</p>
            <p className="mt-2 text-base leading-7 font-semibold">{answer.choose}</p>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">주의해서 볼 점</p>
            <p className="mt-2 text-base leading-7">{answer.avoid}</p>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-semibold">결과를 달라지게 할 수 있는 현실 변수</h2>
            <ul className="mt-3 space-y-2 text-base leading-7 text-muted-foreground">
              {answer.realityChecks.map((item) => <li key={item}>· {item}</li>)}
            </ul>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <NotebookPen className="size-4 text-(--gold)" />
              <h2 className="font-semibold">내 메모</h2>
            </div>
            <textarea
              value={noteDraft}
              maxLength={2000}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="맞았던 부분, 실제로 달라진 점, 다시 궁금해진 내용을 적어두세요."
              className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm leading-6 outline-none focus:border-(--gold)"
            />
            <Button
              type="button"
              variant="outline"
              onClick={saveNote}
              className="mt-3 h-11 w-full rounded-full"
            >
              메모 저장
            </Button>
          </section>

          <Button asChild size="lg" variant="outline" className="mt-6 h-13 w-full rounded-full text-base">
            <Link href="/diagnosis">새 사주 질문 시작하기</Link>
          </Button>

          <button
            type="button"
            onClick={deleteRecord}
            className="mt-5 min-h-11 w-full text-sm text-muted-foreground underline underline-offset-4"
          >
            이 질문 기록 삭제
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
            현재 관리기록은 이 브라우저에 저장됩니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="journey-surface min-h-screen">
      <div className="journey-shell py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-eyebrow">내 관리</p>
            <h1 className="mt-2 text-2xl font-semibold">내 질문과 받은 답</h1>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/diagnosis">새 질문</Link>
          </Button>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          물어본 질문, 받은 답, 눈여겨볼 시기와 메모를 다시 볼 수 있습니다.
        </p>

        {records.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-semibold">아직 저장한 질문이 없습니다.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              사주풀이에서 궁금한 것을 물어보면 여기에 답과 시기가 저장됩니다.
            </p>
            <Button asChild size="lg" className="mt-5 h-13 rounded-full">
              <Link href="/diagnosis">내 사주 보러 가기</Link>
            </Button>
          </section>
        ) : (
          <div className="mt-6 space-y-3">
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelectedId(record.id)}
                className="w-full rounded-2xl border border-border bg-card p-5 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-(--gold)">{broadDomainLabel(record.answer.question.domain)}</p>
                    <p className="mt-1 line-clamp-2 font-semibold">{record.answer.question.raw}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {record.answer.headline}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{dateLabel(record.updatedAt)}</p>
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
