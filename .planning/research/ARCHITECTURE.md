# Architecture Patterns

**Domain:** Always-on iPad home info dashboard (PWA client + thin cloud BFF)
**Researched:** 2026-10-19
**Confidence:** MEDIUM. Based on well-known patterns and API behavior from training knowledge. No live doc verification was done in this pass. Items marked VERIFY should be checked in phase-level research.

## Recommended Architecture

One stateless-ish edge backend (BFF) sits between a dumb display client and all third-party APIs. The client never talks to Entur, MET, Google or Claude. It talks only to the BFF, and mostly to a single endpoint that returns a precomputed snapshot.

```
                       +--------------------------------------------+
                       |            Cloud (Cloudflare Workers)      |
 iPad (PWA, kiosk)     |                                            |
 +----------------+    |  +-----------+     +-------------------+   |    Entur JourneyPlanner (GraphQL)
 | Dashboard UI   |<-->|  | API layer |<--->| Module providers  |<--+--> MET Locationforecast
 | (static shell, |    |  | /api/*    |     |  transit          |   |    Google Calendar API
 |  polls snapshot|    |  | auth mw   |     |  weather          |   |    Gmail API (readonly)
 |  w/ ETag)      |    |  +-----+-----+     |  calendar         |   |    Claude API (classifier, later voice LLM)
 +----------------+    |        |           |  mail (+classifier)|  |
 Phone PWA (list)<---->|        v           +---------+---------+   |
 Siri Shortcut ------->|  +-----------+               |             |
 (HTTPS + token)       |  | Cache     |<--------------+             |
                       |  | KV / DO   |   Cron Triggers refresh     |
                       |  +-----------+   (write-through)           |
                       |  +-----------+                             |
                       |  | D1 (SQL)  |  users, devices, oauth      |
                       |  |           |  tokens (encrypted),        |
                       |  |           |  shopping items, mail verdicts|
                       |  +-----------+                             |
                       +--------------------------------------------+
 Later: voice pipeline (client wake word + VAD -> /api/voice -> STT -> Claude tools -> TTS -> audio back)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Display client (PWA shell) | Render snapshot, clock, night mode, burn-in shifting, wake lock, offline/stale indicators, self-reload on new version | BFF only (`GET /api/snapshot`) |
| Phone/shopping client (later) | Same PWA, different route; shopping list CRUD | BFF only |
| API layer / auth middleware | Route, authenticate device/user token, resolve `user_id`, shape responses | Clients, providers, store |
| Module providers (transit, weather, calendar, mail) | Each: fetch upstream, normalize to a small display DTO, declare own TTL. No cross-provider dependencies | Upstream APIs, cache, store |
| Mail classifier | Fetch new message metadata/snippets, call Claude once per message, persist verdict, never re-classify | Gmail provider, Claude, D1 |
| Scheduler (Cron Triggers) | Refresh slow modules (calendar, mail, weather) on a schedule so request path stays cheap | Providers, cache |
| Cache | Short-lived normalized module payloads keyed by `(user_id, module)` (KV) | Providers, API layer |
| Store (D1) | Durable data: users, devices, Google refresh tokens (encrypted), mail verdicts, shopping items, settings | API layer, providers |
| Token vault | Holds Google refresh token, mints access tokens on demand, encrypts at rest (secret in Worker env) | Calendar/mail providers |
| Shopping sync hub (later) | CRUD + change notification to open clients | Store, clients (poll first, DO/WebSocket optional) |
| Voice pipeline (later) | Audio in, STT, LLM with tool calls against the same providers/store, TTS out | Client, STT/TTS vendors, Claude, providers, store |

Rule: providers are pure "(user context) -> DTO" functions. The voice agent, the snapshot endpoint and the cron job all call the same functions. This is what makes "Når går neste buss?" cheap to add later.

### Data Flow

Read path (dashboard):
1. Client polls `GET /api/snapshot` (ETag/If-None-Match; 304 when unchanged) every ~30 s. Transit-only fast poll (`/api/snapshot?modules=transit`) every 15-20 s is optional.
2. API layer authenticates, resolves `user_id`, reads per-module cache entries in parallel.
3. Fresh entry: serve. Stale entry (past TTL): serve stale and refresh in `ctx.waitUntil` (stale-while-revalidate). Missing: fetch inline.
4. Each module returns `{data, fetchedAt, status}`. Client shows a subtle "stale" marker when `fetchedAt` is too old or the request fails. One failing module never blanks the screen.

Refresh/TTL guidance (cache lives in the BFF, not just the browser):

| Module | Upstream | Server TTL | Refresh driver |
|--------|----------|-----------|----------------|
| Transit | Entur JourneyPlanner (needs `ET-Client-Name` header) | 15-30 s | On request (SWR). Cron not needed; only fetch when a client is polling, which also protects at night |
| Weather | MET Locationforecast 2.0 (needs identifying `User-Agent`; honor `Expires`/`If-Modified-Since`) | Use upstream `Expires`, typically ~30-60 min | Cron + SWR |
| Calendar | Google Calendar (today + tomorrow, `syncToken` optional) | 2-5 min | Cron |
| Mail | Gmail `messages.list` with query (e.g. `is:unread newer_than:2d`) + `history.list` | 5-10 min fetch; verdicts persisted forever | Cron |

Mail flow: cron -> list new message ids -> skip ids already in `mail_verdicts` -> fetch sender/subject/snippet (truncate body, strip quotes/links) -> Claude Haiku-class model with structured output (`important: bool, reason, action`) -> store verdict -> snapshot shows only important items with short reason. Cost is bounded by "new messages per day", not by poll rate.

Push vs poll decision: **poll** the snapshot from the client; **poll** upstream APIs from the server. Reasons:
- Entur has no browser-friendly push and its realtime changes every few seconds anyway; a 15-30 s poll is within "glance" tolerance.
- Gmail push needs Pub/Sub plus `watch()` renewal every 7 days; Calendar push needs public webhook channels with expiry. Both are operational burden for a single user. Polling every 5 min is fine.
- Persistent SSE/WebSocket on iPad Safari is dropped on sleep/network change and needs reconnect logic anyway; a poll loop is self-healing by construction.
- Revisit push (SSE or Durable Object WebSocket with hibernation) only for the shopping list (instant phone-to-iPad update) and voice responses.

### Authentication of a single-user private display

The display has no keyboard and shows private mail, so authenticate the *device*, not a typed login:
- **Pairing flow:** owner signs in on phone/laptop (Google Sign-In or passkey), opens "Add display", gets a one-time pairing code (or QR). iPad enters code once; server issues a long-lived opaque device token stored as an HttpOnly, Secure, SameSite cookie on the PWA origin. Token is hashed in D1 (`devices` table), revocable, with `last_seen_at`.
- Installed home-screen PWAs have storage separate from Safari tabs: pair *inside* the installed PWA after "Add to Home Screen" (VERIFY on current iPadOS).
- Shopping/Siri: separate per-user API token (scope `shopping:write`), used as `Authorization: Bearer` in the Shortcut's "Get Contents of URL". Scoped so a leaked Shortcut cannot read mail.
- Alternative for very fast v1: Cloudflare Access service token or a single secret in the URL fragment. Acceptable as a stopgap but do not let it become the model; device tokens cost little more.
- Google OAuth (server-held): one-time consent flow run by owner via a `/auth/google` route; store refresh token encrypted; request only `calendar.readonly` and `gmail.readonly` (or `gmail.metadata` if snippets are enough; metadata scope cannot read snippets/body, so readonly is likely required). **Move OAuth consent screen out of "Testing" status**, otherwise refresh tokens expire after 7 days (HIGH confidence on this behavior; it is a classic always-on failure). A personal unverified app in production still works with a warning screen.

### Leaving room for multiple users (cheap now, expensive later)

Do now:
- `user_id` column on every row (devices, oauth_accounts, mail_verdicts, shopping_items, settings); optional `household_id` on shopping items so lists can be shared later.
- Cache keys always `(user_id, module)`; providers take a `UserContext` (location/stop id, timezone, token handle) rather than reading globals or env vars.
- Per-user config in D1 (`stop_place_id`, lat/lon, enabled modules, night-mode hours), not hard-coded constants.
- Devices belong to a user; tokens resolve to `user_id` in middleware, so handlers never see "the" user.
- Cron iterates over users with connected accounts (one row today).

Do not do now: roles, invitations, billing, per-tenant isolation, an admin UI, or a generic plugin system.

## Patterns to Follow

### Pattern 1: Snapshot endpoint (BFF aggregation)
**What:** One endpoint returns all module DTOs plus per-module `fetchedAt/status`.
**When:** Always; the client stays trivial and resilient.
```typescript
type ModuleResult<T> = { data: T | null; fetchedAt: string; status: 'ok' | 'stale' | 'error' };
type Snapshot = { transit: ModuleResult<Departure[]>; weather: ModuleResult<Forecast>;
                  calendar: ModuleResult<Event[]>; mail: ModuleResult<ImportantMail[]>; serverTime: string };
