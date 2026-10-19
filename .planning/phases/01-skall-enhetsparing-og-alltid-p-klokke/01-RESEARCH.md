# Phase 1: Skall, enhetsparing og alltid-på klokke - Research

**Researched:** 2026-10-19
**Domain:** Cloudflare Workers (static assets + Hono + D1) backend skeleton, iPad Home Screen PWA kiosk shell, device pairing, Google OIDC admin login
**Confidence:** MEDIUM-HIGH (versions and Cloudflare limits verified today; iOS PWA cookie/wake-lock behaviour is documented by third parties only and must be confirmed on the actual iPad)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Liggende orientering (landscape) er det eneste målet. Stående trenger ikke egen layout.
- **D-02:** Mørkt tema på dagvisningen: sort/nesten-sort bakgrunn med lys tekst. Nattmodus er en enda mer dempet variant av samme uttrykk.
- **D-03:** Minimalistisk stil: mye luft, store tall, få farger (tenk Apple-widgets / MagicMirror). Ingen kort/fliser med tunge bakgrunner.
- **D-04:** Lesbar på 1–2 meters avstand (forbi i gangen). Hovedtall (klokke, senere bussminutter) skal være store; detaljtekst kan være mindre.
- **D-05:** Én dempet aksentfarge brukes sparsomt for uthevinger (f.eks. «neste»-hendelse, «gå nå» i senere faser). Resten er gråtoner.
- **D-06:** Systemfonten (SF Pro via `-apple-system`/`system-ui`). Ingen webfont-nedlasting. Bruk tabulære tall (`font-variant-numeric: tabular-nums`) så klokken ikke hopper.
- **D-07:** I fase 1 vises plassholdere (diskrete rammer/etiketter) der buss, vær, kalender og e-post skal komme. Layout-gridet etableres nå, så senere faser bare fyller inn moduler.
- **D-08:** Engangskoden kommer fra en admin-side (`/admin`) som eieren åpner på mobilen. Admin-siden skal senere også romme Google-tilkobling for kalender/Gmail (fase 3).
- **D-09:** Innlogging på admin-siden skjer med «Logg inn med Google» (OpenID Connect, bare `openid email`-scopes i denne fasen). Bare eierens e-postadresse (allowlist i konfig/secret) slipper inn. Konsekvens: Google OAuth-klienten opprettes allerede i fase 1, og consent screen bør settes til «In production» fra start. Fase 3 utvider samme klient med `calendar.readonly`/`gmail.readonly` (inkrementell autorisasjon).
- **D-10:** Admin-økten varer 30 dager (HttpOnly, Secure-cookie), skilt fra enhetstokenet.
- **D-11:** Admin-siden viser en liste over parede enheter med navn (f.eks. «Stue-iPad») og «sist sett»-tid, og en «Trekk tilbake»-knapp per enhet.
- **D-12:** Når en enhet trekkes tilbake eller tokenet blir ugyldig (401), går iPaden umiddelbart tilbake til paringsskjermen.
- **D-13:** Enhetstokenet er permanent til det trekkes tilbake. Det lagres hashet i D1, og iPaden skal aldri vise en innloggingsskjerm i normal drift (SEC-01).
- **D-14:** Fast tidsrom, standard 23:00–06:00 Europe/Oslo-tid, konfigurerbart (samme hver dag, ingen egen helgeregel).
- **D-15:** Natt-visningen er bare klokken: små/dempede grå tall på sort bakgrunn som sakte flytter seg (burn-in-drift). Plassholdere og moduler skjules.
- **D-16:** Myk fade over noen sekunder mellom dag- og nattvisning.
- **D-17:** Et trykk på skjermen om natten viser full dagsvisning midlertidig i 1–2 minutter, og går så tilbake til nattmodus.
- **D-18:** Oppsettsjekklisten (DISP-10) inkluderer instruksjoner for en Snarveier-automasjon som dimmer iPadens lysstyrke kl. 23:00 og øker den kl. 06:00, siden en nettside ikke kan styre lysstyrken.

### Claude's Discretion
- Klokkens plassering og dominans i layouten (best lesbarhet på 1–2 m, plass til buss/vær/kalender/e-post senere; f.eks. stor klokke/dato øverst eller i venstre kolonne).
- Paringsretning (anbefalt: iPaden viser kode, mobilen godkjenner; iPaden poller og får token-cookie satt inne i PWA-en; alternativ: taste 6-sifret kode på iPaden hvis research viser at det er enklere).
- Visning av gamle data og offline-status (DISP-05): diskret «oppdatert HH:MM» per modul, dempet/gråtonet innhold + liten markør når data er eldre enn terskel, global diskret offline-markør. Ingen store varselbannere.
- Daglig reload-tidspunkt (forslag ca. 03:30 i nattmodus), versjonssjekk, watchdog, polling og backoff.
- Konkret aksentfarge og nøyaktige fontstørrelser.

