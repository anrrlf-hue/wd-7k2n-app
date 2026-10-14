# Integrated palm/customer-flow verification

This directory preserves the synthetic browser evidence produced on the integration branch. It is evidence for the integrated UI/API flow only; it is not a production or customer-data verification.

## Provenance

- Branch: `integration/saju-product-quality-20261015`
- Final repository commit: `2c0639184b895ddc5d7e36b030efa26900cc8abd`
- App server source/build observed before the test-only final commit: `a8ba23e` (the final commit only stabilizes the browser fixture)
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
- Relationship entry after the personal/bilateral result
- Required relationship purpose, successful result, error retry, and close/re-entry
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

- Real Supabase migration/credentials and cross-browser referral completion
- Real photo-recognition input; the browser evidence uses synthetic palm fixtures
- Main merge and Production deployment (intentionally not performed)

See [`summary.json`](./summary.json) for the machine-readable capture summary. Selected before/after screenshots are retained alongside it.
