-- Referral evidence store. Apply separately in the target Supabase project.
-- The application deliberately fails closed when its server-only store credential is absent.
create extension if not exists pgcrypto;

create table if not exists public.referral_invites (
  id uuid primary key default gen_random_uuid(),
  realm text not null check (realm in ('test', 'live')),
  campaign_key text not null,
  token_hash text not null unique,
  inviter_session_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  realm text not null check (realm in ('test', 'live')),
  campaign_key text not null,
  invite_id uuid not null references public.referral_invites(id) on delete restrict,
  inviter_session_hash text not null,
  recipient_session_hash text not null,
  created_at timestamptz not null default now(),
  unique (realm, campaign_key, inviter_session_hash),
  unique (realm, campaign_key, recipient_session_hash)
);

alter table public.referral_invites enable row level security;
alter table public.referral_rewards enable row level security;
revoke all on public.referral_invites from public, anon, authenticated;
revoke all on public.referral_rewards from public, anon, authenticated;
grant all on public.referral_invites, public.referral_rewards to service_role;

create index if not exists referral_invites_campaign_expiry_idx
  on public.referral_invites (campaign_key, expires_at);

create or replace function public.claim_referral_reward(
  p_realm text,
  p_campaign_key text,
  p_token_hash text,
  p_recipient_session_hash text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  invite public.referral_invites%rowtype;
  reward_id uuid;
begin
  select * into invite
    from public.referral_invites
   where realm = p_realm and campaign_key = p_campaign_key and token_hash = p_token_hash
   for update;
  if not found or invite.revoked_at is not null then return pg_catalog.jsonb_build_object('status', 'not_found'); end if;
  if invite.expires_at <= pg_catalog.now() then return pg_catalog.jsonb_build_object('status', 'expired'); end if;
  if invite.inviter_session_hash = p_recipient_session_hash then return pg_catalog.jsonb_build_object('status', 'self_referral'); end if;
  if exists (select 1 from public.referral_rewards where realm = p_realm and campaign_key = p_campaign_key and recipient_session_hash = p_recipient_session_hash) then
    return pg_catalog.jsonb_build_object('status', 'duplicate_recipient');
  end if;
  if exists (select 1 from public.referral_rewards where realm = p_realm and campaign_key = p_campaign_key and inviter_session_hash = invite.inviter_session_hash) then
    return pg_catalog.jsonb_build_object('status', 'campaign_exhausted');
  end if;
  insert into public.referral_rewards (realm, campaign_key, invite_id, inviter_session_hash, recipient_session_hash)
  values (p_realm, p_campaign_key, invite.id, invite.inviter_session_hash, p_recipient_session_hash)
  returning id into reward_id;
  return pg_catalog.jsonb_build_object('status', 'claimed', 'reward_id', reward_id);
exception when unique_violation then
  if exists (select 1 from public.referral_rewards where realm = p_realm and campaign_key = p_campaign_key and recipient_session_hash = p_recipient_session_hash) then
    return pg_catalog.jsonb_build_object('status', 'duplicate_recipient');
  end if;
  return pg_catalog.jsonb_build_object('status', 'campaign_exhausted');
end;
$$;

revoke all on function public.claim_referral_reward(text, text, text, text) from public, anon, authenticated;
-- Grant this only to the server-only Supabase role used by the Next.js API.
grant execute on function public.claim_referral_reward(text, text, text, text) to service_role;
