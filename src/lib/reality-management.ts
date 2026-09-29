import type { RealityAnswer } from "@/lib/reality-answer-contract";
import type { BirthInput } from "@/lib/saju";

export const REALITY_MANAGEMENT_STORAGE_KEY = "saju-app:reality-management:v1";

export interface RealityManagementRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  checkDueAt: string;
  birthInput: BirthInput;
  answer: RealityAnswer;
  actionDone: [boolean, boolean, boolean];
  note: string;
  status: "active" | "completed";
}

export interface RealityManagementState {
  version: 1;
  records: RealityManagementRecord[];
}

function emptyState(): RealityManagementState {
  return { version: 1, records: [] };
}

function makeId(): string {
  return `reality-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function plusDaysIso(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function normalizeState(raw: unknown): RealityManagementState {
  if (!raw || typeof raw !== "object") return emptyState();
  const value = raw as Partial<RealityManagementState>;
  if (value.version !== 1 || !Array.isArray(value.records)) return emptyState();

  const records = value.records
    .filter((record): record is RealityManagementRecord => {
      if (!record || typeof record !== "object") return false;
      const item = record as Partial<RealityManagementRecord>;
      return (
        typeof item.id === "string" &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string" &&
        typeof item.checkDueAt === "string" &&
        Boolean(item.birthInput) &&
        Boolean(item.answer) &&
        Array.isArray(item.actionDone) &&
        item.actionDone.length === 3
      );
    })
    .slice(0, 50);

  return { version: 1, records };
}

export function loadRealityManagement(): RealityManagementState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(REALITY_MANAGEMENT_STORAGE_KEY);
    if (!raw) return emptyState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function saveRealityManagementState(state: RealityManagementState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    REALITY_MANAGEMENT_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      records: state.records.slice(0, 50),
    } satisfies RealityManagementState),
  );
}

function sameAnswer(record: RealityManagementRecord, answer: RealityAnswer): boolean {
  return (
    record.answer.question.domain === answer.question.domain &&
    record.answer.question.raw.trim() === answer.question.raw.trim()
  );
}

export function saveRealityAnswer(input: {
  birthInput: BirthInput;
  answer: RealityAnswer;
}): RealityManagementRecord {
  const state = loadRealityManagement();
  const now = new Date();
  const existing = state.records.find((record) => sameAnswer(record, input.answer));

  if (existing) {
    const updated: RealityManagementRecord = {
      ...existing,
      updatedAt: now.toISOString(),
      answer: input.answer,
      birthInput: input.birthInput,
    };
    saveRealityManagementState({
      version: 1,
      records: [updated, ...state.records.filter((record) => record.id !== existing.id)],
    });
    return updated;
  }

  const record: RealityManagementRecord = {
    id: makeId(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    checkDueAt: plusDaysIso(now, 30),
    birthInput: input.birthInput,
    answer: input.answer,
    actionDone: [false, false, false],
    note: "",
    status: "active",
  };

  saveRealityManagementState({
    version: 1,
    records: [record, ...state.records].slice(0, 50),
  });
  return record;
}

export function updateRealityAction(
  recordId: string,
  index: 0 | 1 | 2,
  done: boolean,
): RealityManagementRecord | null {
  const state = loadRealityManagement();
  let updated: RealityManagementRecord | null = null;

  const records = state.records.map((record) => {
    if (record.id !== recordId) return record;
    const actionDone = [...record.actionDone] as [boolean, boolean, boolean];
    actionDone[index] = done;
    const allDone = actionDone.every(Boolean);
    updated = {
      ...record,
      actionDone,
      status: allDone ? "completed" : "active",
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });

  saveRealityManagementState({ version: 1, records });
  return updated;
}

export function updateRealityNote(recordId: string, note: string): RealityManagementRecord | null {
  const state = loadRealityManagement();
  let updated: RealityManagementRecord | null = null;

  const records = state.records.map((record) => {
    if (record.id !== recordId) return record;
    updated = {
      ...record,
      note: note.slice(0, 2000),
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });

  saveRealityManagementState({ version: 1, records });
  return updated;
}

export function setRealityRecordStatus(
  recordId: string,
  status: RealityManagementRecord["status"],
): RealityManagementRecord | null {
  const state = loadRealityManagement();
  let updated: RealityManagementRecord | null = null;

  const records = state.records.map((record) => {
    if (record.id !== recordId) return record;
    updated = {
      ...record,
      status,
      updatedAt: new Date().toISOString(),
      actionDone:
        status === "completed"
          ? ([true, true, true] as [boolean, boolean, boolean])
          : record.actionDone,
    };
    return updated;
  });

  saveRealityManagementState({ version: 1, records });
  return updated;
}

export function removeRealityRecord(recordId: string): void {
  const state = loadRealityManagement();
  saveRealityManagementState({
    version: 1,
    records: state.records.filter((record) => record.id !== recordId),
  });
}
