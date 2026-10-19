# Project Research Summary

**Project:** IpadHub
**Domain:** Always-on home info display (iPad PWA, single user, Norway) with a cloud backend-for-frontend
**Researched:** 2026-10-19
**Confidence:** MEDIUM (versions and some vendor terms verified; iOS behaviour, Google OAuth policy and Cloudflare limits come from training knowledge; voice is LOW)

## Executive Summary

IpadHub is a glanceable wall/desk dashboard (bus departures, weather, calendar, AI-selected follow-up email) running as a Home Screen PWA on an iPad. The established way to build this is a dumb display client plus a thin edge backend (BFF). The backend holds all secrets and Google tokens, polls upstream APIs, caches normalized payloads, and serves one cheap snapshot endpoint that the iPad polls. The client never talks to Entur, MET, Google or Claude. Polling, not push, is the right transport everywhere in v1 because it self-heals after iPad sleep and Wi-Fi drops.

Recommended approach: a Vite + React + TypeScript SPA served from Cloudflare Workers (static assets), with a Hono API in the same Worker, D1 (Drizzle) for durable data, KV or D1 for cached payloads, and Cron Triggers for slow modules. Vercel Hobby is ruled out because its cron runs at most once per day. Auth is a paired-device token (HttpOnly cookie, hashed server-side), not an interactive login. Every table and cache key is scoped by `user_id` from day one, and providers are pure `(UserContext) -> DTO` functions so the voice assistant can later reuse them as tools.

The main risks are operational, not algorithmic. (1) Google OAuth in "Testing" status expires refresh tokens after 7 days, so the consent screen must be "In production" (unverified) before auth code is written. (2) The iPad sleeping or the page freezing makes stale bus times look plausible, so staleness UI, a watchdog, a daily reload and an overnight soak test belong in Phase 1. (3) Private email on a network-reachable display requires authenticated data endpoints from the start. (4) LLM email triage must classify each message once, send minimal text, and constrain output to a schema. (5) Voice with a wake word in iPad Safari is the biggest feasibility risk and needs a go/no-go spike.

## Key Findings

### Recommended Stack
Single-vendor Cloudflare deployment: one Worker serves the SPA, the API and the scheduled jobs (see STACK.md).

**Core technologies:**
- Vite 8 + React 19 + TypeScript (pin 5.x; registry shows 7.x): static PWA SPA, no SSR need
- TanStack Query 5: polling, refetch on reconnect/focus, SWR, optimistic mutations later
- Tailwind 4 + vite-plugin-pwa: large-type layouts, standalone manifest
- Cloudflare Workers + Hono 4 + Zod 4: hosting, typed API, validation of every upstream payload
- Cron Triggers: scheduled refresh of weather, calendar, mail (verify free-plan limits)
- D1 + Drizzle: users, devices, encrypted Google refresh token, mail verdicts, shopping items; KV (or D1) for cached payloads
- jose + WebCrypto AES-GCM: device/session tokens and refresh-token encryption; key in Wrangler secrets
- Plain `fetch` for Entur (`ET-Client-Name`), MET (identifying User-Agent, 4-decimal coords, honour `Expires`) and Google REST; no `googleapis`, no Apollo
- `@anthropic-ai/sdk` with a Haiku-class model for triage (verify model ID at implementation)

Critical requirement: Google OAuth consent screen "In production" (unverified is fine for one user), or refresh tokens die after 7 days.

### Expected Features
**Must have (table stakes, v1):**
- PWA fullscreen shell; large clock with date and week number (nb-NO, 24h, no seconds)
- Bus departures for one stop/quay: line, destination, minutes, real-time vs scheduled marker, cancellations
- Weather: now, next 8-12 h, precipitation, hi/lo (MET)
- Today's Google Calendar events, all-day separated, now/next highlight, tomorrow's first event in the evening
- Self-refresh, per-module staleness/offline indication, per-module error isolation
- Night mode (clock-only dark view, Oslo-time based) with burn-in pixel drift
- Secure display access via paired device token