### Deferred Ideas (OUT OF SCOPE)
- Morgendagens første avtale i nattvisningen (fase 3).
- Egne helge-tider for nattmodus.
- (Also out of this phase: buss, vær, kalender, e-post modules; Google calendar/gmail scopes; SEC-04.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISP-01 | Standalone PWA på hjemskjermen | Manifest + apple meta tags, SPA assets, hand-written SW (Standard Stack, Pattern 6) |
| DISP-02 | Stor 24t-klokke, dato, ukenummer, nb, Europe/Oslo, DST | Intl `formatToParts` + custom ISO week (Pattern 5, Pitfalls 5-6) |
| DISP-03 | Screen Wake Lock, re-acquire | Pattern 7 (wake lock hook) |
| DISP-04 | Auto-oppdatering, henter ved nett tilbake | TanStack Query polling config (Pattern 4) |
| DISP-05 | Per-modul «sist oppdatert», gamle data/offline | Snapshot contract + `ModuleFrame` staleness (Pattern 3, 4) |
| DISP-06 | Feilisolering per modul | `Promise.allSettled` server-side + ErrorBoundary per modul (Pattern 3) |
| DISP-07 | Nattmodus | Pattern 8 (night mode state machine) |
| DISP-08 | Burn-in-drift | Pattern 8 (drift) |
| DISP-09 | Daglig reload + ny versjon | Pattern 6 (build id, reload guard, 03:30) |
| DISP-10 | Oppsettsjekkliste | Checklist content in "iPad setup checklist" section |
| SEC-01 | Parring én gang, ingen login-skjerm | Pattern 2 (device-code pairing, cookie set inside PWA) |
| SEC-02 | Data-endepunkter avviser uten gyldig token | Auth middleware, 401 contract (Pattern 2) |
| SEC-03 | Trekke tilbake enhet | `devices.revoked_at`, admin revoke, 401 -> pairing screen |
</phase_requirements>

## Summary

Phase 1 is a greenfield skeleton: one Cloudflare Worker (Hono) that also serves a Vite+React SPA via static assets, with D1 (Drizzle) for users, devices, pairing requests and settings. All current versions were verified on the npm registry today and the Cloudflare Vite plugin 1.64 supports Vite 8 [VERIFIED: npm registry]. The free plan (100k Worker requests/day, 10 ms CPU, 5 cron triggers, D1 5M reads/100k writes per day) comfortably covers one iPad polling every 30 s (about 2,900 requests/day) [CITED: developers.cloudflare.com/workers/platform/limits, /d1/platform/pricing]. Static asset requests are free and unlimited, but anything matched by `run_worker_first` counts as a Worker request [CITED: developers.cloudflare.com/workers/static-assets/billing-and-limitations].

Auth has two independent tracks. The iPad uses a device-code pairing flow (iPad shows a code, phone approves in `/admin`, iPad polls and receives an opaque token as an HttpOnly cookie set by the poll response itself, so it lands in the Home Screen app's own cookie jar). iOS Home Screen web apps have cookie/storage separate from Safari (only cookies are copied once, at install time) [CITED: wwdcnotes.com WWDC23 10120, bugs.webkit.org/show_bug.cgi?id=181849], which is exactly why the "approve on phone, cookie set to the polling PWA" direction is the right choice and typing a code on the iPad is not simpler. The owner uses Google OIDC (authorization-code flow, `openid email`) on `/admin`, validated with `jose` and an email allowlist, with a 30-day signed session cookie.

The always-on pitfalls (stale data looking fresh, sleep, memory growth, stale shell, DST) are solved with client logic that is cheap to build now and hard to retrofit: a snapshot contract with per-module `{data, fetchedAt, status}`, derived staleness, polling with `networkMode: 'always'`, a watchdog plus a guarded daily reload, a build-id check, and a Europe/Oslo time layer built on `Intl.DateTimeFormat.formatToParts` (never string formatting from `nb-NO`).

**Primary recommendation:** Build Vite 8 + `@cloudflare/vite-plugin` + Hono + Drizzle/D1 with admin pages server-rendered by Hono (no SPA routing for `/admin`), use a ~40-line hand-written service worker instead of `vite-plugin-pwa`, put all time logic in one pure, unit-tested `oslo-time` module, and make the snapshot contract and `ModuleFrame` the shared pattern for phases 2-4.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Clock, date, ISO week, night-mode decision, drift | Browser / Client | — | Must run with no network; server only supplies `serverTime` for skew and night config |
| Wake lock, watchdog, daily reload, version reload | Browser / Client | — | Only the client can keep itself awake and reload itself |
| Staleness / offline classification | Browser / Client | API (supplies `fetchedAt`, `serverTime`) | Age must be computed against "now", continuously |
| Snapshot aggregation, per-module isolation | API / Backend | Database / Storage (cache later) | Single authenticated endpoint; `allSettled` per provider |
| Device pairing, token issue, revocation | API / Backend | Database / Storage | Token hashed in D1; cookie set by server |
| Admin Google OIDC + session | API / Backend (server-rendered HTML) | — | Secrets (client secret) never leave Worker |
| Static shell, manifest, icons, SW | CDN / Static (Workers static assets) | — | Free, unlimited asset requests |
| Settings (night window, device names) | Database / Storage | API | Per-user rows in D1 with code defaults |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 8.3.4 | Build/dev | `@cloudflare/vite-plugin` peers `vite ^6.1 \|\| ^7 \|\| ^8` [VERIFIED: npm registry] |
| @cloudflare/vite-plugin | 1.64.0 | Runs Worker in workerd during `vite dev`, builds client+worker | Official Cloudflare approach; peers `wrangler ^4.151.0` [VERIFIED: npm registry] |
| wrangler | 4.151.2 | Deploy, D1 migrations, secrets | Official CLI [VERIFIED: npm registry] |
| hono | 4.13.13 | Router, middleware (`cookie`, `csrf`, `html`) | Built for Workers [VERIFIED: npm registry] |
| drizzle-orm | 0.45.4 | Typed D1 queries | Chosen in STACK.md [VERIFIED: npm registry] |
| drizzle-kit | 0.31.11 | Generate SQL migrations (applied with `wrangler d1 migrations apply`) | [VERIFIED: npm registry] |
| jose | 6.2.12 | Admin session JWT (HS256) + Google id_token verification via remote JWKS | WebCrypto, works on Workers [VERIFIED: npm registry] |
| zod | 4.6.7 | Validate request bodies and the snapshot contract (shared type) | [VERIFIED: npm registry] |
| react / react-dom | 19.3.1 | UI | [VERIFIED: npm registry] |
| @vitejs/plugin-react | 6.1.2 | JSX transform | [VERIFIED: npm registry] |
| @tanstack/react-query | 5.104.5 | Polling, retry, reconnect | [VERIFIED: npm registry] |
| tailwindcss + @tailwindcss/vite | 4.3.3 | Styling (large type via CSS vars/clamp) | [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 5.0.5 (peer of plugin: `^4.1 \|\| ^5`) | Test runner | All tests |
| @cloudflare/vitest-plugin | 1.4.5 | Run API tests inside workerd with real D1 binding | API/auth tests. NOTE: `@cloudflare/vitest-pool-workers` is deprecated and renamed to this package [VERIFIED: npm registry] |
| typescript | pin `~5.9` (registry latest is 7.0.2) | Typecheck | Pin 5.x as in STACK.md; confirm Drizzle/Wrangler types compile before moving to 7 [ASSUMED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written `public/sw.js` | `vite-plugin-pwa` 2.0.0 | Plugin is a fresh major (2.0.0); its interplay with the Cloudflare plugin's multi-environment build is unverified [ASSUMED]. A tiny SW avoids both that risk and Workbox bundle weight. Fall back to the plugin only if the hand-written SW proves insufficient |
| Server-rendered `/admin` (Hono `html`/JSX) | SPA route `/admin` | SSR HTML needs no client bundle, no SW interference, simple CSRF/session handling, and Phase 3 only adds buttons |
| Own OIDC code (~80 lines) | Auth.js / `@hono/oauth-providers` | One provider, one user; library adds surface and hides the scope-extension we need in Phase 3 |
| Plain `fetch` + Intl | date-fns-tz / Luxon / Temporal polyfill | Intl in Safari 18 handles `timeZone: 'Europe/Oslo'` correctly; no dependency needed |

**Installation:**
```bash
npm i react react-dom @tanstack/react-query hono zod drizzle-orm jose
npm i -D vite @cloudflare/vite-plugin wrangler @vitejs/plugin-react typescript@~5.9 \
  tailwindcss @tailwindcss/vite drizzle-kit vitest @cloudflare/vitest-plugin @types/react @types/react-dom
```
Versions verified against the npm registry on 2026-10-19. `package.json` needs `"type": "module"`.

## Package Legitimacy Audit

slopcheck was available locally (`slopcheck scan <pkg> --pkg npm`).

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| hono, drizzle-orm, drizzle-kit, jose, zod, react, react-dom, vite, wrangler, @vitejs/plugin-react, @tanstack/react-query, tailwindcss, @tailwindcss/vite | npm | years | very high | official repos | [OK] | Approved |
| @cloudflare/vite-plugin | npm | mature | high | cloudflare/workers-sdk | [OK] | Approved |
| @cloudflare/vitest-plugin | npm | ~60 days ("relatively new" note) | n/a | cloudflare/workers-sdk (rename of vitest-pool-workers) | [OK] | Approved (successor of the deprecated pool package, same repo) |
| vitest | npm | years | very high | vitest-dev/vitest | flagged "close to vite, possible typosquat" | Approved. False positive: vitest is the canonical test runner and is the peer dependency named by Cloudflare's own plugin |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (vitest name-similarity warning is a known false positive)
Postinstall scripts: `npm view` showed none for `@cloudflare/vite-plugin`, `@cloudflare/vitest-pool-workers`, `hono` [VERIFIED: npm registry].

## Architecture Patterns

### System Architecture Diagram

```
iPad (Home Screen PWA, own cookie jar)                 Phone (Safari)
  |                                                        |
  | 1 POST /api/pair/start --------+                       | 4 GET /admin  (Google login, 30d cookie)
  |   <- {code, pollSecret}        |                       | 5 POST /admin/pair/approve {code,name}
  | 2 show code on screen          v                       |
  | 3 POST /api/pair/poll  ---> [ Worker: Hono ] <---------+
  |   (every 3 s)                  |   |  \
  |   <- 200 + Set-Cookie device   |   |   +--> /auth/google/start, /callback  --> accounts.google.com
  |                                |   |                                         oauth2.googleapis.com/token
  | 6 GET /api/snapshot (30 s)     |   v
  |   cookie -> deviceAuth mw ---> hash lookup in D1 devices (revoked? -> 401)
  |   <- {serverTime, version, config, modules{ ...{data,fetchedAt,status} }}
  |
  v                                [ Static assets (free): index.html, /assets/*, sw.js, manifest ]
Client state machine:
  unpaired -> pairing screen -> paired -> poll snapshot
  401 on snapshot -> unpaired.   network error / 5xx / 429 -> keep last data, mark stale/offline
  Clock (local, no network) + night mode (Oslo time) + drift + wake lock + watchdog + 03:30 reload
```

### Recommended Project Structure
```
src/
├── worker/
│   ├── index.ts            # Hono app, export default {fetch}
│   ├── routes/             # api-pair.ts, api-snapshot.ts, admin.tsx, auth-google.ts
│   ├── middleware/         # device-auth.ts, admin-auth.ts
│   ├── providers/          # registry.ts (UserContext) -> ModuleSnapshot; phase 1: empty/placeholder
│   ├── db/                 # schema.ts (Drizzle), client.ts
│   └── lib/                # tokens.ts (random+sha256), google-oidc.ts, cookies.ts
├── client/
│   ├── main.tsx, App.tsx
│   ├── features/           # pairing/, display/ (Clock, Grid, ModuleFrame, NightLayer)
│   ├── hooks/              # useSnapshot, useWakeLock, useNow, useNightMode, useWatchdog
│   └── lib/                # oslo-time.ts, staleness.ts, reload-guard.ts
├── shared/
│   └── contract.ts         # Zod schemas + types for Snapshot (imported by both sides)
public/                     # sw.js, manifest.webmanifest, icons (180/192/512), apple-touch-icon
drizzle/                    # generated SQL migrations
docs/ipad-setup.md          # DISP-10 checklist
wrangler.jsonc, vite.config.ts, drizzle.config.ts, vitest.config.ts, .dev.vars.example
```

### Pattern 1: Worker + SPA assets + Vite plugin
**What:** One Worker; `run_worker_first` only for dynamic paths so static files stay free.
```jsonc
// wrangler.jsonc   [CITED: developers.cloudflare.com/workers/vite-plugin/get-started, /static-assets/binding]
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "ipadhub",
  "compatibility_date": "2026-10-19",
  "main": "./src/worker/index.ts",
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/admin", "/admin/*", "/auth/*"]
  },
  "d1_databases": [{ "binding": "DB", "database_name": "ipadhub", "database_id": "<from wrangler d1 create>", "migrations_dir": "drizzle" }],
  "upload_source_maps": true
}
```
```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
const BUILD_ID = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) }, // same value in client and worker bundle
});
```
Scripts: `dev: vite dev`, `build: vite build`, `deploy: npm run build && wrangler deploy` [CITED]. The Vite plugin's exact config for a client+worker app (default environment is client, worker environment added automatically when `main` is set) was documented only for worker-only setups on the page fetched; verify the generated `dist/` layout on first build [ASSUMED]. Apply D1 migrations: `wrangler d1 migrations apply ipadhub --local` / `--remote`. Local secrets go in `.dev.vars` (already gitignored); production via `wrangler secret put`.

### Pattern 2: Device-code pairing + device auth middleware
**What:** Unauthenticated endpoints are only `pair/start` and `pair/poll`; everything else under `/api` requires a device cookie.
- `POST /api/pair/start` -> create `pairing_requests` row: `code` (8 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, shown as `K7QM-4TXD`, stored as sha256), `poll_secret_hash`, `expires_at = now+10min`, `status='pending'`. Return `{code, pollSecret, expiresIn}`. Cap pending rows (e.g. 20) and delete expired rows opportunistically to bound abuse on the free tier. `pollSecret` kept in client memory (and sessionStorage so a reload resumes).
- `POST /api/pair/poll {pollSecret}` -> `pending` | `expired` | on `approved`: generate 32 random bytes (`crypto.getRandomValues`), base64url, insert `devices(token_hash=sha256(token))`, mark request `consumed`, `Set-Cookie: device=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=34560000` (400 days). Token is returned only via cookie, never in JSON.
- `POST /admin/pair/approve {code, name}` (admin session + CSRF) -> sets `status='approved'`, `user_id`, `device_name`.
- `deviceAuth` middleware: read cookie, sha256, `SELECT ... FROM devices WHERE token_hash=? AND revoked_at IS NULL`; 401 with `{error:'unpaired'}` otherwise; sets `c.set('user', {userId, deviceId})`. Update `last_seen_at` only if older than 5 min (about 290 writes/day vs 100k limit). Sliding cookie renewal: re-send `Set-Cookie` when `last_seen_at` update fires.
- Revoke: `UPDATE devices SET revoked_at=now`. Next snapshot poll returns 401, client switches to pairing screen within one poll interval (30 s). Optionally shorten by also checking on `visibilitychange`.
- Compare hashes with a constant-time-safe path: lookup by hash in SQL is fine because the secret is 256-bit random (no timing oracle on a guessable value).
**Why this direction:** iOS Home Screen apps get a cookie jar separate from Safari; only a one-time copy at install time exists [CITED: wwdcnotes.com/notes/wwdc23/10120]. Because the cookie is set in the response to a `fetch` made by the installed PWA, it lands in the right jar regardless of what Safari knows. Server-set HttpOnly cookies are not subject to Safari's 7-day script-writable cap; a separate report notes cookie deletion after 9 days of non-use in Home Screen apps, which does not apply to an app in daily use [CITED: bugs.webkit.org/show_bug.cgi?id=211775 via search summary]. Must be confirmed with a multi-day soak on the real iPad.
**Client contract:** only an exact HTTP 401 from `/api/snapshot` switches to the pairing screen. Network failures, 5xx and 429 (free-quota exhaustion returns 429 for `run_worker_first` paths) must never un-pair the screen.

### Pattern 3: Snapshot contract and error isolation
```ts
// shared/contract.ts
export const ModuleStatus = z.enum(["ok", "error", "not_configured"]);
export const ModuleSnapshot = z.object({
  data: z.unknown().nullable(),        // module-specific DTO, typed per module in later phases
  fetchedAt: z.string().datetime().nullable(),  // last SUCCESSFUL fetch of upstream data
  status: ModuleStatus,
  staleAfterSec: z.number(),           // module threshold, server-owned
  error: z.string().optional(),        // short, no secrets
});
export const Snapshot = z.object({
  serverTime: z.string().datetime(),
  version: z.string(),                 // __BUILD_ID__ of the worker
  config: z.object({ nightStart: z.string(), nightEnd: z.string(), timezone: z.literal("Europe/Oslo") }),
  modules: z.record(z.string(), ModuleSnapshot),  // keys: bus, weather, calendar, mail
});
```
Server: `const results = await Promise.allSettled(providers.map(p => p.get(ctx)))`; a rejected provider yields `{data: previous|null, status:'error', fetchedAt: previous?.fetchedAt}`. Provider signature `(UserContext) => Promise<ModuleSnapshot>` (the pattern phases 2-4 reuse). In Phase 1 the registry returns `not_configured` for bus/weather/calendar/mail so placeholders render. To exercise staleness/offline/error UI without real modules, add a dev-only provider `demo` behind `env.DEMO_MODULES === "1"` and cover the logic with unit tests using fixtures [ASSUMED approach].
Client: every module is wrapped in `<ModuleFrame>` containing a React `ErrorBoundary`, so a render exception in one module cannot blank the screen.
Staleness: `age = (serverTime - fetchedAt) + (localNow - receivedAtLocal)` (uses server clock for the base, local monotonic elapsed time after); `stale = age > staleAfterSec` or `status==='error'`. Display `oppdatert HH:MM` (Oslo time of `fetchedAt`), gray content + small marker when stale. Global offline marker when no successful snapshot for more than 2 poll intervals.

### Pattern 4: Polling with TanStack Query
```ts
useQuery({
  queryKey: ["snapshot"],
  queryFn: ({ signal }) => fetchSnapshot(AbortSignal.any([signal, AbortSignal.timeout(10_000)])),
  refetchInterval: 30_000,
  refetchIntervalInBackground: true,
  networkMode: "always",              // iOS navigator.onLine is unreliable; do not let Query pause
  retry: true,
  retryDelay: (n) => Math.min(30_000, 1000 * 2 ** n) * (0.5 + Math.random()),
  staleTime: 0, gcTime: Infinity,
  refetchOnReconnect: true, refetchOnWindowFocus: true,
});
```
Keep the last good data on failure (Query keeps `data` while `isError`). Add `visibilitychange` and `online` listeners that trigger an immediate refetch. Use `ETag`/304 only if payload grows (later). Never cache `/api/*` in the SW.

### Pattern 5: Europe/Oslo time layer (single pure module, unit-tested)
```ts
// client/lib/oslo-time.ts
const parts = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", ...opts })
    .formatToParts(d).map(p => [p.type, p.value]));

export function osloClock(d: Date) {
  const p = parts(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.hour}:${p.minute}`;                 // compose ourselves; do NOT use format() output
}
export function osloYmd(d: Date) {
  const p = parts(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  return { y: +p.year, m: +p.month, d: +p.day };
}
export function osloMinutesOfDay(d: Date) { /* hour*60+minute from parts with hourCycle h23 */ }
export function isoWeek({ y, m, d }: { y: number; m: number; d: number }) {
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = t.getUTCDay() || 7;                  // Mon=1..Sun=7
  t.setUTCDate(t.getUTCDate() + 4 - dow);          // Thursday of this ISO week
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((+t - yearStart) / 86400000 + 1) / 7);
}
export const osloDateLabel = (d: Date) =>
  new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "long", day: "numeric", month: "long" }).format(d);
// "mandag 19. oktober"; render "Uke {isoWeek}" separately
```
Rules: ISO weeks are not provided by Intl, so compute from the Oslo calendar date (not from `d.getDate()` of the device's zone). Pass `Date` objects (UTC instants) in; all conversion goes through `timeZone: "Europe/Oslo"`. Tests must inject `Date` values around DST: fall-back Sun 2026-10-25 (01:00 UTC is 02:00 CET after the shift; 02:00 repeats) and spring-forward Sun 2027-03-28 (02:00 -> 03:00), plus week 53 years (2026-12-31 is ISO week 53) and a UTC-vs-Oslo date boundary (2026-10-24T22:30Z is already 25 Oct in Oslo) [ASSUMED dates computed by hand; verify in tests].

### Pattern 6: Service worker, manifest, version reload, daily reload
- `public/manifest.webmanifest`: `name`, `short_name`, `display: "standalone"`, `orientation: "landscape"`, `background_color`/`theme_color: "#000000"`, `start_url: "/"`, icons 192/512 (+ maskable). `index.html`: `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-status-bar-style` = `black`, `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (iOS uses this icon; a 180x180 PNG), `viewport` with `viewport-fit=cover, user-scalable=no`. A Home Screen app's name is taken at install time.
- `public/sw.js` (~40 lines): `install -> skipWaiting`, `activate -> clients.claim`; `fetch`: ignore non-GET and any path starting `/api/`, `/admin`, `/auth/`; for navigations do network-first with `fetch(req, {cache:"no-store"})` falling back to the cached `/` shell (put into cache on success); for `/assets/*` (content-hashed) use cache-first. Register with `{updateViaCache: "none"}`. Purpose: a 03:30 reload while Wi-Fi is down still opens the shell instead of an error page; staleness is then shown by the module UI.
- Version: `__BUILD_ID__` embedded in client; snapshot returns worker's `version`. If they differ, reload. Guard against loops with `localStorage["lastReloadAt"]`; refuse another version-triggered reload within 10 min.
- Daily reload: scheduled for 03:30 Europe/Oslo (a once-per-day-flag keyed by Oslo date, so the DST repeat hour 02:00-03:00 cannot double-fire, and 03:30 exists on both transition days). Check with the same minute-aligned tick used for the clock. Also watchdog: if no successful snapshot for 15 min while `navigator.onLine !== false`, reload (guarded the same way).
- Add `Cache-Control: no-store` on `/api/*` responses.

### Pattern 7: Wake Lock
```ts
function useWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null; let alive = true;
    const acquire = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try { sentinel = await navigator.wakeLock.request("screen"); sentinel.addEventListener("release", () => { sentinel = null; }); } catch { /* retry later */ }
    };
    const onVis = () => { if (document.visibilityState === "visible" && !sentinel) void acquire(); };
    document.addEventListener("visibilitychange", onVis);
    const retry = setInterval(() => { if (alive && !sentinel) void acquire(); }, 60_000);  // heartbeat re-acquire
    void acquire();
    return () => { alive = false; clearInterval(retry); document.removeEventListener("visibilitychange", onVis); void sentinel?.release(); };
  }, []);
}
```
Standalone Home Screen support was fixed in iOS 18.4 (WebKit 254545); MDN compat tables lag behind, and no Apple release note explicitly confirms it [CITED: bugs.webkit.org/show_bug.cgi?id=254545, progressier.com/pwa-capabilities/screen-wake-lock]. The request must be first made after a user gesture on some browsers; on iOS a request at load generally works in Safari but treat failure as normal and retry on first `pointerdown`. Wake lock is secondary to Auto-Lock = Never + Guided Access. Expose a tiny diagnostic (dev only) showing sentinel state for the on-device check.

### Pattern 8: Night mode, fade, drift, tap-to-wake
- State derived from a minute tick: `inNight(minutesOfDay, start, end)` with wrap-around (`start > end` means `m >= start || m < end`). Mode = `night` if `inNight && now > wakeUntil`.
- Two stacked layers (day layout, night clock) both mounted; toggle a class to cross-fade `opacity` over 3 s with `transition`. Night layer: near-black background (pure `#000` is fine on LCD; verify iPad model for OLED), clock in dim gray (~`#5a5a5a`), small size. Do not unmount modules (avoids refetch/flicker); hide with `visibility:hidden` after the fade.
- Drift: every 60 s move the night clock to a new position along a slow Lissajous/slow-walk path within safe margins using `transform: translate()` with a long CSS transition (e.g. 50 s) so it glides; also apply a ±few px offset to the day layout (e.g. 1-2 px every few minutes) [ASSUMED values].
- Tap to wake: one `pointerdown` listener on `document` sets `wakeUntil = now + 90 s`; the next tick returns to night. Guided Access must keep Touch enabled for this (see checklist).
- Night window comes from `snapshot.config` (D1 `user_settings`, defaults 23:00/06:00), with a hard-coded fallback so night mode works offline.

### Pattern 9: Google OIDC for `/admin` (no library)
Flow (authorization code, server side) [CITED: developers.google.com/identity/protocols/oauth2/web-server]:
1. `GET /auth/google/start` -> generate `state` and `nonce` (random), store in short-lived HttpOnly cookie (`SameSite=Lax`, 10 min), redirect to `https://accounts.google.com/o/oauth2/v2/auth?client_id&redirect_uri&response_type=code&scope=openid%20email&state&nonce&prompt=select_account`.
2. `GET /auth/google/callback?code&state` -> verify state vs cookie; POST to `https://oauth2.googleapis.com/token` (`grant_type=authorization_code`, `client_id`, `client_secret`, `redirect_uri`, `code`); verify `id_token` with `jose` `jwtVerify(token, createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")), {issuer: ["https://accounts.google.com"], audience: CLIENT_ID})`, check `nonce`, `email_verified === true`, and `email` is in `env.ADMIN_EMAILS` (comma list, lower-cased). Upsert `users(id, email, google_sub)` and set the session.
3. Session cookie `admin_session`: HS256 JWT from `jose` (`SignJWT`, secret `env.SESSION_SECRET`, `exp` 30 d), `HttpOnly; Secure; SameSite=Lax; Path=/`. Middleware verifies it and re-checks the email against the allowlist on each request (removing someone from the allowlist takes effect immediately).
4. State-changing admin routes use Hono `csrf()` middleware (Origin check) plus SameSite=Lax.
Phase 3 extension: the same client and callback; a new `GET /auth/google/connect` uses `access_type=offline&prompt=consent&include_granted_scopes=true` with `calendar.readonly gmail.readonly`, and `state` carries a `purpose` field; `include_granted_scopes` is Google's incremental-authorization mechanism and users can deny individual scopes, so check the returned `scope` [CITED: Google OAuth web-server doc]. Do not request offline access in Phase 1 (no refresh token needed).
Console steps (manual, for the plan): Google Cloud project -> Google Auth Platform: configure Branding (app name, support email), Audience = External, publish to "In production"; create OAuth client of type Web application with authorized redirect URIs `https://<worker>.<subdomain>.workers.dev/auth/google/callback` and the local dev URL `http://localhost:5173/auth/google/callback`; store `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `.dev.vars` and `wrangler secret put`. Google states that requests with only `openid`/`userinfo.email`/`userinfo.profile` do not need test users, show no warning and do not expire after 7 days [CITED: support.google.com/cloud/answer/15549945 via search summary]. Whether an In-production app with only these scopes needs verification was not confirmed explicitly [MEDIUM]; the UI labels in the new Google Auth Platform console may differ from the above [ASSUMED].

### Pattern 10: Database schema (Drizzle, all rows carry user_id)
`users(id, email unique, google_sub, created_at)`, `devices(id, user_id, name, token_hash unique, created_at, last_seen_at, revoked_at)`, `pairing_requests(id, code_hash unique, poll_secret_hash, status, user_id null, device_name null, expires_at, created_at)`, `user_settings(user_id pk, night_start default '23:00', night_end default '06:00')`. Use `integer` unix-ms or ISO text consistently. Generate with `drizzle-kit generate` (dialect `sqlite`), apply with Wrangler (`migrations_dir: "drizzle"`); do not use `drizzle-kit push` against remote.

### Anti-Patterns to Avoid
- **Formatting the clock with `toLocaleTimeString("nb-NO")`:** nb-NO historically yields `14.05` vs `14:05` depending on CLDR/engine version; compose from `formatToParts`.
- **`hour12:false` instead of `hourCycle:"h23"`:** can print `24:05` at midnight in some engines.
- **Cache-first or SW-cached `/api/*` and `/admin`:** shows stale data as fresh / serves cached admin pages.
- **SPA fallback swallowing `/admin` and `/auth/*`:** these must be in `run_worker_first`, otherwise navigation returns `index.html`.
- **Treating any fetch failure as "unpaired":** only a 401 un-pairs.
- **Local `Date` methods for date/week:** device time zone is irrelevant; always go through the Oslo helpers.
- **Reload loops:** unguarded version/watchdog reload can spin and hammer the Worker; guard with a timestamp.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification, JWKS fetch | Custom HMAC/RSA code | `jose` | Algorithm confusion, key rotation of Google certs |
| Cookie parsing/serialisation | Manual `Set-Cookie` strings | `hono/cookie` (`setCookie`, `getCookie`) | Attribute escaping, prefixes |
| CSRF on admin POSTs | Custom token scheme | `hono/csrf` + SameSite=Lax | Origin validation done right |
| Request validation | Ad hoc `if` checks | `zod` schemas (also the snapshot contract) | Shared client/server types |
| SQL migrations | Hand-managed DDL | `drizzle-kit generate` + `wrangler d1 migrations apply` | Reproducible |
| Random tokens | `Math.random` | `crypto.getRandomValues` + SHA-256 via `crypto.subtle` | Cryptographically secure, built in |
| Polling/retry/reconnect | Manual timers + state | TanStack Query | Already handles retry, abort, focus/reconnect |
| ISO week number | Month-length arithmetic | The ~8-line Thursday algorithm above with unit tests | Edge years (week 53, week 1 in December/January) |
| Time zone/DST maths | Manual +1/+2 offsets | `Intl.DateTimeFormat` with `timeZone` | Handles DST correctly |

**Key insight:** every "simple" piece here (time, cookies, tokens, polling) has well-known edge cases that fail silently at 03:00; use the platform/library and spend the effort on tests around DST and revocation.

## Runtime State Inventory
Skipped: greenfield phase, not a rename/refactor/migration.

## Common Pitfalls

### Pitfall 1: Cookie set in Safari is invisible to the installed app
**What goes wrong:** Pairing performed in a Safari tab (or the cookie lost on re-install) leaves the PWA without a token.
**Why:** Home Screen apps have separate storage; only a one-time cookie copy at install [CITED: WWDC23 10120].
**How to avoid:** Pairing begins and completes inside the installed PWA (poll response sets the cookie). Install first, then pair. Re-adding the app to the Home Screen creates a fresh jar, so re-pair.
**Warning signs:** Works in Safari tab, shows pairing screen after launching from the icon.

### Pitfall 2: `Secure`/`__Host-` cookies on local HTTP
**What goes wrong:** Safari does not store `Secure` cookies from `http://localhost`.
**How to avoid:** Set `secure` only when the request URL is https; develop auth flows in Chrome locally or via `wrangler dev --remote`/the deployed Worker. Avoid the `__Host-` prefix unless https is guaranteed.

### Pitfall 3: SPA fallback and Worker request budget
**What goes wrong:** Unknown paths fall through to the Worker (billed) or `/admin` returns the SPA shell.
**How to avoid:** `run_worker_first` array for `/api/*`, `/admin*`, `/auth/*`; static files stay free. Budget: snapshot every 30 s = 2,880/day, plus pairing polls; far below 100,000. A 429 from quota exhaustion must not un-pair.

### Pitfall 4: Free-plan CPU 10 ms per request
**What goes wrong:** Heavy work in a request (JWT verify with remote JWKS cold start, many D1 calls) exceeds CPU.
**How to avoid:** Snapshot handler does one indexed D1 read (device) and at most one conditional write; SHA-256 via WebCrypto is cheap; only the login callback does a JWKS fetch (network time does not count as CPU) [CITED: Workers limits page: 10 ms CPU/request on Free].

### Pitfall 5: Clock string differences across Safari versions
See anti-pattern; always compose the time from parts and test the output on the device.

### Pitfall 6: Date/week wrong around midnight UTC vs Oslo and DST
**What goes wrong:** Between 22:00/23:00 UTC and midnight Oslo the UTC date and Oslo date differ, so week number/date flips late or early. On 2026-10-25 02:00-03:00 occurs twice.
**How to avoid:** Derive Y-M-D from Oslo parts only; tick by wall clock (re-read `new Date()` each tick, never accumulate `+60000`). Daily reload keyed by Oslo date flag.

### Pitfall 7: Wake lock released silently
**What goes wrong:** Sentinel is released on tab hide, low power mode, or power events and is not re-acquired.
**How to avoid:** `release` listener + `visibilitychange` + 60 s heartbeat (Pattern 7); Auto-Lock = Never remains the real guarantee.

### Pitfall 8: Guided Access disables touch/auto-lock interplay
**What goes wrong:** Guided Access has its own "Display Auto-Lock" and touch options; touch disabled kills tap-to-wake (D-17); the side button still locks the screen.
**How to avoid:** In the checklist keep "Touch" enabled (or accept no tap-to-wake and document it), set Guided Access Display Auto-Lock to Never.

### Pitfall 9: Memory growth over days
**How to avoid:** Replace state (no append-only arrays), `AbortSignal.timeout` on fetches, clean timers in effects, avoid animating many elements; the daily reload is the safety net. Keep the night layer to a single transformed element.

### Pitfall 10: Google consent screen status
**What goes wrong:** Test users + Testing status expire authorizations after 7 days (relevant from Phase 3; for `openid email` only, Google says the expiry does not apply). Set "In production" now so Phase 3 does not hit it [CITED: support.google.com/cloud/answer/15549945 via search summary].

### Pitfall 11: Public repo
`.gitignore` already covers `.dev.vars` and `.env*`. Commit `.dev.vars.example` only; the D1 `database_id` in `wrangler.jsonc` is not a secret but the allowlist email should come from a secret/var, not code.

## Code Examples

### Hono app skeleton with route-level auth
```ts
// Source: hono.dev (Cloudflare Workers pattern) [ASSUMED – verify against installed hono 4.13]
const app = new Hono<{ Bindings: Env; Variables: { user: UserContext } }>();
app.route("/api/pair", pairRoutes);                 // unauthenticated
app.use("/api/*", async (c, next) => c.header("Cache-Control", "no-store") && next());
app.use("/api/snapshot", deviceAuth);               // all further /api/* data routes also use deviceAuth
app.get("/api/snapshot", async (c) => c.json(await buildSnapshot(c.env, c.get("user"))));
app.route("/admin", adminRoutes);                   // admin-auth middleware inside, SSR html
app.route("/auth", googleAuthRoutes);
export default app;
```

### Vitest config for Worker + pure tests
```ts
// vitest.config.ts   [CITED: developers.cloudflare.com/workers/testing/vitest-integration]
import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
export default defineConfig({
  test: { projects: [
    { extends: false, test: { name: "pure", include: ["src/client/lib/**/*.test.ts", "src/shared/**/*.test.ts"], environment: "node" } },
    { plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
      test: { name: "worker", include: ["src/worker/**/*.test.ts"], setupFiles: ["./test/apply-migrations.ts"] } },
  ] },
});
// Integration: import { exports } from "cloudflare:workers"; await exports.default.fetch(new Request("http://x/api/snapshot"))
// D1: readD1Migrations() in Node config -> provide as binding -> applyD1Migrations(env.DB, migrations) in beforeAll; reset() in afterEach
```
The `projects` layout and `wrangler.configPath` option name are taken from the plugin docs summary; confirm exact option names against the installed 1.4.5 types on first run [ASSUMED]. Component-level tests (ModuleFrame staleness, night mode hook) can use `vitest` + `jsdom`/`@testing-library/react` in a third project (add as needed), with `vi.useFakeTimers` + `vi.setSystemTime` for time.

### Tests that must exist (Wave 0 / Phase 1)
- `oslo-time`: DST fall-back (2026-10-25), spring-forward (2027-03-28), ISO week edge dates, UTC vs Oslo date boundary, `inNight` wrap-around (22:59/23:00/05:59/06:00).
- API: `/api/snapshot` 401 without cookie, 401 after revoke, 200 with valid; pair flow start -> pending -> approve -> poll sets cookie once -> second poll consumed; expired code; admin routes 302/401 without session; allowlist rejection; `allSettled` isolation (a throwing provider does not fail the snapshot).
- Client logic: staleness derivation, reload guard, 401 vs network error handling.
- Manual (on-device) soak: overnight run with Auto-Lock Never; revoke test; offline test (Wi-Fi off 10 min, then back); DST night 2026-10-25.

## iPad setup checklist (DISP-10 content outline for `docs/ipad-setup.md`)
1. Update to iPadOS 18.4 or later (Wake Lock in Home Screen apps). Check model (LCD vs OLED affects burn-in risk).
2. Open the Worker URL in Safari -> Share -> Add to Home Screen. Launch from the icon (not Safari) and pair there.
3. Settings -> Display & Brightness -> Auto-Lock = Never.
4. Keep the iPad on a charger; consider Optimized Battery Charging / charge limit where the model offers it; avoid sun/heat and thick cases.
5. Guided Access (Settings -> Accessibility): enable, set passcode, triple-click side/Home button inside the app to start; options: keep Touch ON (needed for tap-to-wake), Display Auto-Lock = Never.
6. Shortcuts automation: Personal Automation at 23:00 "Set Brightness" low, at 06:00 "Set Brightness" high; set "Run Immediately"/disable "Ask Before Running" [ASSUMED menu wording, verify].
7. Do Not Disturb/Focus to suppress notification banners; disable auto-updates overnight or accept restarts; after any iPadOS update re-check items 3 and 5 (updates can reset them).
8. Recovery: if the screen shows the pairing code, open `/admin` on the phone and approve; revoke lost devices there.
9. Wi-Fi: keep signed in to a reliable network; avoid Low Power Mode.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@cloudflare/vitest-pool-workers` (`defineWorkersConfig`) | `@cloudflare/vitest-plugin` with `cloudflareTest()` plugin | 2026 (rename) | Use the new package; old one is deprecated |
| Wake Lock unavailable in iOS Home Screen apps | Fixed in iOS 18.4 | 2025 | Matches project's iPadOS 18.4+ constraint |
| Cloudflare Pages + Functions | Workers with static assets | 2025 | Use Workers (Pages is not the target here) |
| Workbox-generated SW via plugin | Hand-written minimal SW for a single-screen kiosk | n/a | Less magic, no stale precache |

