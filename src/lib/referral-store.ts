import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getReferralRealm, isReferralEnabled, REFERRAL_CAMPAIGN, hashReferralValue } from "@/lib/referral";

type ReferralStoreClient = SupabaseClient;
type ReferralQueryResponse = { status?: unknown; data: unknown; error: { code?: unknown; message?: unknown } | null };

export type ReferralRewardStatus =
  | { kind: "claimed"; rewardId: string }
  | { kind: "not_found" }
  | { kind: "duplicate_recipient" }
  | { kind: "self_referral" }
  | { kind: "campaign_exhausted" }
  | { kind: "expired" }
  | { kind: "unavailable" };

export type ReferralLookupStatus =
  | { kind: "eligible" }
  | { kind: "pending" }
  | { kind: "unavailable" };

const STORE_TIMEOUT_MS = 8000;

const SAFE_POSTGREST_ERROR_CODES = new Set([
  "PGRST116",
  "PGRST202",
  "PGRST301",
  "23505",
  "42501",
  "42883",
]);
const SAFE_EXCEPTION_NAMES = new Set(["AbortError", "TimeoutError", "TypeError", "Error"]);
const SAFE_FETCH_CAUSE_CODES = new Set(["ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET"]);
const SAFE_FETCH_CATEGORIES = new Set(["invalid-header", "invalid-url", "fetch-failed"]);

type ReferralStoreFailureCode =
  | "disabled"
  | "config_missing"
  | "invalid_realm"
  | "client_creation"
  | "timeout"
  | "query_error";

function referralConfigFlags() {
  return {
    enabled: isReferralEnabled(),
    realmConfigured: Boolean(process.env.SAJU_REFERRAL_REALM),
    realmValid: Boolean(getReferralRealm()),
    urlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    serviceRoleKeyConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

function safeStatus(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && (value === 0 || (value >= 100 && value <= 599)) ? value : null;
}

function safePostgrestCode(value: unknown): string | null {
  return typeof value === "string" && SAFE_POSTGREST_ERROR_CODES.has(value) ? value : null;
}

function safeExceptionName(value: unknown): string | null {
  return typeof value === "string" && SAFE_EXCEPTION_NAMES.has(value) ? value : null;
}

function safeFetchCauseCode(value: unknown): string | null {
  return typeof value === "string" && SAFE_FETCH_CAUSE_CODES.has(value) ? value : null;
}

function safeFetchCategory(value: unknown): string | null {
  return typeof value === "string" && SAFE_FETCH_CATEGORIES.has(value) ? value : null;
}

function classifyFetchFailure(error: unknown): { exceptionName: string; category: string; causeCode: string | null } {
  const candidate = error as { name?: unknown; message?: unknown; code?: unknown; cause?: { code?: unknown; message?: unknown } } | null;
  const exceptionName = safeExceptionName(candidate?.name) ?? "Error";
  const message = typeof candidate?.message === "string" ? candidate.message : "";
  const causeCode = safeFetchCauseCode(candidate?.cause?.code ?? candidate?.code);
  const category = /header/i.test(message) ? "invalid-header" : /invalid.*url|url.*parse|absolute url/i.test(message) ? "invalid-url" : "fetch-failed";
  return { exceptionName, category, causeCode };
}

function parseSafeFetchDiagnostic(message: unknown): { exceptionName: string | null; category: string | null; causeCode: string | null } {
  if (typeof message !== "string") return { exceptionName: null, category: null, causeCode: null };
  const match = /^(AbortError|TimeoutError|TypeError|Error): (invalid-header|invalid-url|fetch-failed)(?::([A-Z0-9_]+))?$/.exec(message);
  if (!match) return { exceptionName: null, category: null, causeCode: null };
  return { exceptionName: safeExceptionName(match[1]), category: safeFetchCategory(match[2]), causeCode: safeFetchCauseCode(match[3]) };
}

function logReferralStoreFailure(code: ReferralStoreFailureCode, details: { status?: unknown; errorCode?: unknown; exceptionName?: unknown; fetchCategory?: unknown; causeCode?: unknown; timedOut?: boolean } = {}) {
  console.error("[referral-store-unavailable]", JSON.stringify({
    code,
    status: safeStatus(details.status),
    errorCode: safePostgrestCode(details.errorCode),
    exceptionName: safeExceptionName(details.exceptionName),
    fetchCategory: safeFetchCategory(details.fetchCategory),
    causeCode: safeFetchCauseCode(details.causeCode),
    timedOut: details.timedOut === true,
    ...referralConfigFlags(),
  }));
}

const referralFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    // Preserve AbortError so PostgREST will not retry a cancelled operation.
    if ((error as { name?: unknown } | null)?.name === "AbortError") throw error;
    const diagnostic = classifyFetchFailure(error);
    const safeError = new Error(`${diagnostic.category}${diagnostic.causeCode ? `:${diagnostic.causeCode}` : ""}`);
    safeError.name = diagnostic.exceptionName;
    throw safeError;
  }
};

async function withReferralDeadline<T>(operation: (signal: AbortSignal) => PromiseLike<T>): Promise<{ result: T; timedOut: boolean }> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, STORE_TIMEOUT_MS);
  try {
    return { result: await operation(controller.signal), timedOut };
  } finally {
    clearTimeout(timer);
  }
}

