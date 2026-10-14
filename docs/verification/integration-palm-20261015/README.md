# Integrated palm/customer-flow verification

This directory preserves the synthetic browser evidence produced on the integration branch. It is evidence for the integrated UI/API flow only; it is not a production or customer-data verification.

## Provenance

- Branch: `integration/saju-product-quality-20261015`
- Evidence baseline commit: `2c0639184b895ddc5d7e36b030efa26900cc8abd`
- App server source/build for the referral follow-up: `b34a83b` (merge containing `4160877`; `c93c2a3` changed only the referral test flow)
- Server command: `./node_modules/.bin/next start -p 3103`
- Server port: `3103`
- Observed Next server PID: `7147`
- Evidence source: `/tmp/integration-palm-final`
- Test fixture command: `TEST_BASE_URL=http://127.0.0.1:3103 TEST_EVIDENCE_DIR=/tmp/integration-palm-final node scripts/test-palm-customer-browser.mjs`
- Input data: synthetic fixtures only; no customer photos or customer records

## Coverage recorded in `summary.json`

- Normal, partial, and all-failure/retry states
- First-hand preservation and Saju-first waiting/result states
- Premium entry and expanded report evidence
- Relationship entry after the personal and bilateral result path; the bilateral/양손 path was exercised, not an independent personal-only entry path
- No default relationship purpose was observed; blank-purpose submission was not exercised
- Successful result, error retry, and close/re-entry were exercised on that bilateral path
- No runtime errors and no diagnostic/internal identifiers in captured text

## Mock scope

The browser fixture intercepts only referral/premium endpoints needed to keep this local synthetic flow deterministic:

- `POST /api/referrals/session` → `{ ok: true }`
- `POST /api/referrals` → synthetic referral URL
- `GET /api/referrals?ref=...` → synthetic valid token
- `POST /api/premium-report` participation/verification → synthetic eligible receipt
- `POST /api/premium-report` generation → locally built synthetic premium report
- `POST /api/person-compare` → existing synthetic success/error responses in the test

This does not prove a real Supabase referral store, real cross-browser completion, or production credentials. The actual referral store remained unavailable and fail-closed contract tests were the only live-store check. The fake two-browser script was not counted as evidence.

## Remaining unverified items

- Real Supabase migration/credentials and cross-browser referral completion against an operating project
- Real hand-photo recognition quality and independent evaluation of additional lines
- Main merge and Production deployment (intentionally not performed)

See [`summary.json`](./summary.json) for the machine-readable capture summary. Selected before/after screenshots are retained alongside it.

## Referral integration follow-up

- Integrated source: `416087725a3fda3a208d7c17a34d02e99c7dce25` (`feat/saju-referral-evidence-20261015`)
- Integration merge: `b34a83b`
- Latest test-flow commit: `c93c2a3`
- Integrated verification HEAD before this evidence-only correction: `a0af751b90400979105b78cc76ec16384378d647`
- Production build: `next build --webpack` passed; routes included `/api/referrals`, `/api/referrals/session`, `/api/saju`, and `/api/premium-report`.
- Real Next browser test: `node scripts/test-referral-two-browser.mjs` passed using two isolated Chromium contexts and an isolated local Supabase HTTP adapter.
- Existing result regression: `TEST_BASE_URL=http://127.0.0.1:3104 TEST_EVIDENCE_DIR=/tmp/integration-palm-referral-regression node scripts/test-palm-customer-browser.mjs` passed.
- Referral test server: ephemeral Next port `3197`; the regression server used port `3104`.

The referral test replaces only the Supabase REST/RPC boundary with an in-memory adapter. It does not verify an operating Supabase project, remote migration, or production credentials. No production database or deployment was changed.

## Acceptance handoff

### Completed

- Referral additions are integrated into the verified Next production build and two-context browser flow.
- Existing result-flow regression passed after integration.
- Premium mock regression is UI evidence only; it is distinct from the real Next referral test, whose storage boundary is a local adapter.

### Unverified

- The `relationshipPurposeRequired` value records absence of a default selection, not a blank-submit validation; blank submission remains unverified.
- The relationship-entry wording covers the personal+bilateral result path only.
- Operating Supabase behavior, real photo recognition, and additional-line quality remain unverified.

### Release blockers

- Do not release based on this evidence until the operating Supabase migration/credentials/rollout are separately verified.
- Do not treat synthetic palm fixtures or the local adapter as production-quality evidence.
- Main merge and Production deployment remain intentionally blocked.
