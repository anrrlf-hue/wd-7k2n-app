import type { BirthInput } from "@/lib/saju";
import type { FinanceQuestionId } from "@/lib/finance-question";
import type { SurveyInput } from "@/lib/survey-input";
import type { PaidExtraAnswers, PaidFinanceResult } from "@/lib/paid-finance-engine";
import type { FinanceRecheckInput, FinanceRecheckResult } from "@/lib/finance-recheck";

export const FINANCE_MANAGEMENT_STORAGE_KEY = "saju-app:finance-management:v1";

export interface FinanceRecheckRecord {
  id: string;
  checkedAt: string;
  input: FinanceRecheckInput;
  result: FinanceRecheckResult;
}

export interface FinanceBaselineSnapshot {
  id: string;
  createdAt: string;
  checkDueAt: string;
  birthInput: BirthInput;
  sajuSummary: string | null;
  concerns: FinanceQuestionId[];
  focusedQuestion: FinanceQuestionId;
  financeInput: SurveyInput;
  paidExtraAnswers?: PaidExtraAnswers;
  paidResult: PaidFinanceResult;
  status: "active" | "checked";
  checks?: FinanceRecheckRecord[];
}

export interface FinanceManagementState {
  version: 1;
  snapshots: FinanceBaselineSnapshot[];
}

function emptyState(): FinanceManagementState {
  return { version: 1, snapshots: [] };
}

function makeId(): string {
  return `finance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function plus30DaysIso(now: Date): string {
  const next = new Date(now);
  next.setDate(next.getDate() + 30);
  return next.toISOString();
}

export function loadFinanceManagement(): FinanceManagementState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(FINANCE_MANAGEMENT_STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as FinanceManagementState;
    if (parsed?.version !== 1 || !Array.isArray(parsed.snapshots)) return emptyState();
    return parsed;
  } catch {
    return emptyState();
  }
}

export function saveFinanceManagementState(state: FinanceManagementState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    FINANCE_MANAGEMENT_STORAGE_KEY,
    JSON.stringify({ version: 1, snapshots: state.snapshots.slice(0, 24) }),
  );
}

export function saveFinanceBaseline(input: {
  birthInput: BirthInput;
  sajuSummary: string | null;
  concerns: FinanceQuestionId[];
  focusedQuestion: FinanceQuestionId;
  financeInput: SurveyInput;
  paidExtraAnswers?: PaidExtraAnswers;
  paidResult: PaidFinanceResult;
}): FinanceBaselineSnapshot {
  const now = new Date();
  const snapshot: FinanceBaselineSnapshot = {
    id: makeId(),
    createdAt: now.toISOString(),
    checkDueAt: plus30DaysIso(now),
    birthInput: input.birthInput,
    sajuSummary: input.sajuSummary,
    concerns: input.concerns,
    focusedQuestion: input.focusedQuestion,
    financeInput: input.financeInput,
    paidExtraAnswers: input.paidExtraAnswers,
    paidResult: input.paidResult,
    status: "active",
    checks: [],
  };

  const state = loadFinanceManagement();
  const next: FinanceManagementState = {
    version: 1,
    snapshots: [snapshot, ...state.snapshots].slice(0, 24),
  };
  localStorage.setItem(FINANCE_MANAGEMENT_STORAGE_KEY, JSON.stringify(next));
  return snapshot;
}

export function latestFinanceBaseline(): FinanceBaselineSnapshot | null {
  return loadFinanceManagement().snapshots[0] ?? null;
}

export function saveFinanceRecheck(
  snapshotId: string,
  input: FinanceRecheckInput,
  result: FinanceRecheckResult,
): FinanceBaselineSnapshot | null {
  const state = loadFinanceManagement();
  const checkedAt = new Date();
  let updated: FinanceBaselineSnapshot | null = null;

  const snapshots = state.snapshots.map((snapshot) => {
    if (snapshot.id !== snapshotId) return snapshot;
    const record: FinanceRecheckRecord = {
      id: makeId(),
      checkedAt: checkedAt.toISOString(),
      input,
      result,
    };
    updated = {
      ...snapshot,
      status: "checked" as const,
      checkDueAt: plus30DaysIso(checkedAt),
      checks: [record, ...(snapshot.checks ?? [])].slice(0, 24),
    };
    return updated;
  });

  const next: FinanceManagementState = { ...state, snapshots };
  localStorage.setItem(FINANCE_MANAGEMENT_STORAGE_KEY, JSON.stringify(next));
  return updated;
}

export function markFinanceSnapshotChecked(id: string): void {
  const state = loadFinanceManagement();
  const next: FinanceManagementState = {
    ...state,
    snapshots: state.snapshots.map((snapshot) =>
      snapshot.id === id ? { ...snapshot, status: "checked" as const } : snapshot,
    ),
  };
  localStorage.setItem(FINANCE_MANAGEMENT_STORAGE_KEY, JSON.stringify(next));
}