**Deprecated/outdated:** `@cloudflare/vitest-pool-workers` (renamed); `drizzle-kit push` for production D1.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TypeScript should be pinned to 5.x rather than the registry's 7.0.2 | Standard Stack | Low; try 7 first if Drizzle/Wrangler types compile |
| A2 | `vite-plugin-pwa` 2.0.0 may conflict with the Cloudflare plugin build; a hand-written SW is safer | Alternatives | Low; swap in the plugin if desired |
| A3 | `@cloudflare/vite-plugin` generates the client+worker build layout automatically for a `main` + `assets` wrangler config | Pattern 1 | Medium; first build task must verify `dist` layout and `vite preview` |
| A4 | Hono API snippets (cookie, csrf, route composition) as written | Code Examples | Low; verify with Context7/hono docs while coding |
| A5 | Drift amounts/timings and fade durations | Pattern 8 | Low; cosmetic |
| A6 | Shortcuts automation menu wording and Guided Access option names | Checklist | Low; adjust on device |
| A7 | Google Auth Platform console labels and that an In-production app with only openid/email needs no verification | Pattern 9 | Medium; verify during manual OAuth setup |
| A8 | Cookie persistence for 400 days in the Home Screen app for an always-used app | Pattern 2 | Medium; soak test and re-pair fallback |
| A9 | `demo` provider flag for exercising staleness UI before real modules | Pattern 3 | Low |
| A10 | Plugin test config option names (`wrangler.configPath`, `projects`) | Code Examples | Low; check types on install |
| A11 | DST dates (2026-10-25, 2027-03-28) and week-53 claim for 2026 | Pattern 5 | Low; covered by tests |

