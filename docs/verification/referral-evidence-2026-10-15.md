# Referral evidence implementation

This branch prepares, but does not apply, the referral evidence migration to any Supabase project. It was applied only to an isolated throwaway local PostgreSQL container for SQL verification.

The browser requests an opaque `ref` link from `POST /api/referrals`. The API stores only a SHA-256 token hash and a SHA-256 anonymous-session hash. The browser receives an HttpOnly `saju_referral_session` cookie; no birth date, photo, report, or personal reading is put in the URL. The recipient sends the opaque token to `/api/saju`, and that route attempts the claim only after it has built and validated a non-null free report. The claim is an atomic SQL RPC protected by row locking and unique constraints for realm/campaign/inviter and realm/campaign/recipient.

The premium route no longer treats `native_share`, `clipboard`, client completion flags, or analytics as evidence. It issues a realm-bound signed receipt only after the inviter's server session has a persisted reward, and rechecks that reward for every premium generation. If the persistent store, rollout flag, realm, public origin, or server-only credential is unavailable, referral creation and premium verification fail closed. The in-memory/browser state remains presentation-only and is not evidence.

Referral rollout requires server-only `SAJU_REFERRAL_ENABLED=true` plus `SAJU_REFERRAL_REALM=test|live`. Test deployments additionally require `SAJU_REFERRAL_PUBLIC_ORIGIN`; clients cannot select the realm. Live uses the existing production origin. Malformed referral cookies are replaced, verification refreshes and persists the newest receipt, and the completion-check action remains available after reload/manual-copy. Referral URL preparation is cached before share/copy so the browser API remains user-gesture bound.

The migration is `supabase/migrations/20261015000000_referral_evidence.sql`. It was not applied to any remote/production database. No credential was created, no production setting was changed, and no production deployment was made.

Known product limitation: an anonymous cookie is a session handle, not proof of a unique human. Cookie deletion, a different device, or intentional self-referral across sessions cannot be reliably identified without fingerprinting/IP personal identification, which this implementation does not use.

## Verification boundary

- `node scripts/test-referral-evidence.mjs` is a source contract test only; it is not a database proof. The updated API contract test is `node scripts/test-premium-trial-browser.mjs` when a local server is running; it expects `participate=400`, missing-store `verify=403`, no receipt, and malformed-cookie replacement.
- TypeScript: `./node_modules/.bin/tsc --noEmit`.
- Focused ESLint: passed with the repository's existing unused `journeyModeFromLocation` warning.
- Supabase production migration/RPC, real multi-session browser completion, cookie deletion behavior, and production rollout: not verified because the migration and server-only store credential were intentionally not provisioned.

## Additional local database verification

No Supabase CLI, `psql`, local Supabase config, running database, or Supabase environment variable was present initially. Docker was available, so an isolated PostgreSQL 16 Alpine container was started with a throwaway database and removed after testing. Supabase-style `anon`, `authenticated`, and `service_role` roles were created only inside that container; no repository, operating-system, or remote credential was changed.

The migration applied successfully after those test-only roles existed. The RPC was exercised for: first claim, `test` versus `live` realm isolation, duplicate recipient, one reward per inviter, same-session self-referral, expired invite, and a forced two-session lock race. The race produced one `claimed` and one `duplicate_recipient`. Direct table access and RPC execution as `anon` were denied. This validates the SQL behavior in local PostgreSQL, not Supabase production behavior or the Next.js-to-Supabase network path.

With a local Next server and no referral store configuration, the updated API contract test passed: direct premium `403`, legacy `participate` `400`, verify `403`, no receipt, and malformed session-cookie replacement. A real two-browser reward flow remains unverified because this environment has no configured persistent store credential/project.

## Parallel branch integration points

`fix/saju-input-clarity-20261015` changes `src/app/diagnosis/page.tsx` around the state/step flow and removes the MBTI step; its version of `PostReadingDetailFlow` also reverts the referral callback contract and changes the comparison-card layout. Merge that branch first for the intended input flow, then reapply this branch's small referral additions in `page.tsx`: the `referralToken` ref, query validation near the initial URL parse, and the `referralToken` field in the `/api/saju` request. In `PostReadingDetailFlow`, preserve the input branch's final layout and retain only this branch's `requestTrial`/`registerParticipation` server-verification changes and reward copy. Do not restore `participate` or client participation strings.

`fix/saju-product-quality-20261014` / `cb0dc3a` and its descendants change premium prose and `src/lib/premium-report.ts`. Merge those prose changes independently, resolve only the overlapping premium-report source/fixture contracts, and retain this branch's `premium-report` route authorization logic plus the server-verified wording in `PostReadingDetailFlow`. No premium prose implementation was intentionally copied into this branch.
