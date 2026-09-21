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

  return { version: 1, snapshots };
}

export async function syncFinanceManagementWithAccount(): Promise<FinanceAccountSyncResult> {
  const local = loadFinanceManagement();

  if (!isSupabaseConfigured()) {
    return { configured: false, authenticated: false, user: null, state: local };
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { configured: true, authenticated: false, user: null, state: local };
  }

  await uploadLocalState(data.user, local);
  const remote = await downloadAccountState(data.user);
  saveFinanceManagementState(remote);

  return {
    configured: true,
    authenticated: true,
    user: data.user,
    state: remote,
  };
}