**Should have (differentiators):**
- AI-flagged "needs follow-up" email with a one-line reason (main differentiator; build last in v1)
- "Leave in N min" from a configured walking time; weather hint (umbrella / rain at HH:MM)
- Synced shopping list with phone PWA and Siri Shortcut endpoint (post-v1)

**Defer (v2+):**
- Voice assistant with wake word (spike first; tap-to-talk fallback)
- NRK news, photo slideshow (Google Photos API restricted), context-aware layout, calendar-to-travel linkage
- Anti-features: multi-user in v1, wall settings UI, smart-home control, inbox list or unread counts, multi-stop transit

### Architecture Approach
A BFF with a single `GET /api/snapshot` (ETag/304, ~30 s client poll) returning `{data, fetchedAt, status}` per module plus `serverTime` and a build version. The API layer authenticates a device token, resolves `user_id`, reads module caches in parallel, and serves stale-while-revalidate via `ctx.waitUntil`. Slow modules refresh on cron. Transit refreshes on request via SWR with a 15-30 s TTL (rather than a 1-minute cron, so nothing is fetched while nobody is polling, e.g. at night). Mail verdicts are persisted per Gmail message ID and never recomputed. Multi-user readiness is cheap: `user_id` on every row, `(user_id, module)` cache keys, per-user config in D1, `UserContext` passed to providers.

**Major components:**
1. Display client (PWA shell): renders snapshot, clock, night mode, drift, wake lock, stale indicators, version-triggered reload
2. API layer + auth middleware: device-token auth, snapshot aggregation, scoped API tokens for Siri later
3. Module providers (transit, weather, calendar, mail): pure functions to small DTOs, each with its own TTL
4. Token vault: encrypted Google refresh token, mints access tokens, handles `invalid_grant`
5. Mail classifier: new messages only, minimal text, schema-bound Claude output, stored verdicts
6. Scheduler + cache + D1 store
7. Later: shopping sync hub and voice pipeline (wake word/VAD, server STT, Claude with tools, TTS)

### Critical Pitfalls
1. **Google OAuth "Testing" 7-day token expiry.** Publish "In production" unverified; use only `calendar.readonly` and `gmail.readonly`; request `access_type=offline&prompt=consent`; handle `invalid_grant` with a visible re-auth state while showing stale data.
2. **iPad sleeps or page freezes, and stale data looks current.** Auto-Lock Never plus Guided Access as the foundation; Wake Lock only as an aid (standalone support fixed in iOS 18.4; re-acquire on `visibilitychange`); per-widget `lastSuccessfulFetch`; visible data age; watchdog reload; overnight soak test.
3. **Memory growth and stale service-worker shell.** Replace state rather than append; `AbortController` timeouts; daily ~03:30 reload; `/version.json` check; network-first for shell and API, never cache-first for `/api/*`.
4. **Private data exposed.** Device-token cookie set from inside the installed PWA, 401 on all data endpoints, secrets only in Wrangler, scoped revocable token for Siri, optional privacy mode for subjects.
5. **LLM triage privacy, cost, prompt injection.** Classify once per message ID; send sender, subject and trimmed snippet only; pre-filter promotions/social; schema-constrained output rendered as plain text; daily call cap and provider spend limit; no tools in the triage context; fail open to a sender list.

Also relevant: Europe/Oslo DST handling (the October 2026 change is days away, so test it), Entur/MET header and caching rules, Gmail query design and defining "needs follow-up", backoff with jitter on network recovery.

## Implications for Roadmap

Suggested structure follows the ARCHITECTURE build order, with the voice spike pulled earlier.

