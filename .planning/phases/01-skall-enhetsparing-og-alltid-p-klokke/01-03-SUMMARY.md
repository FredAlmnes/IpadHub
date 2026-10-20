---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
plan: 03
subsystem: infra
tags: [cloudflare, workers, d1, deploy]
requires: [01-02]
provides:
  - Deployed Worker at https://ipadhub.fredrik-almnes.workers.dev
  - Remote D1 database ipadhub with migrations applied
key-files:
  modified: [wrangler.jsonc, README.md]
metrics:
  completed: 2026-10-20
---

# Phase 1 Plan 03: Cloud deploy Summary

Skeleton deployed to Cloudflare workers.dev with remote D1; full pairing verified against the live URL.

**Deployed URL:** https://ipadhub.fredrik-almnes.workers.dev (needed for the Google redirect URI in plan 01-08)
**D1:** `ipadhub`, database_id 0b37f539-fac4-45b5-a501-afc69284bf07 (region WEUR, not a secret).

## Tasks

1. Cloudflare account and wrangler login: done by the user (checkpoint:human-action), no files.
2. Remote D1, migrations, deploy, smoke test: commit bb27455.

## Smoke test results (status codes only)

- GET / : 200, contains `<div id="root">`
- GET /api/snapshot without cookie: 401, `cache-control: no-store`
- GET /api/nope: 401
- Pairing: pair/start, CLI approve with --remote, pair/poll returned `approved` and set a `device` cookie (HttpOnly, Secure); snapshot with cookie: 200 (serverTime, Europe/Oslo config)
- Cleanup: smoke user/devices/pairing rows deleted; remote count of smoke user = 0
- `d1 migrations list --remote`: no migrations to apply
- GET /admin returns 500 without SESSION_SECRET (fails closed, expected until secrets are set in plan 01-08)

## Deviations from Plan

None. The vite plugin layout deployed without changes. No secrets were set.

## Self-Check: PASSED
