---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 01
subsystem: infra
tags: [vite, react, hono, cloudflare-workers, d1, drizzle, vitest, pairing]
requires: []
provides:
  - Full-stack scaffold (Vite + React SPA served by one Hono Worker, D1/Drizzle, vitest pure+worker projects)
  - POST /api/pair/start issuing hashed, expiring, capped pairing codes
  - Default-deny deviceAuth on /api/* (except /api/pair/*) and no-store on all /api responses
  - Pairing screen (S3) showing a real server-issued code
affects: [01-02, 01-03, 01-04]
tech-stack:
  added: [react 19.3.1, vite 8.3.4, hono 4.13.13, drizzle-orm 0.45.4, zod 4.6.7, jose 6.2.12, tailwind 4.3.3, vitest 5.0.5, wrangler 4.151.2]
  patterns: [default-deny API middleware, SHA-256-only secret storage, rejection-sampled codes]
key-files:
  created: [wrangler.jsonc, vite.config.ts, vitest.config.ts, src/worker/app.ts, src/worker/db/schema.ts, drizzle/0000_init.sql, src/worker/lib/tokens.ts, src/worker/lib/pairing.ts, src/worker/middleware/device-auth.ts, src/worker/pair-start.e2e.test.ts, src/client/features/pairing/PairingScreen.tsx, src/client/api.ts]
  modified: [.gitignore]
key-decisions:
  - "Worker vitest project works with the wrangler.jsonc assets block as is (no inline fallback needed)"
requirements-completed: [SEC-01, SEC-02]
duration: 15min
completed: 2026-10-20
---

# Phase 1 Plan 01: Skeleton slice A Summary

**Vite + React SPA on a single Hono Worker with D1/Drizzle, where opening the app shows a real pairing code (stored only as SHA-256) and every other /api route is default-deny 401.**

## Tasks and commits

| Task | Commit |
|------|--------|
| 1 Scaffold + failing e2e test (RED) | 4ba218c |
| 2 Schema, migration, tokens, pair/start, deviceAuth (GREEN) | 241083a |
| 3 Pairing screen | 5af5055 |

## Verification

- `npx tsc -b`, `npx vite build` pass; `npx vitest run` 7/7 pass (behaviors A-G).
- Local migration `0000_init.sql` applied (`wrangler d1 migrations list ipadhub --local` shows applied).
- slopcheck on typescript, @types/react, @types/react-dom: all OK. No lucide-react, vite-plugin-pwa or jsdom installed.
- Manual dev-server smoke (browser showing the code) was not run in this agent; not blocking.

## Deviations from Plan

**1. [Rule 3 - Blocking] .gitignore ignored .dev.vars.example.** The pattern `.dev.vars.*` swallowed the example file; added `!.dev.vars.example`. `.dev.vars` is still ignored.

**2. [Rule 1 - Bug] Test isolation.** The plugin did not isolate D1 storage between tests in one file (test B saw rows from A). Added a `beforeEach` that clears `pairing_requests` in the test file.

**3. Minor.** `passWithNoTests` is set at the vitest root (not in the project) so the empty `pure` project does not fail; `slopcheck` was run per package since it takes one package at a time; `drizzle/.gitkeep` was used for Task 1 (so `readD1Migrations` finds the dir) and removed once the migration existed.

## Known Stubs

None. PairingScreen keeps `pollSecret` in state without using it; polling and the approved state are scheduled for plan 01-02.

## Threat Flags

None beyond the plan's threat model.

## Self-Check: PASSED
