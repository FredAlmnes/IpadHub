---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 05
subsystem: ui
tags: [oslo-time, night-mode, wake-lock, burn-in, react]
requires:
  - phase: 01-02
    provides: Clock, useNow, DisplayScreen, PairingScreen, App
provides:
  - Oslo date label and ISO week (DST/UTC-boundary tested)
  - Night mode with 3 s crossfade and 90 s tap-to-wake
  - Burn-in drift for night clock, day layout and pairing screen
  - Screen wake lock hook
  - wake-window shared state for auto-reload (01-06)
affects: [01-06, 01-08]
key-files:
  created:
    - src/client/lib/night-mode.ts
    - src/client/lib/drift.ts
    - src/client/lib/wake-window.ts
    - src/client/hooks/useNightMode.ts
    - src/client/hooks/useDrift.ts
    - src/client/hooks/useWakeLock.ts
    - src/client/features/display/NightClock.tsx
  modified:
    - src/shared/oslo-time.ts
    - src/client/features/display/Clock.tsx
    - src/client/features/display/DisplayScreen.tsx
    - src/client/features/pairing/PairingScreen.tsx
    - src/client/App.tsx
key-decisions:
  - "Layers fade by opacity; visibility flips to hidden via delayed CSS transition after the fade, modules stay mounted"
requirements-completed: [DISP-02, DISP-03, DISP-07, DISP-08]
duration: 15min
completed: 2026-10-20
---

# Phase 1 Plan 05: Clock date/week, night mode, drift, wake lock Summary

Pure tested Oslo date/week/night/drift logic wired into a crossfading day/night display with tap-to-wake, burn-in drift and a self-re-acquiring wake lock.

## Tasks
1. Pure libs with tests (RED a744246, GREEN c865eaf)
2. UI wiring (see git log, feat(01-05) date/week, night layer...)

## Deviations from Plan
None. `src/client/index.css` needed no change (backgrounds already #000, no new keyframes). Hooks that need DOM (night/drift/wake lock) have no unit tests; only the pure logic does, as planned.

## Verification
`npx tsc -b`, `npx vite build`, `npx vitest run --project pure` (26 tests) pass. Worker test project not run (untouched). Visual iPad check deferred to 01-08.

## Known Stubs
None.

## Self-Check: PASSED
