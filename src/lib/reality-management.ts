import type { RealityAnswer } from "@/lib/reality-answer-contract";
import type { BirthInput } from "@/lib/saju";

export const REALITY_MANAGEMENT_STORAGE_KEY = "saju-app:reality-management:v2";
const LEGACY_STORAGE_KEY = "saju-app:reality-management:v1";

export interface RealityManagementRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  birthInput: BirthInput;
  answer: RealityAnswer;
  note: string;
}

export interface RealityManagementState {
  version: 2;
  records: RealityManagementRecord[];
}

function emptyState(): RealityManagementState {
  return { version: 2, records: [] };
}

function makeId(): string {
  return `reality-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRecords(raw: unknown): RealityManagementRecord[] {
  if (!raw || typeof raw !== "object") return [];
  const value = raw as { records?: unknown[] };
  if (!Array.isArray(value.records)) return [];

  return value.records
    .filter((record): record is Record<string, unknown> => Boolean(record && typeof record === "object"))
    .map((record) => {
      const item = record as {
        id?: unknown;
        createdAt?: unknown;
        updatedAt?: unknown;
        birthInput?: unknown;
        answer?: unknown;
        note?: unknown;
      };
      if (
        typeof item.id !== "string" ||
        typeof item.createdAt !== "string" ||
        typeof item.updatedAt !== "string" ||
        !item.birthInput ||
        !item.answer
      ) {
        return null;
      }

      return {
        id: item.id,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        birthInput: item.birthInput as BirthInput,
        answer: item.answer as RealityAnswer,
        note: typeof item.note === "string" ? item.note : "",
      } satisfies RealityManagementRecord;
    })
    .filter((record): record is RealityManagementRecord => Boolean(record))
    .slice(0, 50);
}

export function loadRealityManagement(): RealityManagementState {
  if (typeof window === "undefined") return emptyState();

  try {
    const current = localStorage.getItem(REALITY_MANAGEMENT_STORAGE_KEY);
    if (current) {
      return { version: 2, records: normalizeRecords(JSON.parse(current)) };
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return emptyState();

    const migrated: RealityManagementState = {
      version: 2,
      records: normalizeRecords(JSON.parse(legacy)),
    };
    saveRealityManagementState(migrated);
    return migrated;
  } catch {
    return emptyState();
  }
}

export function saveRealityManagementState(state: RealityManagementState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    REALITY_MANAGEMENT_STORAGE_KEY,
    JSON.stringify({
      version: 2,
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
      version: 2,
      records: [updated, ...state.records.filter((record) => record.id !== existing.id)],
    });
    return updated;
  }

  const record: RealityManagementRecord = {
    id: makeId(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    birthInput: input.birthInput,
    answer: input.answer,
    note: "",
  };

  saveRealityManagementState({
    version: 2,
    records: [record, ...state.records].slice(0, 50),
  });
  return record;
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

  saveRealityManagementState({ version: 2, records });
  return updated;
}

export function removeRealityRecord(recordId: string): void {
  const state = loadRealityManagement();
  saveRealityManagementState({
    version: 2,
    records: state.records.filter((record) => record.id !== recordId),
  });
}