## Open Questions

1. **iPad model and iPadOS version**
   - Known: needs 18.4+ for Wake Lock in standalone mode; OLED models have real burn-in risk.
   - Unclear: actual model/OS. Recommendation: ask the user; first plan task or checklist step records it.
2. **Worker URL / domain**
   - Known: `workers.dev` works; Google redirect URI must match exactly.
   - Unclear: whether the user wants a custom domain. Recommendation: start on `workers.dev`; the plan includes a manual step to create the OAuth client after the first deploy gives the URL.
3. **Name/icon for the Home Screen app** — Claude's discretion; use "IpadHub" and a simple dark icon generated during implementation.
4. **Does Guided Access allow Touch while keeping Auto-Lock disabled on the user's iPad?** Verify on device; if not, tap-to-wake (D-17) degrades to the Shortcut-based brightness approach only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev | yes | v25.6.1 | — |
| npm | Install | yes | 11.9.0 | — |
| Cloudflare account + wrangler login | Deploy, D1 | not checked (user action) | wrangler 4.151.2 via npm | Manual step in plan |
| Google Cloud project + OAuth client | /admin login | no (user action) | — | Manual step in plan (blocks deployed login only; local dev needs it too) |
| iPad on iPadOS 18.4+ | Soak/on-device verification | unknown | — | Verify at checkpoint |
| slopcheck | Package audit | yes | local | — |