```

### Pattern 2: Stale-while-revalidate with per-module TTL
**What:** Serve cached, refresh in the background, never block render on a slow upstream.
**When:** Every module. Prevents Entur/Google hiccups from blanking the display.

### Pattern 3: Persisted classification verdicts
**What:** Classify each email exactly once, keyed by Gmail message id; store verdict + model version.
**When:** Always. Controls cost and privacy exposure (send minimal text, no attachments).

### Pattern 4: Self-healing client
**What:** Poll loop with `visibilitychange`/`online` listeners, exponential backoff, a build-version field in the snapshot that triggers `location.reload()` when the server deploys a new version, and a nightly scheduled reload. Request a Screen Wake Lock (Safari 16.4+; VERIFY behavior in home-screen apps) and also set iPad Auto-Lock to Never / use Guided Access, since wake lock is not reliable alone.
**When:** From the first deployable version.

### Pattern 5: Night mode and burn-in handled client-side, from server time
**What:** Client decides dim/dark/clock-only from local time (and optional per-user hours); subtle periodic pixel shifting; low-contrast palette. No server involvement beyond config.
**When:** v1.

### Pattern 6: Provider interface shared by UI, cron, and voice tools
**What:** `getTransit(ctx)`, `getCalendar(ctx)` etc. exposed as plain functions; later registered as Claude tool definitions.
**When:** Define at v1 so voice becomes wiring, not a rewrite.

### Voice pipeline shape (later)
Client: wake word (on-device WASM engine such as Porcupine, or openWakeWord; needs persistent mic access, which is the main Safari risk, LOW confidence, prototype early) + VAD -> record utterance -> `POST /api/voice` (audio) -> server STT (Whisper-class / Deepgram) -> Claude with tools (`add_shopping_item`, `get_departures`, `get_calendar`, `get_weather`, free chat) -> text -> TTS -> audio stream back and played. Keep STT/LLM/TTS as three swappable stages; do not couple to a single "realtime" vendor. The client only needs mic + speaker.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client calls third-party APIs directly
**Why bad:** Leaks keys/tokens, hits CORS and rate limits, duplicates logic. **Instead:** All through the BFF.

### Anti-Pattern 2: Fan-out upstream on every client poll without cache
**Why bad:** Burns free-tier request budgets, risks Google/MET throttling (MET may block abusive clients). **Instead:** Server cache with TTLs; cron for slow modules.

### Anti-Pattern 3: Using Vercel Hobby cron for refresh
**Why bad:** Hobby cron is limited (about once per day, VERIFY), so 5-min refresh is impossible. **Instead:** Cloudflare Cron Triggers, or SWR-on-request only.

### Anti-Pattern 4: Classifying mail on every poll / sending full bodies
**Why bad:** Cost and privacy. **Instead:** Once per message, truncated, persisted.

### Anti-Pattern 5: Long-lived WebSocket as the primary transport for the display
**Why bad:** Silent drops on iPad sleep/network change; stateful backend. **Instead:** Poll; add push only where latency matters.

### Anti-Pattern 6: Hard-coding "the user" (stop id, token in env var)
**Why bad:** Multi-user becomes a rewrite. **Instead:** `UserContext` plumbing from day one.

## Scalability Considerations

| Concern | 1 user (now) | ~10 users (family) | 1000+ users |
|---------|--------------|--------------------|-------------|
| Request volume | ~3k snapshot polls/day/display; free tier fine | Still fine; ETag/304 keeps cost low | Share transit/weather cache by stop/grid cell, not by user |
| Upstream quota | Trivial | Group Entur calls by stop id | Needs Entur client agreement; Gmail quota per user fine |
| Mail classification cost | Cents/month | Tens of cents | Needs batching, cheaper model, opt-in |
| Token storage | One encrypted row | Same | KMS/envelope encryption, Google app verification (restricted scopes require a security assessment) |
| Realtime | Poll | Poll | SSE/WebSocket via Durable Objects |

## Suggested Build Order (dependencies)

1. **Backend skeleton + client shell + device auth.** Worker (Hono), D1 schema with `user_id`, pairing/device token, static PWA shell deployed, kiosk behaviors (wake lock, fullscreen manifest, night mode, self-reload). Everything else depends on auth and the snapshot contract.
2. **Stateless modules: transit and weather.** No OAuth; proves provider interface, cache/SWR, snapshot contract, stale indicators. Delivers daily value fast.
3. **Google OAuth + token vault + calendar.** First real security-sensitive piece; resolve "Testing" 7-day token expiry here. Calendar is the simplest consumer.
4. **Mail module + Claude classifier.** Depends on token vault; adds verdict store, cron, cost/privacy controls. Ship v1 here.
5. **Shopping list store + phone route + Siri endpoint.** Depends on auth (user tokens with scopes) and D1; introduces second client type and scoped API tokens. Add push (SSE/DO) only if polling feels slow.
6. **Voice pipeline.** Depends on provider functions (3-4) and shopping store (5). Do a feasibility spike on Safari mic/wake word earlier (alongside phase 2-3) because it can invalidate the in-browser approach.
7. **Extras (news, slideshow).** New providers plus a UI slot; no architecture change.

## Research Flags

- Voice/wake word in iPad Safari/PWA (mic permission persistence, background audio, audio autoplay policy): needs deeper research and an early spike. LOW confidence.
- Wake Lock behavior in home-screen web apps on current iPadOS: VERIFY.
- Google OAuth for personal use: production-unverified status, exact scopes, refresh token longevity: VERIFY.
- Cloudflare free-tier limits (requests, cron count, D1 rows, KV writes) vs. polling design: VERIFY.
- Entur/MET usage rules (client name header, User-Agent, caching): standard, quick verify.

## Sources

- Training-knowledge synthesis of common BFF/kiosk dashboard patterns (MEDIUM/LOW; not re-verified live).
- Entur developer docs (developer.entur.org), MET Norway API terms (api.met.no/doc/TermsOfService), Google OAuth docs (refresh token expiry for "Testing" apps), Cloudflare Workers docs (Cron Triggers, D1, KV, Durable Objects), WebKit blog on Screen Wake Lock (Safari 16.4). To be confirmed in phase research.