function createReferralStore(): ReferralStoreClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    logReferralStoreFailure("config_missing");
    return null;
  }
  try {
    const { url } = getSupabasePublicConfig();
    return createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: referralFetch },
    });
  } catch {
    logReferralStoreFailure("client_creation");
    return null;
  }
}

export function isReferralStoreConfigured(): boolean {
  return Boolean(
    isReferralEnabled() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    getReferralRealm(),
  );
}

export async function createReferralInvite(input: {
  token: string;
  inviterSessionId: string;
  expiresAt: string;
}): Promise<boolean> {
  if (!isReferralEnabled()) return false;
  const store = createReferralStore();
  const realm = getReferralRealm();
  if (!store || !realm) return false;
  try {
    const { result: { error } } = await withReferralDeadline(signal => store.from("referral_invites").insert({
      realm,
      campaign_key: REFERRAL_CAMPAIGN,
      token_hash: hashReferralValue(input.token),
      inviter_session_hash: hashReferralValue(input.inviterSessionId),
      expires_at: input.expiresAt,
    }).abortSignal(signal).retry(false));
    return !error;
  } catch { return false; }
}

export async function claimReferralReward(input: {
  token: string;
  recipientSessionId: string;
}): Promise<ReferralRewardStatus> {
  if (!isReferralEnabled()) return { kind: "unavailable" };
  const store = createReferralStore();
  const realm = getReferralRealm();
  if (!store || !realm) return { kind: "unavailable" };
  try {
    const { result: { data, error } } = await withReferralDeadline(signal => store.rpc("claim_referral_reward", {
      p_realm: realm,
      p_campaign_key: REFERRAL_CAMPAIGN,
      p_token_hash: hashReferralValue(input.token),
      p_recipient_session_hash: hashReferralValue(input.recipientSessionId),
    }).abortSignal(signal).retry(false));
    if (error || !data || typeof data !== "object") return { kind: "unavailable" };
    const result = data as { status?: string; reward_id?: string };
    if (result.status === "claimed" && typeof result.reward_id === "string") return { kind: "claimed", rewardId: result.reward_id };
    if (result.status === "self_referral") return { kind: "self_referral" };
    if (result.status === "duplicate_recipient") return { kind: "duplicate_recipient" };
    if (result.status === "campaign_exhausted") return { kind: "campaign_exhausted" };
    if (result.status === "expired") return { kind: "expired" };
    return { kind: "not_found" };
  } catch { return { kind: "unavailable" }; }
}

export async function getReferralRewardStatus(inviterSessionId: string): Promise<ReferralLookupStatus> {
  if (!isReferralEnabled()) return { kind: "unavailable" };
  const store = createReferralStore();
  const realm = getReferralRealm();
  if (!store || !realm) return { kind: "unavailable" };
  try {
    const { result: { data, error } } = await withReferralDeadline<ReferralQueryResponse>(signal => store
      .from("referral_rewards")
      .select("id")
      .eq("campaign_key", REFERRAL_CAMPAIGN)
      .eq("realm", realm)
      .eq("inviter_session_hash", hashReferralValue(inviterSessionId))
      .abortSignal(signal)
      .retry(false)
      .maybeSingle());
    if (error) return { kind: "unavailable" };
    return (data as { id?: string } | null)?.id ? { kind: "eligible" } : { kind: "pending" };
  } catch { return { kind: "unavailable" }; }
}

export async function validateReferralInvite(input: { token: string; inviterSessionId: string }): Promise<"valid" | "invalid" | "unavailable"> {
  if (!isReferralEnabled()) {
    logReferralStoreFailure("disabled");
    return "unavailable";
  }
  const realm = getReferralRealm();
  if (!realm) {
    logReferralStoreFailure("invalid_realm");
    return "unavailable";
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    logReferralStoreFailure("config_missing");
    return "unavailable";
  }
  const store = createReferralStore();
  if (!store) return "unavailable";
  try {
    const { result, timedOut } = await withReferralDeadline<ReferralQueryResponse>(signal => store
      .from("referral_invites")
      .select("id")
      .eq("realm", realm)
      .eq("campaign_key", REFERRAL_CAMPAIGN)
      .eq("token_hash", hashReferralValue(input.token))
      .eq("inviter_session_hash", hashReferralValue(input.inviterSessionId))
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .abortSignal(signal)
      .retry(false)
      .maybeSingle());
    const { data, error } = result;
    if (error) {
      const fetchDiagnostic = parseSafeFetchDiagnostic(error.message);
      logReferralStoreFailure(timedOut ? "timeout" : "query_error", {
        status: result.status,
        errorCode: error.code,
        exceptionName: fetchDiagnostic.exceptionName,
        fetchCategory: fetchDiagnostic.category,
        causeCode: fetchDiagnostic.causeCode,
        timedOut,
      });
      return "unavailable";
    }
    return (data as { id?: string } | null)?.id ? "valid" : "invalid";
  } catch (error) {
    // Do not replace AbortError: Supabase uses it to stop retrying aborted GETs.
    const aborted = error instanceof Error && error.name === "AbortError";
    const fetchDiagnostic = aborted
      ? { exceptionName: "AbortError", category: null, causeCode: null }
      : classifyFetchFailure(error);
    logReferralStoreFailure("query_error", {
      exceptionName: fetchDiagnostic.exceptionName,
      fetchCategory: fetchDiagnostic.category,
      causeCode: fetchDiagnostic.causeCode,
      timedOut: error instanceof Error && error.name === "AbortError",
    });
    return "unavailable";
  }
}
