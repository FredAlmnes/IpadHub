---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 08
subsystem: infra
tags: [cloudflare, google-oauth, deploy, verification]
requires: [01-03, 01-04, 01-05, 01-06, 01-07]
provides:
  - Production Google OAuth client ("In production") with redirect URIs for workers.dev and localhost
  - Four Worker secrets set (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET, ADMIN_EMAILS)
  - Complete phase 1 deployed (version 948bc6b6-fdf8-4184-900a-4203115e0552)
  - README «Produksjon» section with secret names, redirect URIs and emergency pairing
key-files:
  modified: [README.md]
requirements-completed: [DISP-01, DISP-02, DISP-03, DISP-04, DISP-05, DISP-06, DISP-07, DISP-08, DISP-09, DISP-10, SEC-01, SEC-02, SEC-03]
completed: 2026-10-20
---

# Phase 1 Plan 08: Go-live Summary

Google login wired in production and the full phase deployed to https://ipadhub.fredrik-almnes.workers.dev; all production smoke checks pass and a browser walkthrough on the Mac looked good. On-device iPad checks are pending (owner does them at home).

## Tasks

1. **Google OAuth client and secrets** (checkpoint:human-action): done by the user. Orchestrator verified `npx wrangler secret list` shows all four names and that `.dev.vars` is untracked. User confirmed («ferdig») after being asked to publish the consent screen to «In production».
2. **Deploy and smoke test** (auto): `npm test` 104/104, typecheck clean, `db:migrate:remote` no pending migrations, `npm run deploy` OK. README «Produksjon» section committed in fcc115f (no secret values; checked for `GOCSPX-`).
3. **On-device verification** (checkpoint:human-verify): partially done, see below.

## Production smoke results (status codes and headers only)

| Check | Result |
|---|---|
| a. GET / | 200 |
| a. GET /manifest.webmanifest | 200, application/manifest+json, contains "standalone" |
| a. GET /sw.js | 200 |
| a. GET /apple-touch-icon.png | 200, image/png |
| b. GET /api/snapshot (no cookie) | 401, cache-control no-store |
| b. GET /api/whatever | 401, no-store |
| c. GET /admin | 302 → /admin/login |
| c. GET /admin/login | 200, contains «Logg inn med Google» |
| d. GET /auth/google/start | 302 → accounts.google.com, client_id ends in .apps.googleusercontent.com, correct redirect_uri, scope "openid email", no access_type, oauth_state cookie HttpOnly+Secure |
| e. POST /admin/pair/approve, Origin evil.example | 403 (Origin check) |

## On-device verification (Task 3)

The iPad was not available. The owner ran the browser-testable steps in a desktop browser on the Mac (admin login with Google, pairing a browser display, day view) and reported «det ser bra ut» without itemising each step.

| Step | Status |
|---|---|
| 1. Admin login with Google | Passed on Mac (owner's overall OK). Rejection of a non-allowlisted account not explicitly reported |
| 2. Home Screen install, fullscreen | **Pending: iPad** |
| 3. Pairing via phone/admin | Passed on Mac browser (owner's overall OK) |
| 4. Day view (clock, date, week, four slots) | Passed on Mac browser (owner's overall OK) |
| 5. Reopen stays paired | **Pending: iPad (as Home Screen app)** |
| 6. Wake Lock keeps screen on | **Pending: iPad** |
| 7. Offline marker | Not explicitly reported; covered by unit tests |
| 8. Night mode via SQL window | Not run (owner did not request the SQL); covered by unit tests |
| 9. Revoke → back to pairing | Not explicitly reported; covered by e2e tests |
| 10. Setup checklist (Guided Access with Touch, brightness Shortcut) | **Pending: iPad** |
| 11. Night unattended | **Pending: iPad** |

iPad model and iPadOS version: not yet recorded (owner confirmed iPadOS 18.4+ during project setup).

Pending items are tracked in `01-HUMAN-UAT.md` once phase verification runs.

## Deviations

- README commit made in Task 2 (plan said not to commit there) so the worktree change survived; no functional difference.
- Task 3 only partially verified because the iPad was not at hand; remaining items deferred to the owner at home rather than blocking.

## Self-Check: PASSED (automated parts); on-device iPad checks pending