**Missing dependencies with no fallback:** Cloudflare account and Google OAuth client must be created by the user; plan them as explicit `checkpoint:human-action` tasks.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Google OIDC (state, nonce, id_token verified with jose), email allowlist; device-code pairing |
| V3 Session Management | yes | 30-day HttpOnly Secure SameSite=Lax signed JWT cookie for admin; opaque 256-bit device token, hashed in D1, revocable |
| V4 Access Control | yes | `deviceAuth` on every data route; `adminAuth` on `/admin`; `user_id` scoping from first query |
| V5 Input Validation | yes | zod on all JSON bodies; code alphabet validation |
| V6 Cryptography | yes | `crypto.getRandomValues`, SHA-256 via WebCrypto, jose; no custom crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Pairing code guessing / brute force | Spoofing | 8-char code from 31-symbol alphabet (~8.5e11), 10 min expiry, single use, only an authenticated admin can approve, cap pending rows |
| Stolen device token | Spoofing / Info disclosure | HttpOnly cookie, hashed at rest, revoke in admin, 401 returns to pairing |
| CSRF on admin actions | Tampering | SameSite=Lax + `hono/csrf` Origin check |
| OAuth login CSRF / replay | Spoofing | `state` + `nonce` cookie, verify `aud`/`iss`/`exp` |
| Open redirect via callback | Tampering | Fixed redirect URI, no user-supplied return URL |
| Admin allowlist bypass (unverified email) | Elevation | Require `email_verified`, exact lower-cased match |
| Secrets in public repo | Info disclosure | `.dev.vars` ignored, `wrangler secret put`, `.dev.vars.example` only |
| Data endpoints cached by SW/CDN | Info disclosure | `Cache-Control: no-store`, SW ignores `/api` |
| Quota-exhaustion DoS on free plan | DoS | Accepted risk for a single-user app; 429 treated as transient on client |

