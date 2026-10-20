---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 06
subsystem: pwa-reliability
tags: [pwa, service-worker, auto-reload, manifest]
requires: [01-05]
provides: [home-screen-install, daily-version-watchdog-reload, service-worker]
affects: [01-08]
tech-stack:
  added: []
  patterns: [pure reload guard with shared 10-min localStorage guard, hand-written SW]
key-files:
  created:
    - src/client/lib/reload-guard.ts
    - src/client/lib/reload-guard.test.ts
    - src/client/hooks/useAutoReload.ts
    - src/client/sw-register.ts
    - public/manifest.webmanifest
    - public/sw.js
    - public/apple-touch-icon.png
    - public/icons/icon-192.png
    - public/icons/icon-512.png
    - public/icons/icon-maskable-512.png
    - scripts/make-icons.mjs
  modified:
    - src/client/App.tsx
    - src/client/main.tsx
    - index.html
decisions:
  - "useAutoReload takes an extra optional `watchdog` flag (false when unpaired) instead of a sentinel lastSuccessAt"
metrics:
  tasks: 2
  completed: 2026-10-20
---

# Phase 1 Plan 06: PWA install and self-healing Summary

Home Screen PWA (standalone, landscape, black) with a hand-written network-first service worker, plus tested daily 03:30 (Oslo), version-change and 15-minute watchdog reloads all gated by a 10-minute localStorage guard.

## Commits
- 4c17841 feat(01-06): reload guard and useAutoReload
- Task 2 commit: feat(01-06): PWA manifest, icons, Home Screen meta and service worker

## Verification
- reload-guard: 16 tests pass; `npm test` (90 tests), `npx tsc -b`, `npx vite build` pass; dist/client has sw.js, manifest, icons.
- Daily reload is deferred while `getWakeUntil()` is in the future, keyed by Oslo date (once per date, safe on DST repeat night), catch-up allowed until 06:00.

## Deviations from Plan
- Test and implementation were committed together in one feat commit (no separate RED commit); tests were written before implementation and all pass.
- Added optional `watchdog` param to useAutoReload (see decisions).

## Notes
- On-device verification (install, fullscreen, reload behaviour) happens in 01-08. Not deployed.

## Self-Check: PASSED
