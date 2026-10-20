---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 02
subsystem: auth
tags: [pairing, device-cookie, snapshot, zod, clock, hono, react]
requires: [01-01]
provides:
  - POST /api/pair/poll issuing a single-use HttpOnly device cookie
  - GET /api/snapshot with shared Zod contract (src/shared/contract.ts)
  - Throttled last-seen with sliding cookie renewal
  - App state machine (clock vs pairing, exact 401 un-pairs)
  - Oslo clock (osloClock/osloDateKey) and minimal display screen
  - pair:approve owner CLI and README local run
affects: [01-03, 01-05, 01-07]
tech-stack:
  added: []
  patterns: [conditional UPDATE ... RETURNING single-use claim, token only in Set-Cookie, formatToParts with h23]
key-files:
  created: [src/shared/contract.ts, src/shared/oslo-time.ts, src/shared/oslo-time.test.ts, src/worker/snapshot.ts, src/worker/routes/api-snapshot.ts, src/worker/pair-flow.e2e.test.ts, src/client/hooks/useSnapshot.ts, src/client/hooks/useNow.ts, src/client/features/display/DisplayScreen.tsx, src/client/features/display/Clock.tsx, scripts/approve-pairing.mjs, README.md]
  modified: [src/worker/lib/pairing.ts, src/worker/routes/api-pair.ts, src/worker/middleware/device-auth.ts, src/worker/app.ts, src/client/api.ts, src/client/App.tsx, src/client/features/pairing/PairingScreen.tsx, package.json]
key-decisions:
  - "App passes a memoized onPaired (useCallback) so PairingScreen's poll loop effect is not restarted by parent re-renders"
requirements-completed: [SEC-01, SEC-02, SEC-03]
duration: 20min
completed: 2026-10-20
---

# Phase 1 Plan 02: Skeleton slice B Summary

**Approved iPad receives its HttpOnly device cookie from the pair poll response, shows a large Oslo clock and polls /api/snapshot; an exact 401 (revoked device) returns it to a fresh pairing code.**

## Tasks and commits

| Task | Commit |
|------|--------|
| 1 RED: failing pair-flow e2e test | 0de1722 |
| 1 GREEN: poll/approve, cookie, snapshot, last-seen | 9564360 |
| 2 App state machine, pairing poll, clock | 81b786a |
| 3 Approve CLI + README | ffdd37f |

## Verification

- `npm test`: 23/23 pass (pair-flow behaviors 1-9, oslo-time DST/date vectors, pair-start). `npm run typecheck` and `npx vite build` pass.
- CLI rejects code with `0` and email with `'` with exit 1 before any wrangler call.
- Local full-stack transcript (http://localhost:5173, `npm run dev`):
  - `POST /api/pair/start` -> `{"code":"G2AP-P6N9",...}`
  - poll -> `{"status":"pending"}`
  - `node scripts/approve-pairing.mjs --local --code G2AP-P6N9 --email owner@example.com` -> `Godkjent: Stue-iPad`
  - poll (curl -c jar) -> `{"status":"approved"}` (cookie stored over http; deviceCookieOptions omits Secure on http)
  - `GET /api/snapshot` with cookie -> HTTP 200, body with `serverTime`, `version`, config `23:00/06:00 Europe/Oslo`, modules bus/weather/calendar/mail `not_configured`.
- Browser/visual check of the clock and pairing fade was not run by this agent.

## Deviations from Plan

None of substance. Minor: `onPaired` is memoized in App (needed so the pairing loop effect is stable); DisplayScreen ignores its `query` prop for now (modules arrive in 01-07).

## Known Stubs

- `src/client/features/display/DisplayScreen.tsx`: `data-region="modules"` section is empty and the `query` prop unused, intentionally; plan 01-07 fills it. Date/week line on the clock comes in 01-05.
- Snapshot modules are all `not_configured` by design until providers exist.

## Threat Flags

None beyond the plan's threat model (T-01-07 to T-01-13 mitigated as specified).

## Self-Check: PASSED
