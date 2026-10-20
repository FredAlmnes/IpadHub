---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
reviewed: 2026-10-20T00:00:00Z
depth: standard
files_in_scope: 89
files_read: ~60
files_reviewed_note: "Security-sensitive worker, client hooks/lib, service worker, approval script and config read in full. Not read: test files, CSS, icons, Clock.tsx, ModuleGrid.tsx, ModuleFrame.tsx, PlaceholderModule.tsx, tsconfigs, drizzle.config.ts. No tests or tooling run by the reviewer."
findings:
  critical: 0
  warning: 6
  fixed: [WR-03, WR-06]
  info: 5
  total: 11
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-10-20
**Depth:** standard
**Status:** issues_found

## Summary

The security fundamentals hold up under review:
- Device tokens are 256-bit random values stored hashed.
- Everything under `/api` is default-deny, with `/api/pair/*` as the only exception.
- Admin routes use a signed session JWT, an allowlist re-checked on every request, and an Origin-based CSRF check.
- The OIDC flow verifies state, nonce, issuer, audience and `email_verified`.
- The service worker skips `/api`, `/admin` and `/auth`.
- `approve-pairing.mjs` allow-lists every value it puts into SQL (the email regex excludes quotes), so no injection was found.
- No secrets are committed, and `.gitignore` covers `.dev.vars`.

No blockers. The weaknesses are in robustness: an unauthenticated pairing endpoint that can be abused, a pairing hand-off that can lose a device, and a reload loop when storage is unavailable.

## Warnings

### WR-01: Unauthenticated `/api/pair/start` can be used to block pairing and burn D1 writes
**File:** `src/worker/lib/pairing.ts:11-22`, `src/worker/routes/api-pair.ts:13`
**Issue:** No auth and no per-IP rate limit. `MAX_PENDING = 20` is a global cap, so anyone can call it 20 times and hold all slots for 10 minutes; the real iPad then gets 429 and cannot pair. Each call also costs D1 writes on the free tier.
**Fix:** Add Cloudflare rate limiting (WAF rule or the Workers rate-limit binding) keyed on IP for `/api/pair/start`. Consider a per-IP cap instead of a global one.

### WR-02: Pairing hand-off is non-atomic and can leave an orphan device and a lost pairing
**File:** `src/worker/lib/pairing.ts:65-83`, `src/client/features/pairing/PairingScreen.tsx:78-97`
**Issue:** The request is marked `consumed` before the device is inserted. If the insert fails, the pairing is lost. If the poll response is dropped after the server consumed it, the iPad's next poll returns `consumed` and the client silently requests a new code, leaving an active device row nobody holds a cookie for.
**Fix:** Do the claim and the device insert in one `db.batch([...])`, or make the client treat `consumed` after an `approved` poll error as "retry the same poll".

### WR-03: Daily reload loops if localStorage is unavailable — FIXED (d9540e0)
**File:** `src/client/hooks/useAutoReload.ts:18-24, 45-57`
**Issue:** `writeStorage` swallows errors, so `LAST_DAILY_KEY` is never persisted when storage is blocked. The daily check runs on mount and does not use `canReload`, so between 03:30 and 06:00 Oslo the page reloads on every load — a continuous reload loop for 2.5 hours.
**Fix:** Keep an in-memory or sessionStorage fallback for the daily key, or apply `canReload(readLastReloadAt(), nowMs)` before the daily reload with a module-level flag when storage fails.

### WR-04: Approved pairing requests can be redeemed after expiry
**File:** `src/worker/lib/pairing.ts:59-70`
**Issue:** Expiry is only checked for `pending` rows. An `approved` row past `expiresAt` (until cleanup, ~70 min) still issues a device token. Low risk because the poll secret is required, but it contradicts the 10-minute TTL.
**Fix:** Treat `row.expiresAt <= now` as `expired` for `approved` rows too, or extend `expiresAt` on approval deliberately.

### WR-05: Existing user is matched by email only; stored `google_sub` is never compared
**File:** `src/worker/lib/users.ts:15-18`
**Issue:** Login succeeds even if the stored `googleSub` differs from the incoming `sub`. Emails can be recycled or reassigned; the allowlist limits exposure, but the check is cheap.
**Fix:** If `existing.googleSub && existing.googleSub !== input.sub`, reject the login (throw → redirect to `failed`).

### WR-06: Service worker asset cache grows without bound and can store SPA fallback HTML under asset URLs — FIXED (d9540e0)
**File:** `public/sw.js:3-4, 46-56`
**Issue:** The constant cache name `ipadhub-assets-v1` never evicts old hashed assets across deploys on an always-on device. With `not_found_handling: single-page-application`, a missing `/assets/*` URL returns `index.html` with 200, which the SW then caches cache-first under the asset URL — a script request can get HTML back permanently.
**Fix:** Only cache responses whose `content-type` is not `text/html` (and `res.ok`). Prune the assets cache on `activate` or cap the entry count.

## Info

### IN-01: Admin flash messages reflect arbitrary query-string text
**File:** `src/worker/routes/admin.ts:36`, `src/worker/views/admin-pages.ts:72-75, 109-111`
**Issue:** `paired` and `revoked` are rendered from the query string, so a crafted link shows attacker-chosen text to a logged-in admin. It is HTML-escaped (spoofing, not XSS).
**Fix:** Use fixed flags (`?paired=1`) and show the name from the DB.

### IN-02: Session secret has no minimum-strength check
**File:** `src/worker/lib/session.ts:8`, `src/worker/middleware/admin-auth.ts:10-12`
**Issue:** Any non-empty `SESSION_SECRET` is accepted as an HS256 key.
**Fix:** Fail closed if `secret.length < 32`.

### IN-03: Device cookie uses SameSite=Lax although project notes suggest Strict
**File:** `src/worker/lib/cookies.ts:15`
**Issue:** CLAUDE.md suggests SameSite=Strict for the device cookie. Device endpoints are read-only or secret-gated, so risk is low.
**Fix:** Use `Strict` for the device cookie; keep `Lax` for admin and OAuth-state cookies.

### IN-04: `last-seen` "i går" check uses now minus 24h
**File:** `src/worker/lib/last-seen.ts:16`
**Issue:** On DST-change days the Oslo day is 23 or 25 hours, so the label can be wrong for a short window.
**Fix:** Derive yesterday's key from the Oslo date key (as `previousDateKey` in `staleness.ts`); consider sharing one helper.

### IN-05: `deviceAuth` fails the request if the last-seen write fails
**File:** `src/worker/middleware/device-auth.ts:28-31`
**Issue:** A transient D1 error on the throttled `UPDATE` becomes a 500 even though auth succeeded.
**Fix:** Wrap the update in try/catch or use `c.executionCtx.waitUntil`.

---

_Reviewed: 2026-10-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
