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

function createReferralStore(): ReferralStoreClient | null {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  try {
    const { url } = getSupabasePublicConfig();
    return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  } catch {
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
  const store = createReferralStore();
  const realm = getReferralRealm();
  if (!store || !realm) return false;
  const { error } = await store.from("referral_invites").insert({
    realm,
    campaign_key: REFERRAL_CAMPAIGN,
    token_hash: hashReferralValue(input.token),
    inviter_session_hash: hashReferralValue(input.inviterSessionId),
    expires_at: input.expiresAt,
  });
  return !error;
}

export async function claimReferralReward(input: {
  token: string;
  recipientSessionId: string;
}): Promise<ReferralRewardStatus> {
  const store = createReferralStore();
  const realm = getReferralRealm();
  if (!store || !realm) return { kind: "unavailable" };
  const { data, error } = await store.rpc("claim_referral_reward", {
    p_realm: realm,
    p_campaign_key: REFERRAL_CAMPAIGN,
    p_token_hash: hashReferralValue(input.token),
    p_recipient_session_hash: hashReferralValue(input.recipientSessionId),
  });
  if (error || !data || typeof data !== "object") return { kind: "unavailable" };
  const result = data as { status?: string; reward_id?: string };
  if (result.status === "claimed" && typeof result.reward_id === "string") return { kind: "claimed", rewardId: result.reward_id };
  if (result.status === "self_referral") return { kind: "self_referral" };
  if (result.status === "duplicate_recipient") return { kind: "duplicate_recipient" };
  if (result.status === "campaign_exhausted") return { kind: "campaign_exhausted" };
  if (result.status === "expired") return { kind: "expired" };
  return { kind: "not_found" };
}

export async function hasReferralReward(inviterSessionId: string): Promise<boolean> {
  const store = createReferralStore();
  const realm = getReferralRealm();
  if (!store || !realm) return false;
  const { data, error } = await store
    .from("referral_rewards")
    .select("id")
    .eq("campaign_key", REFERRAL_CAMPAIGN)
    .eq("realm", realm)
    .eq("inviter_session_hash", hashReferralValue(inviterSessionId))
    .maybeSingle();
  return !error && Boolean(data?.id);
}