### Phase 1: Backend Skeleton, Device Auth and Display Shell
**Rationale:** Everything depends on auth and the snapshot contract. The always-on pitfalls can only be validated once the shell exists.
**Delivers:** Worker + Hono + D1 schema with `user_id`; device pairing and token cookie; snapshot endpoint skeleton with per-module status; PWA manifest and standalone shell; clock with Oslo-time helpers; night mode with pixel drift; polling framework with staleness/offline UI and backoff; wake lock; version check and daily reload; touch-lockdown CSS; setup checklist (Auto-Lock, Guided Access, brightness Shortcut).
**Addresses:** shell, clock, stale/offline state, error isolation, night mode, burn-in, secure access.
**Avoids:** pitfalls 2, 3, 4, 5, 7, 12, 13, 14. Add `.gitignore` for secrets.

### Phase 2: Transit and Weather (stateless modules)
**Rationale:** No OAuth, so this proves the provider interface, SWR cache and snapshot contract, and delivers daily value fast.
**Delivers:** Entur bus module (quay filter, real-time marker, cancellations, "leave in N min"); MET weather module (hourly strip, precipitation, hi/lo, umbrella hint, attribution); per-user config for stop and coordinates.
**Avoids:** pitfalls 8, 9, 10.

### Phase 3: Google OAuth, Token Vault and Calendar
**Rationale:** First security-sensitive piece. The consent-screen decision must precede any auth code. Calendar is the simplest consumer of the vault.
**Delivers:** `/auth/google` flow; encrypted refresh token; access-token minting; `invalid_grant` re-auth state; calendar module (today and tomorrow, `singleEvents`, all-day handling, midnight rollover, chosen calendars, hide declined).
**Avoids:** pitfalls 1, 10. Ends with a 7+ day run to confirm tokens survive.

### Phase 4: Email Triage with Claude (ships v1)
**Rationale:** Highest-value differentiator, but it depends on the vault and carries privacy and cost risk, so it comes last and the display is useful without it.
**Delivers:** Gmail query and cursor; trimmed snippets; label pre-filter and sender blocklist; Claude Haiku-class classification with Zod-validated schema; `mail_verdicts` table; cron refresh; daily cap; removal of read/replied items; Norwegian reasons; fail-open fallback; privacy-mode option.
**Avoids:** pitfalls 6, 11. Decide what "needs follow-up" means and record the LLM data-retention decision in PROJECT.md first.

### Phase 5: Shopping List, Phone Route and Siri
**Rationale:** Needs auth and D1, and introduces a second client type and scoped tokens. A coherent post-v1 unit.
**Delivers:** Row-level items with tombstones; `/list` PWA route; optimistic mutations; 5-10 s polling while visible; scoped write-only API token and Siri Shortcut endpoint.
**Avoids:** pitfall 15. Add Durable Objects push only if polling feels slow.

### Phase 6: Voice Assistant (gated)
**Rationale:** Highest risk. Depends on provider functions (Phases 2-4) and the shopping store (Phase 5).
**Delivers:** After a go/no-go gate only: wake word or tap-to-talk, server STT, Claude with tool use over provider functions, TTS.
**Avoids:** pitfalls 16, 17 (separate contexts; no raw email text in the assistant context).

### Phase 7 (optional): Extras
News (NRK RSS) and photo slideshow as new providers plus UI slots. No architecture change.

### Phase Ordering Rationale
- Auth and the snapshot contract are the dependency root. Stateless modules prove the pattern before OAuth complexity.
- Google consent-screen status is decided at the start of Phase 3, before code, because it silently breaks the display after a week.
- Email is last in v1 because it is the riskiest v1 item.
- Run a short voice feasibility spike in parallel with Phases 2-3 (iPad Safari mic persistence, Porcupine/openWakeWord, autoplay), so Phase 6 scoping is informed early.
- Soak tests (overnight, then 7+ days) are acceptance criteria for Phases 1 and 3, not separate phases.

