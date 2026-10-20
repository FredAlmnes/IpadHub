---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 07
subsystem: display-modules
tags: [providers, staleness, offline, error-boundary, polling]
requires: [01-05]
provides:
  - "getProviders(env) registry (extension point for phases 2-4)"
  - "Per-provider isolated snapshot via Promise.allSettled + safeParse"
  - "staleness lib (moduleState, formatFreshness, isOffline)"
  - "ModuleFrame/ModuleGrid/OfflineMarker in the day layer"
affects: [src/worker/snapshot.ts, src/client/hooks/useSnapshot.ts, DisplayScreen]
tech-stack:
  added: []
  patterns: ["allSettled provider isolation", "server-time + local-elapsed staleness"]
key-files:
  created:
    - src/worker/providers/types.ts
    - src/worker/providers/registry.ts
    - src/worker/providers/not-configured.ts
    - src/worker/providers/demo.ts
    - src/worker/snapshot.test.ts
    - src/client/lib/staleness.ts
    - src/client/lib/staleness.test.ts
    - src/client/features/display/ModuleFrame.tsx
    - src/client/features/display/ModuleGrid.tsx
    - src/client/features/display/PlaceholderModule.tsx
    - src/client/features/display/OfflineMarker.tsx
  modified:
    - src/worker/snapshot.ts
    - src/client/hooks/useSnapshot.ts
    - src/client/icons.tsx
    - src/client/features/display/DisplayScreen.tsx
    - .dev.vars.example
decisions:
  - "STALE_AFTER_SEC constant removed; each provider owns its staleAfterSec"
  - "Thrown provider messages never forwarded; error is the fixed string 'unavailable'"
requirements-completed: [DISP-04, DISP-05, DISP-06]
duration: ~15 min
completed: 2026-10-20
---

# Phase 1 Plan 07: Modules that show their age and survive failures

Provider registry with allSettled isolation, a dev-only demo provider, client staleness/offline derivation, ModuleFrame with ErrorBoundary in a 2x2 grid, a global «Frakoblet» marker and hardened 30 s polling.

## Commits
- 1f6a937 test: failing snapshot tests
- 1bf477a feat: registry, allSettled, demo provider
- 7c844ee test: failing staleness tests
- 051e969 feat: staleness lib and polling hardening
- 7329348 feat: ModuleFrame, grid, offline marker

## Deviations from Plan

- [Rule 3 - Blocking] Added `providers/not-configured.ts` (helper shared by registry and demo) to avoid a circular import between registry.ts and demo.ts.
- `useSnapshot` now returns `SnapshotQuery` (UseQueryResult plus `receivedAtLocal`); DisplayScreen prop type updated accordingly.
- The manual DEMO_MODULES=1 browser run (pair + `npm run dev`) was NOT performed in this worktree agent; the same states are covered by automated tests (snapshot.test.ts demo case, staleness.test.ts). Visual check is left to the 01-08 deploy/verification step. `.dev.vars` untouched (DEMO_MODULES remains 0 in the example, absent from wrangler.jsonc).

## Verification
`npx tsc -b`, `npx vite build`, `npm test` (88 tests) all pass.

## Known Stubs
PlaceholderModule («Kommer snart») in every slot is intentional; phases 2-4 replace it per module.

## Self-Check: PASSED
