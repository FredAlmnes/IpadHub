---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 04
subsystem: auth
tags: [hono, jose, google-oidc, csrf, tailwind, admin]
requires:
  - phase: 01-02
    provides: approvePairing, device cookie auth, Oslo time helpers, theme tokens
provides:
  - Google OIDC login on /admin with ADMIN_EMAILS allowlist and 30-day admin_session cookie
  - /admin approve form, device list with "Sist sett", two-step revoke, logout
  - /admin/oppsett 9-step setup checklist and docs/ipad-setup.md mirror
affects: [01-08 real Google credentials, later phases adding admin pages]
tech-stack:
  added: []
  patterns: [server-rendered hono/html views with inlined Tailwind via ?inline, injected Google deps for tests, user_id-scoped queries]
key-files:
  created:
    - src/worker/lib/session.ts
    - src/worker/lib/google-oidc.ts
    - src/worker/lib/users.ts
    - src/worker/lib/devices.ts
    - src/worker/lib/last-seen.ts
    - src/worker/middleware/admin-auth.ts
    - src/worker/routes/auth-google.ts
    - src/worker/routes/admin.ts
    - src/worker/views/layout.ts
    - src/worker/views/icons.ts
    - src/worker/views/admin-pages.ts
    - src/worker/views/setup-checklist.ts
    - src/admin/admin.css
    - docs/ipad-setup.md
  modified:
    - src/worker/app.ts
    - src/worker/lib/cookies.ts
key-decisions:
  - "?inline CSS import works in the worker bundle (compiled Tailwind confirmed in dist/ipadhub/index.js), so no client-asset fallback was needed"
  - "Failed login (state/nonce/aud/unverified) all redirect to ?error=failed; only a valid but non-allowlisted account gets ?error=no_access"
requirements-completed: [SEC-01, SEC-03, DISP-10]
duration: 25min
completed: 2026-10-20
---

# Phase 1 Plan 04: Admin login, pairing approval, revoke and setup checklist Summary

Google OIDC login (jose, state+nonce, verified allowlisted e-mail) gives a 30-day admin session; the phone can approve iPad codes, list and revoke devices, and read the 9-step iPad setup checklist.

## Tasks

1. Google OIDC, admin session, adminAuth: test `bff0f27`, feat `b3f896a`
2. Admin pages (login, approve, device list, last seen, inlined CSS): test `a4ea8cc`, feat `076860c`
3. Revoke, logout, oppsett, docs: test `b22c33d`, feat `4029332`

All three tasks followed RED then GREEN. `npm test` (55 tests), `tsc -b` and `vite build` pass.

## Deviations from Plan

None in behavior. Notes:
- `formatLastSeen` yesterday check compares Oslo date keys against `now - 24h`; around DST changeover days this can be off by an hour at the boundary (cosmetic).
- Test for the invalid-state case expects `?error=failed` (matches plan: only not-allowed goes to `no_access`).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model; all listed mitigations (T-01-19..27) are implemented and tested except live Google calls, which await real credentials in plan 01-08.

## Self-Check: PASSED