### Research Flags
Needs deeper research during planning:
- **Phase 6 (Voice):** LOW confidence. Safari/PWA mic behaviour, wake-word licensing and Norwegian support, STT choice, autoplay after reload.
- **Phase 3 (Google OAuth):** verify the current unverified-production policy, refresh-token longevity and `gmail.readonly` behaviour on a personal account.
- **Phase 1 (Shell/Auth):** verify Wake Lock in standalone mode on the actual iPad's iPadOS version, cookie/storage separation between Safari and the installed PWA, and Cloudflare free-tier limits (cron count, D1, KV writes, CPU).
- **Phase 4 (Email):** verify the Claude model ID and data-retention terms; design prompt and schema.

Standard patterns (skip research-phase):
- **Phase 2:** documented APIs with known rules; only look up the NSR quay ID.
- **Phase 5:** standard CRUD plus Shortcuts; verify the Shortcut POST flow.
- **Phase 7:** simple providers.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Versions from the npm registry, plus Vercel/MET/Entur terms fetched 2026-10-19. Cloudflare limits and Google policy are from training knowledge. Vite 8 plugin compatibility and the TS pin need confirming at install. |
| Features | MEDIUM | Based on knowledge of competing products, with no live verification. Consistent with PROJECT.md. |
| Architecture | MEDIUM | Well-known BFF/SWR patterns, internally consistent. iOS PWA storage and wake-lock details are marked VERIFY. |
| Pitfalls | MEDIUM | Google token expiry and API terms are well documented. iOS behaviour and free-tier limits are version-dependent. |

**Overall confidence:** MEDIUM

### Gaps to Address
- Transit refresh strategy: SWR on request with a 15-30 s TTL (not a 1-minute cron). Confirm against Worker CPU and request limits in Phase 2.
- iPad model and iPadOS version: determines Wake Lock reliability (needs 18.4+), OLED vs LCD burn-in risk and charge-limit options. Check on the device in Phase 1.
- Cloudflare free-tier limits (cron triggers, D1 rows, KV writes, ~10 ms CPU per request) against the polling design: verify in Phase 1.
- Google unverified-production behaviour for `gmail.readonly`: verify before writing auth code in Phase 3.
- Definition of "needs follow-up" (unread and important vs unanswered sent mail): decide with the user at the start of Phase 4.
- LLM provider data-retention terms and categories never sent (banks, health): record in PROJECT.md.
- Voice: wake word engine, free-tier licence, Norwegian support, mic permission persistence. Spike with go/no-go.
- Google Photos access for a future slideshow is restricted. Pick another source if built.
- Display auth choice: device token recommended; Cloudflare Access only for admin routes.

## Sources

### Primary (HIGH confidence)
- Vercel Cron limits (Hobby once per day, updated 2026-07-15): https://vercel.com/docs/cron-jobs/usage-and-pricing
- Entur Journey Planner v3 (`ET-Client-Name`): https://developer.entur.org/pages-journeyplanner-journeyplanner
- MET Norway terms of service: https://api.met.no/doc/TermsOfService
- npm registry package versions, queried 2026-10-19

### Secondary (MEDIUM confidence)
- WebKit bug 254545 (Wake Lock in Home Screen web apps, fixed in iOS 18.4): https://bugs.webkit.org/show_bug.cgi?id=254545
- Google OAuth "Testing" 7-day refresh-token expiry and Gmail restricted scopes (training knowledge; verify in Cloud console)
- Cloudflare Workers/D1/KV/Cron limits (training knowledge; verify at https://developers.cloudflare.com/workers/platform/limits/)
- Product knowledge of MagicMirror, DAKboard, Home Assistant, Skylight, Echo Show, Nest Hub

### Tertiary (LOW confidence)
- Picovoice Porcupine web, openWakeWord WASM ports, Web Speech API in Safari standalone mode: licensing, Norwegian support and stability not confirmed

---
*Research completed: 2026-10-19*
*Ready for roadmap: yes*
