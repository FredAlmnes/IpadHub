<!-- GSD:project-start source:PROJECT.md -->
## Project

**IpadHub**

En alltid-på infoskjerm for en iPad i leiligheten, som viser nyttig informasjon på ett blikk: når bussen går fra nærmeste stopp, været, dagens kalender og viktige e-poster som bør følges opp. Over tid skal den også bli et knutepunkt for en handleliste (som også kan nås fra telefonen) og en stemmeassistent du kan snakke til med et kodeord. Laget for én person (eieren) til å begynne med, med mulighet for flere brukere senere.

**Core Value:** Et raskt blikk på iPaden gir meg det jeg trenger for å komme meg ut døra og holde oversikt over dagen: buss, vær, kalender og hva i innboksen som krever handling.

### Constraints

- **Hosting**: Backend i skyen på gratis eller billig nivå (f.eks. Vercel/Cloudflare). Ingen maskin hjemme.
- **Budsjett**: Lave løpende kostnader. Hold AI-kall og API-bruk nøkterne.
- **Plattform**: Webapp som kjører i Safari på iPad (iPadOS 18.4+), også brukbar på mobil for handlelisten.
- **Sikkerhet**: Google-tokens og API-nøkler må ligge på serveren, aldri i klienten. Skjermen viser privat e-post, så tilgang må beskyttes.
- **Brukere**: Én bruker i v1, men datamodellen bør ikke stenge for flere senere.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommendation in one paragraph
## Recommended Stack
### Core Framework (frontend)
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vite | 8.3.x | Build/dev server | Plain SPA; fastest path to a static PWA; first-class Cloudflare plugin | HIGH (version), MEDIUM (v8 plugin compat, check at install) |
| React | 19.3.x | UI | Widest ecosystem; dashboard is a set of independent widgets with polling | MEDIUM (Solid/Svelte would also work; React chosen for familiarity and library support) |
| TypeScript | 5.x pinned (registry shows 7.0.2) | Types shared between Worker and client | TS 7 is the new native compiler; pin to what Vite/Drizzle/Wrangler templates support and upgrade deliberately | MEDIUM |
| TanStack Query | 5.104.x | Client polling, stale-while-revalidate, retry after network loss | `refetchInterval`, `refetchOnReconnect`, `refetchOnWindowFocus` give self-healing after Wi-Fi drops with almost no code | HIGH |
| Tailwind CSS | 4.x | Styling | Fast to build large-type, high-contrast layouts; no runtime cost | MEDIUM |
| vite-plugin-pwa | latest 1.x | Manifest, service worker | Standalone display mode, app icon, offline shell | MEDIUM |
### Backend / Hosting
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Cloudflare Workers (with static assets) | wrangler 4.151.x | Host SPA + API + cron in one deployment | Free tier covers this; Cron Triggers at 1-minute granularity on free plan; no cold-start worries; one deploy target | HIGH |
| Hono | 4.13.x | API router on Workers | Tiny, typed, built for Workers; middleware for auth, CORS, caching | HIGH |
| Zod | 4.6.x | Validate external API responses and request bodies | Entur/MET/Gmail payloads change; fail loudly at the boundary | HIGH |
| Cron Triggers | n/a | Scheduled polling | Every 1 min for departures, 10-15 min for weather/calendar, 5-10 min for email triage | HIGH (Cloudflare feature; confirm free-plan limits in dashboard at setup) |
### Database / Persistence
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Cloudflare D1 (SQLite) | n/a | Shopping list, users, encrypted tokens, email triage results | Relational and user_id-scoped from day one (satisfies "don't close the door on multi-user"); free tier ample | HIGH |
| Drizzle ORM | 0.45.x | Schema + migrations for D1 | Type-safe, small, D1 driver native; migrations via drizzle-kit | MEDIUM-HIGH |
| Cloudflare KV | n/a | Cached widget payloads (departures, weather, calendar) with TTL | Read-heavy, eventually consistent is fine for a display. Alternative: cache in D1 to keep one store | MEDIUM |
| Durable Objects (later, optional) | n/a | Real-time shopping list push to open clients | Only if polling every 5-10 s for list changes feels laggy; start with polling | LOW (defer) |
### Auth / Security
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Paired-device token (own code) | n/a | Protect the private display | Owner logs in once (passkey/password via `/login`), then the iPad is "paired" with a long-lived (e.g. 180 d), HttpOnly, Secure, SameSite=Strict cookie or rotating device token stored server-side hashed. An always-on kiosk cannot re-do interactive login | MEDIUM |
| jose | 6.2.x | Sign/verify session JWTs in Workers (WebCrypto) | Works on Workers; no Node deps | HIGH |
| WebCrypto AES-GCM (built in) | n/a | Encrypt Google refresh token at rest in D1 | Key lives as a Worker secret, never in D1 or client | HIGH |
| Cloudflare Access (optional) | n/a | Extra gate in front of the whole hostname | Free up to 50 users, but its session expiry and redirects can break an unattended PWA; use for admin routes (`/admin`, OAuth setup), not necessarily the kiosk | MEDIUM |
| Wrangler secrets | n/a | Google client secret, Anthropic key, encryption key | Never in the client bundle | HIGH |
### External integrations
| Service | Access method | Key rules | Confidence |
|---------|---------------|-----------|------------|
| Entur Journey Planner v3 | `POST https://api.entur.io/journey-planner/v3/graphql`, plain `fetch`; query `stopPlace { estimatedCalls }` | Must send `ET-Client-Name: yourname-ipadhub` or be rate-limited/blocked. No auth key. Developer portal moved to developer.entur.no. Do not add Apollo; one query via fetch + Zod | HIGH |
| MET Norway Locationforecast 2.0 (`/weatherapi/locationforecast/2.0/compact`) | `fetch` from the Worker | Identifying User-Agent with contact (fake = ban), truncate lat/lon to max 4 decimals (5+ returns 403 for newer products), honour `Expires` and send `If-Modified-Since`, no HEAD-then-GET. Server-side polling satisfies this naturally. Use `@metno/...` none needed | HIGH (ToS fetched 2026-10-19) |
| Google Calendar | REST via `fetch` + refresh-token exchange (`oauth2.googleapis.com/token`); scope `calendar.readonly` | Do NOT use `googleapis` (186.x) in Workers: huge bundle, Node assumptions. Hand-rolled ~50 lines of token refresh is simpler | MEDIUM-HIGH |
| Gmail | REST via `fetch`; scope `gmail.readonly` | `gmail.readonly` is a Restricted scope. For a single personal account, publish the OAuth consent screen to **"In production"** (unverified, you click through the warning). In **"Testing"** status refresh tokens expire after 7 days, which will silently break the display weekly | MEDIUM-HIGH (Google policy from knowledge; verify at setup) |
| Claude API | `@anthropic-ai/sdk` 0.135.x (or raw fetch) from the Worker, a Haiku-class model | Triage only new messages (track processed message IDs in D1), send sender, subject, snippet/trimmed body only, structured JSON output validated with Zod, strip long quoted threads, cap tokens. Verify the current Haiku model ID in Anthropic docs at implementation time | MEDIUM |
### Always-on display (iPadOS 16+)
| Technique | Detail | Confidence |
|-----------|--------|------------|
| Add to Home Screen, `display: standalone` manifest, `apple-mobile-web-app-capable` meta | Fullscreen without Safari chrome. iOS PWAs have no true kiosk mode | HIGH |
| Screen Wake Lock API | Works in Safari tab on iOS 16.4+. Home Screen web apps had a bug (WebKit 254545) fixed in **iOS 18.4**. If the iPad is on 16/17, wake lock in standalone mode fails. Prefer iPadOS 18.4+; reacquire on `visibilitychange`. Primary fallback is iPad Settings: Auto-Lock = Never, Guided Access (triple-click) to pin the app, plus charger | MEDIUM-HIGH |
| Night mode | Pure CSS/JS: after dusk/before dawn show dark page with dim clock; drift the clock a few px every minute against burn-in (iPad LCD is not OLED, so burn-in risk is low, but keeps it safe). Use `prefers-color-scheme` not required | HIGH |
| Self-healing | Watchdog: client records last successful fetch, and `location.reload()` if data older than N min; version check endpoint so new deploys reload the app; service worker with `skipWaiting` + network-first for the API | MEDIUM |
### Later: voice (flagged, needs its own research phase)
| Technology | Version | Purpose | Notes | Confidence |
|------------|---------|---------|-------|------------|
| Picovoice Porcupine Web | `@picovoice/porcupine-web` 4.0.x (+ `@picovoice/web-voice-processor`) | In-browser wake word via WASM, works in Safari | Needs AccessKey and a Console-trained `.ppn`; free tier appears personal/non-commercial but limits and Norwegian-language support were NOT confirmed. A custom English keyword ("Hey hub") is the safe path | LOW-MEDIUM |
| openWakeWord (WASM ports) | e.g. `openwakeword-wasm-browser` 0.1.1 | Open-source alternative | Immature ports; only as a fallback | LOW |
| Web Speech API `webkitSpeechRecognition` | built in | Speech to text | Exists in Safari with prefix; Norwegian (`nb-NO`) support and continuous-mode stability on iPad PWA are unverified; sends audio to Apple | LOW |
| Server-side STT (record clip, POST to Worker) | Workers AI Whisper or OpenAI-class STT | More reliable Norwegian transcript than browser API | Costs a little; recommended default once the wake word fires | LOW-MEDIUM |
| `speechSynthesis` | built in | Spoken replies | Norwegian voices on iPadOS exist but quality varies | MEDIUM |
| Claude with tool use | same SDK | Intent routing ("add milk", "when is the next bus") against cached data | Tools: add_item, next_departure, calendar_tomorrow | MEDIUM |
### Shopping list / Siri (later)
- Same D1 table, endpoints `GET/POST/DELETE /api/list`.
- **Siri Shortcuts**: a Shortcut using "Get Contents of URL" (POST JSON) to `/api/list/shortcut` with a dedicated, revocable **API token** in an `Authorization` header (separate from the browser cookie). Dictation via "Ask for Input" gives "Hey Siri, add milk". Confidence MEDIUM-HIGH.
- Phone PWA uses the same SPA with a `/list` route.
- Sync: poll every 5-10 s while visible, optimistic updates via TanStack Query mutations. Upgrade to WebSocket/Durable Object only if needed.
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Hosting | Cloudflare Workers | Vercel Hobby | Cron limited to once per day (verified), so polling would have to happen from the client or from an external pinger; Hobby is also non-commercial |
| Hosting | Cloudflare Workers | Vercel Pro (~$20/mo) | Works, but pays for what Cloudflare gives free |
| Hosting | Cloudflare Workers | Fly.io/Railway/VPS | Always-on process makes polling trivial but costs money and needs ops |
| Framework | Vite + React SPA | Next.js 16 | SSR/RSC adds nothing for a single-screen dashboard and complicates Workers deployment |
| Framework | Vite + React | SvelteKit / Solid | Fine choices; React chosen for ecosystem and AI-assisted development |
| Persistence | D1 + Drizzle | Upstash Redis | KV-shaped; weak for relational/multi-user list data |
| Persistence | D1 | Turso (libsql 0.18) / Supabase | Extra vendor; D1 is co-located with the Worker |
| Auth | Paired device token | Auth.js / Clerk / Supabase Auth | Overkill for one user; session expiry hostile to a kiosk. Revisit when multi-user arrives |
| Google client | raw fetch | `googleapis` | Bundle size, Node-only assumptions |
| Data fetching | Server cron + cached JSON | iPad calls Entur/MET/Google directly | Exposes tokens, breaks MET UA/caching rules, hammers APIs, cannot run the Claude triage |
| Polling | Cron + poll | WebSockets/SSE | Unnecessary at this scale; iOS suspends sockets anyway |
## What NOT to Use
- **Native Wake Word via always-on `SpeechRecognition` loop**: unstable on iOS, repeated permission prompts, Apple server dependency.
- **Google OAuth in "Testing" mode**: 7-day refresh-token expiry.
- **Storing refresh tokens in plaintext or in Worker KV without encryption.**
- **Sending full email bodies/attachments to Claude**: cost and privacy; send snippet/trimmed text, cache the verdict per message ID.
- **Calling MET with 5+ decimal coordinates or without User-Agent.**
- **Service worker caching of `/api/*` as cache-first**: shows stale bus times as if fresh. Use network-first with visible "last updated" staleness indicator.
## Installation
# Scaffold
# Core
# Dev
# Later (voice)
## Sources
- Vercel Cron limits (Hobby: once per day, last updated 2026-07-15): https://vercel.com/docs/cron-jobs/usage-and-pricing (HIGH)
- Entur Journey Planner v3 (endpoint, `ET-Client-Name`): https://developer.entur.org/pages-journeyplanner-journeyplanner (HIGH)
- MET Norway terms of service (User-Agent, caching, 4 decimals, 20 req/s): https://api.met.no/doc/TermsOfService (HIGH)
- WebKit bug 254545, Wake Lock in Home Screen web apps fixed in iOS 18.4: https://bugs.webkit.org/show_bug.cgi?id=254545 (MEDIUM, via search summary)
- Package versions: npm registry queried 2026-10-19 (HIGH)
- Picovoice Porcupine web binding: https://www.npmjs.com/package/@picovoice/porcupine-web ; pricing/language terms not confirmed (LOW)
- Google OAuth "Testing" 7-day token expiry and Gmail restricted scopes: from training knowledge, verify in Google Cloud console at setup (MEDIUM)
- Cloudflare free-tier cron/D1/KV limits: from training knowledge, verify at https://developers.cloudflare.com/workers/platform/limits/ (MEDIUM)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
