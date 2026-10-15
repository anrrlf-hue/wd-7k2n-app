import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getReferralRealm, isReferralEnabled, REFERRAL_CAMPAIGN, hashReferralValue } from "@/lib/referral";

type ReferralStoreClient = SupabaseClient;

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
const STORE_FETCH_TIMEOUT_MS = 7500;

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

function logReferralStoreFailure(code: ReferralStoreFailureCode) {
  console.error("[referral-store-unavailable]", JSON.stringify({ code, ...referralConfigFlags() }));
}

async function bounded<T>(operation: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error("Referral store timeout")), STORE_TIMEOUT_MS); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const referralFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  let timedOut = false;
  const callerSignal = init?.signal;
  const abortFromCaller = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, STORE_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new Error("Referral store timeout");
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
};

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
    const { error } = await bounded(store.from("referral_invites").insert({
      realm,
      campaign_key: REFERRAL_CAMPAIGN,
      token_hash: hashReferralValue(input.token),
      inviter_session_hash: hashReferralValue(input.inviterSessionId),
      expires_at: input.expiresAt,
    }));
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
    const { data, error } = await bounded(store.rpc("claim_referral_reward", {
      p_realm: realm,
      p_campaign_key: REFERRAL_CAMPAIGN,
      p_token_hash: hashReferralValue(input.token),
      p_recipient_session_hash: hashReferralValue(input.recipientSessionId),
    }));
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
    const { data, error } = await bounded(store
      .from("referral_rewards")
      .select("id")
      .eq("campaign_key", REFERRAL_CAMPAIGN)
      .eq("realm", realm)
      .eq("inviter_session_hash", hashReferralValue(inviterSessionId))
      .maybeSingle());
    if (error) return { kind: "unavailable" };
    return data?.id ? { kind: "eligible" } : { kind: "pending" };
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
    const { data, error } = await bounded(store
      .from("referral_invites")
      .select("id")
      .eq("realm", realm)
      .eq("campaign_key", REFERRAL_CAMPAIGN)
      .eq("token_hash", hashReferralValue(input.token))
      .eq("inviter_session_hash", hashReferralValue(input.inviterSessionId))
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle());
    if (error) {
      logReferralStoreFailure("query_error");
      return "unavailable";
    }
    return data?.id ? "valid" : "invalid";
  } catch (error) {
    logReferralStoreFailure(error instanceof Error && error.message === "Referral store timeout" ? "timeout" : "query_error");
    return "unavailable";
  }
}
