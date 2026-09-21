import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  loadFinanceManagement,
  saveFinanceManagementState,
  type FinanceBaselineSnapshot,
  type FinanceManagementState,
  type FinanceRecheckRecord,
} from "@/lib/finance-management";

interface SnapshotRow {
  id: string;
  client_snapshot_id: string;
  created_at: string;
  check_due_at: string | null;
  focused_question: string;
  concerns: string[];
  status: "active" | "checked";
  payload: FinanceBaselineSnapshot;
}

interface RecheckRow {
  snapshot_id: string;
  client_recheck_id: string;
  checked_at: string;
  input: FinanceRecheckRecord["input"];
  result: FinanceRecheckRecord["result"];
}

export interface FinanceAccountSyncResult {
  configured: boolean;
  authenticated: boolean;
  user: User | null;
  state: FinanceManagementState;
}

function snapshotPayload(snapshot: FinanceBaselineSnapshot): FinanceBaselineSnapshot {
  return { ...snapshot, checks: [] };
}

function snapshotActivity(snapshot: FinanceBaselineSnapshot): number {
  const candidates = [
    Date.parse(snapshot.createdAt),
    ...(snapshot.checks ?? []).map((check) => Date.parse(check.checkedAt)),
  ].filter(Number.isFinite);

  const due = Date.parse(snapshot.checkDueAt);
  // checkDueAt은 마지막 저장/점검 시점 + 30일이므로, 최근 활동시각의 보조 근거로만 쓴다.
  if (Number.isFinite(due)) candidates.push(due - 30 * 86400000);

  return Math.max(...candidates, 0);
}

function mergeChecks(
  remote: FinanceRecheckRecord[] = [],
  local: FinanceRecheckRecord[] = [],
): FinanceRecheckRecord[] {
  const byId = new Map<string, FinanceRecheckRecord>();
  for (const check of [...remote, ...local]) {
    const previous = byId.get(check.id);
    if (!previous || Date.parse(check.checkedAt) > Date.parse(previous.checkedAt)) {
      byId.set(check.id, check);
    }
  }
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt))
    .slice(0, 24);
}

function mergeAccountState(
  userId: string,
  remote: FinanceManagementState,
  local: FinanceManagementState,
): FinanceManagementState {
  // 다른 계정에 귀속된 브라우저 기록은 현재 로그인 계정으로 절대 복사하지 않는다.
  const localSnapshots =
    local.ownerUserId && local.ownerUserId !== userId ? [] : local.snapshots;

  const byId = new Map<string, FinanceBaselineSnapshot>();
  for (const snapshot of remote.snapshots) byId.set(snapshot.id, snapshot);

  for (const localSnapshot of localSnapshots) {
    const remoteSnapshot = byId.get(localSnapshot.id);
    if (!remoteSnapshot) {
      byId.set(localSnapshot.id, localSnapshot);
      continue;
    }

    const localIsNewer = snapshotActivity(localSnapshot) > snapshotActivity(remoteSnapshot);
    const preferred = localIsNewer ? localSnapshot : remoteSnapshot;
    byId.set(localSnapshot.id, {
      ...preferred,
      checks: mergeChecks(remoteSnapshot.checks, localSnapshot.checks),
    });
  }

  return {
    version: 1,
    ownerUserId: userId,
    snapshots: [...byId.values()]
      .sort((a, b) => snapshotActivity(b) - snapshotActivity(a))
      .slice(0, 24),
  };
}

async function uploadLocalState(user: User, local: FinanceManagementState): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  for (const snapshot of local.snapshots) {
    const { data: row, error } = await supabase
      .from("finance_snapshots")
      .upsert(
        {
          user_id: user.id,
          client_snapshot_id: snapshot.id,
          created_at: snapshot.createdAt,
          check_due_at: snapshot.checkDueAt,
          focused_question: snapshot.focusedQuestion,
          concerns: snapshot.concerns,
          status: snapshot.status,
          payload: snapshotPayload(snapshot),
        },
        { onConflict: "user_id,client_snapshot_id" },
      )
      .select("id")
      .single();

    if (error || !row) throw error ?? new Error("finance snapshot sync failed");

    for (const check of snapshot.checks ?? []) {
      const { error: checkError } = await supabase
        .from("finance_rechecks")
        .upsert(
          {
            user_id: user.id,
            snapshot_id: row.id,
            client_recheck_id: check.id,
            checked_at: check.checkedAt,
            input: check.input,
            result: check.result,
          },
          { onConflict: "user_id,client_recheck_id" },
        );

      if (checkError) throw checkError;
    }
  }
}

async function downloadAccountState(user: User): Promise<FinanceManagementState> {
  const supabase = createSupabaseBrowserClient();

  const { data: snapshotRows, error } = await supabase
    .from("finance_snapshots")
    .select("id, client_snapshot_id, created_at, check_due_at, focused_question, concerns, status, payload")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw error;

  const rows = (snapshotRows ?? []) as SnapshotRow[];
  const ids = rows.map((row) => row.id);
  let rechecks: RecheckRow[] = [];

  if (ids.length > 0) {
    const { data, error: recheckError } = await supabase
      .from("finance_rechecks")
      .select("snapshot_id, client_recheck_id, checked_at, input, result")
      .eq("user_id", user.id)
      .in("snapshot_id", ids)
      .order("checked_at", { ascending: false });

    if (recheckError) throw recheckError;
    rechecks = (data ?? []) as RecheckRow[];
  }

  const snapshots = rows.map((row) => {
    const checks: FinanceRecheckRecord[] = rechecks
      .filter((check) => check.snapshot_id === row.id)
      .map((check) => ({
        id: check.client_recheck_id,
        checkedAt: check.checked_at,
        input: check.input,
        result: check.result,
      }));

    return {
      ...row.payload,
      id: row.client_snapshot_id,
      createdAt: row.created_at,
      checkDueAt: row.check_due_at ?? row.payload.checkDueAt,
      focusedQuestion: row.focused_question as FinanceBaselineSnapshot["focusedQuestion"],
      concerns: row.concerns as FinanceBaselineSnapshot["concerns"],
      status: row.status,
      checks,
    } satisfies FinanceBaselineSnapshot;
  });

  return { version: 1, ownerUserId: user.id, snapshots };
}

export async function syncFinanceManagementWithAccount(): Promise<FinanceAccountSyncResult> {
  const local = loadFinanceManagement();

  if (!isSupabaseConfigured()) {
    return { configured: false, authenticated: false, user: null, state: local };
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    const safeLocal = local.ownerUserId
      ? { ...local, snapshots: [] }
      : local;
    return { configured: true, authenticated: false, user: null, state: safeLocal };
  }

  // 서버를 먼저 읽는다. 오래된 로컬 기록이 최신 서버 기록을 먼저 덮어쓰지 않게 한다.
  const remote = await downloadAccountState(data.user);
  const merged = mergeAccountState(data.user.id, remote, local);

  await uploadLocalState(data.user, merged);
  const finalState = await downloadAccountState(data.user);
  saveFinanceManagementState(finalState);

  return {
    configured: true,
    authenticated: true,
    user: data.user,
    state: finalState,
  };
}
