"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REALITY_ANSWER_DOMAIN_LABELS } from "@/lib/reality-answer-contract";
import {
  loadRealityManagement,
  removeRealityRecord,
  setRealityRecordStatus,
  updateRealityAction,
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

function birthLabel(record: RealityManagementRecord): string {
  const birth = record.birthInput;
  const time = birth.hour === null
    ? "출생시간 모름"
    : `${String(birth.hour).padStart(2, "0")}:${String(birth.minute ?? 0).padStart(2, "0")}`;
  return `${birth.year}년 ${birth.month}월 ${birth.day}일 · ${birth.gender} · ${time}`;
}

function completedCount(record: RealityManagementRecord): number {
  return record.actionDone.filter(Boolean).length;
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

  function toggleAction(index: 0 | 1 | 2) {
    if (!selected) return;
    updateRealityAction(selected.id, index, !selected.actionDone[index]);
    refresh(selected.id);
  }

  function saveNote() {
    if (!selected) return;
    updateRealityNote(selected.id, noteDraft);
    refresh(selected.id);
  }

  function toggleStatus() {
    if (!selected) return;
    setRealityRecordStatus(selected.id, selected.status === "completed" ? "active" : "completed");
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
    const done = completedCount(selected);
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

          <p className="mt-4 section-eyebrow">
            {REALITY_ANSWER_DOMAIN_LABELS[selected.answer.question.domain]} · {selected.status === "completed" ? "완료" : "진행 중"}
          </p>
          <h1 className="mt-2 text-2xl leading-snug font-semibold">{selected.answer.question.raw}</h1>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{birthLabel(selected)}</p>

          <section className="mt-6 rounded-2xl border border-(--gold-soft) bg-card p-5">
            <p className="section-eyebrow">받은 현실답변</p>
            <p className="mt-2 text-xl leading-8 font-semibold">{selected.answer.headline}</p>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{selected.answer.whyNow}</p>
          </section>

          <section className="mt-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="section-eyebrow">지금 할 행동</p>
                <h2 className="mt-1 text-xl font-semibold">{done}/3 완료</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {selected.status === "completed" ? "모두 완료" : "하나씩 체크"}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {selected.answer.actions.map((action, index) => {
                const checked = selected.actionDone[index] ?? false;
                return (
                  <button
                    key={action.title}
                    type="button"
                    onClick={() => toggleAction(index as 0 | 1 | 2)}
                    className={
                      "w-full rounded-2xl border p-5 text-left transition-colors " +
                      (checked
                        ? "border-(--gold-soft) bg-(--gold-soft)"
                        : "border-border bg-card")
                    }
                  >
                    <div className="flex gap-3">
                      {checked
                        ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-(--gold)" />
                        : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}
                      <div>
                        <p className={checked ? "font-semibold line-through opacity-70" : "font-semibold"}>
                          {action.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.detail}</p>
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                          완료 기준 · {action.doneWhen}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-(--gold)" />
              <h2 className="font-semibold">다시 확인할 때</h2>
            </div>
            <p className="mt-3 text-base leading-7">{selected.answer.timing.nextCheckpoint}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              관리 기준일 · {dateLabel(selected.checkDueAt)}
            </p>
          </section>

          <section className="mt-5 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <NotebookPen className="size-4 text-(--gold)" />
              <h2 className="font-semibold">실행하면서 메모</h2>
            </div>
            <textarea
              value={noteDraft}
              maxLength={2000}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="해본 것, 달라진 점, 다시 궁금해진 것을 적어두세요."
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

          <details className="mt-5 rounded-2xl border border-border bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">받은 답 자세히 다시 보기</summary>
            <div className="mt-4 space-y-4 text-sm leading-6">
              <div>
                <p className="font-semibold">반복하기 쉬운 패턴</p>
                <p className="mt-1 text-muted-foreground">{selected.answer.repeatingPattern}</p>
              </div>
              <div>
                <p className="font-semibold">피할 선택</p>
                <p className="mt-1 text-muted-foreground">{selected.answer.avoid}</p>
              </div>
              <div>
                <p className="font-semibold">우선할 선택</p>
                <p className="mt-1 text-muted-foreground">{selected.answer.choose}</p>
              </div>
              <div>
                <p className="font-semibold">현실에서 확인할 것</p>
                <ul className="mt-1 text-muted-foreground">
                  {selected.answer.realityChecks.map((item) => <li key={item}>· {item}</li>)}
                </ul>
              </div>
              {selected.answer.safetyNote && (
                <p className="rounded-xl bg-accent p-3 text-muted-foreground">{selected.answer.safetyNote}</p>
              )}
            </div>
          </details>

          <Button
            size="lg"
            onClick={toggleStatus}
            className="mt-6 h-14 w-full rounded-full text-base"
          >
            {selected.status === "completed" ? "다시 진행 중으로 바꾸기" : "이 질문은 여기까지 완료"}
          </Button>

          <Button asChild size="lg" variant="outline" className="mt-3 h-13 w-full rounded-full text-base">
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
        <p className="section-eyebrow">내 관리</p>
        <h1 className="mt-2 text-2xl leading-snug font-semibold">
          받은 답을 보고 끝내지 않고,
          <br />
          실제 행동까지 이어갑니다
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          내가 물어본 질문과 받은 현실답변, 지금 할 행동을 한곳에서 다시 볼 수 있습니다.
        </p>

        {records.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <p className="font-semibold">아직 저장된 현실답변이 없습니다.</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              사주·손금 풀이 뒤 궁금한 것을 물어보고 현실답변 전체를 열면 여기에 자동으로 저장됩니다.
            </p>
            <Button asChild size="lg" className="mt-5 h-13 w-full rounded-full text-base">
              <Link href="/diagnosis">사주부터 시작하기</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {records.map((record) => {
              const done = completedCount(record);
              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  className="w-full rounded-2xl border border-border bg-card p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-(--gold)">
                        {REALITY_ANSWER_DOMAIN_LABELS[record.answer.question.domain]}
                      </p>
                      <p className="mt-2 line-clamp-2 text-base leading-7 font-semibold">
                        {record.answer.question.raw}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {record.answer.headline}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{record.status === "completed" ? "완료" : `행동 ${done}/3`}</span>
                    <span>{dateLabel(record.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          결제와 가격은 아직 연결하지 않았으며, 현재는 상품 검증 단계입니다.
        </p>
      </div>
    </main>
  );
}