## Sources

### Primary (HIGH confidence)
- npm registry (queried 2026-10-19): versions and peer dependencies of vite, @cloudflare/vite-plugin, @cloudflare/vitest-plugin, wrangler, hono, drizzle, jose, zod, react, tanstack query, tailwind
- https://developers.cloudflare.com/workers/platform/limits/ — Free plan: 100k requests/day, 10 ms CPU, 5 cron triggers, 50 subrequests
- https://developers.cloudflare.com/d1/platform/pricing/ — Free: 5M rows read/day, 100k written/day, 5 GB
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ — static asset requests free/unlimited; `run_worker_first` billed as Worker requests
- https://developers.cloudflare.com/workers/static-assets/binding/ — `run_worker_first` patterns, `!` negation
- https://developers.cloudflare.com/workers/vite-plugin/get-started/ — plugin setup, scripts
- https://developers.cloudflare.com/workers/testing/vitest-integration/ — `cloudflareTest`, `exports.default.fetch`, `applyD1Migrations`, vitest >= 4.1
- https://developers.google.com/identity/protocols/oauth2/web-server — auth params, incremental authorization, token endpoint

### Secondary (MEDIUM confidence)
- https://wwdcnotes.com/notes/wwdc23/10120 and https://bugs.webkit.org/show_bug.cgi?id=181849 — Home Screen apps have separate cookies/storage; cookies copied once at install
- https://bugs.webkit.org/show_bug.cgi?id=211775 — cookie deletion after 9 days non-use in Home Screen apps (via search summary)
- https://bugs.webkit.org/show_bug.cgi?id=254545 and https://progressier.com/pwa-capabilities/screen-wake-lock — Wake Lock in Home Screen apps fixed in iOS 18.4
- https://support.google.com/cloud/answer/15549945 — 7-day expiry for test users, exemption for openid/email-only requests (via search summary)

### Tertiary (LOW confidence)
- Nylas "fix-google-access-denied" cookbook — unverified production apps show a warning screen (third party)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version and peer constraint checked on the registry today
- Architecture: MEDIUM-HIGH — Cloudflare behaviour verified from docs; Vite plugin client+worker build layout to be confirmed on first build
- Pitfalls / iOS behaviour: MEDIUM — Home Screen cookie/wake-lock facts come from WebKit tracker and secondary sources, need on-device confirmation
- Google OAuth console specifics: MEDIUM

**Research date:** 2026-10-19
**Valid until:** 2026-11-18 (fast-moving: Cloudflare plugins and Vite majors)
