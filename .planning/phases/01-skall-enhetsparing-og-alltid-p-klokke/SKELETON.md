# Walking Skeleton — IpadHub

**Phase:** 1
**Generated:** 2026-10-19
**Plans that build it:** 01-01 (paringskode), 01-02 (godkjent iPad viser klokken), 01-03 (kjører i skyen)

## Capability Proven End-to-End

Hjemskjerm-appen på iPaden får en ekte paringskode fra Workeren (lagret hashet i D1). Når koden godkjennes, setter poll-svaret en HttpOnly enhets-cookie inne i appen, og appen bytter til en stor norsk klokke som henter `/api/snapshot` med cookien. Alt kjører på den deployede `workers.dev`-adressen.

Skjelettets godkjenning skjer med owner-only CLI-skriptet `npm run pair:approve` (krever Cloudflare-innlogging). Godkjenning fra mobilen med Google-innlogging på `/admin` kommer i den første skiven etter skjelettet (01-04). Skriptet blir værende som nødparing.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework (klient) | Vite 8.3.4 + React 19.3.1 + TypeScript ~5.9, Tailwind 4.3.3, TanStack Query 5.104.5 | En enkelt SPA-skjerm; Vite har en førsteklasses Cloudflare-plugin; TanStack Query gir polling, retry og reconnect |
| Backend | Én Cloudflare Worker med Hono 4.13.13, bygget via `@cloudflare/vite-plugin` 1.64.0, deployet med wrangler 4.151.2 | Gratisnivå holder (100k forespørsler/dag); SPA og API i én deploy; ingen kalde starter |
| Statiske filer | Workers static assets, `not_found_handling: "single-page-application"`, `run_worker_first: ["/api/*", "/admin", "/admin/*", "/auth/*"]` | Statiske filer er gratis og ubegrensede; bare dynamiske stier telles som Worker-forespørsler |
| Data layer | Cloudflare D1 (SQLite) + Drizzle ORM 0.45.4. Migrasjoner: `drizzle-kit generate` -> `drizzle/*.sql` -> `wrangler d1 migrations apply ipadhub --local/--remote`. Aldri `drizzle-kit push` mot D1 | Relasjonelt og `user_id`-scopet fra første rad, så flere brukere senere ikke krever omskriving |
| Tabeller | `users`, `devices`, `pairing_requests`, `user_settings` (tidspunkter som integer unix-ms) | Hele fase 1-modellen i én migrasjon; senere faser legger til egne tabeller |
| Enhetsautentisering | Device-code-paring (iPaden viser kode, eier godkjenner). 256-bit tilfeldig token, bare SHA-256-hash i D1, levert kun som `device`-cookie (HttpOnly, Secure på https, SameSite=Lax, Max-Age 400 dager, glidende fornyelse). Kun eksakt HTTP 401 fra `/api/snapshot` sender iPaden til paringsskjermen | iOS hjemskjerm-apper har egen cookie-krukke; cookien må settes av et svar til en forespørsel fra den installerte appen |
| API-tilgang | Default-deny: alt under `/api/*` unntatt `/api/pair/*` krever gyldig enhets-cookie; `Cache-Control: no-store` på alle `/api/*`-svar | Nye data-endepunkter i fase 2-4 er beskyttet automatisk (SEC-02) |
| Admin-autentisering (01-04) | Google OIDC authorization-code (`openid email`), id_token verifisert med jose 6.2.12 mot Googles JWKS, e-post-allowlist i secret `ADMIN_EMAILS`, 30-dagers HS256-økt-cookie `admin_session`, `hono/csrf` på POST | Én bruker, én leverandør; samme OAuth-klient utvides med kalender/Gmail-scopes i fase 3 |
| Admin-UI | Server-rendret HTML fra Hono (`hono/html`), CSS fra Tailwind kompilert og innebygd via `?inline`-import | Ingen klient-bundle, ingen service worker-innblanding, fungerer uten JS |
| Kontrakt | `src/shared/contract.ts` (Zod): `Snapshot { serverTime, version, config{nightStart,nightEnd,timezone}, modules{bus,weather,calendar,mail: {data, fetchedAt, status, staleAfterSec, error?}} }` | Felles type for Worker og klient; per-modul-status er mønsteret fase 2-4 fyller |
| Tid | `src/shared/oslo-time.ts`: alt går gjennom `Intl.DateTimeFormat(..., {timeZone: "Europe/Oslo", hourCycle: "h23"}).formatToParts`; ISO-uke beregnes fra Oslo-dato | DST og UTC/Oslo-datogrense feiler stille ellers |
| Test | vitest 5.0.5 med to prosjekter: `pure` (node: `src/shared`, `src/client/lib`) og `worker` (`@cloudflare/vitest-plugin` 1.4.5, ekte D1-binding, migrasjoner via `readD1Migrations`/`applyD1Migrations`, forespørsler via `app.request(url, init, env)`) | Auth- og paringslogikk testes mot ekte workerd + D1 |
| Deployment target | Cloudflare Workers, `https://ipadhub.<subdomene>.workers.dev` (URL-en registreres i 01-03-SUMMARY) | Gratis, ett deploy-mål; egen domene kan legges til senere |
| Hemmeligheter | `.dev.vars` lokalt (gitignored), `wrangler secret put` i produksjon, bare `.dev.vars.example` med plassholdere i repoet | Repoet er offentlig |
| Directory layout | `src/worker/{app.ts,index.ts,env.ts,routes/,middleware/,lib/,db/,views/,providers/}`, `src/client/{main.tsx,App.tsx,api.ts,features/{pairing,display}/,hooks/,lib/}`, `src/shared/{contract.ts,oslo-time.ts,theme.css}`, `src/admin/admin.css`, `public/`, `drizzle/`, `scripts/`, `test/`, `docs/` | Worker/klient/delt-skille; `providers/` er der fase 2-4 legger modulene sine |

## Stack Touched in Phase 1

- [ ] Project scaffold (Vite + React + Worker + Hono, `tsc -b`, vitest `pure` + `worker`) — 01-01
- [ ] Routing — `POST /api/pair/start`, `POST /api/pair/poll`, `GET /api/snapshot`, SPA-fallback — 01-01/01-02
- [ ] Database — ekte skriving (`pairing_requests`, `devices`) og ekte lesing (enhetsoppslag på token-hash, `user_settings`) — 01-01/01-02
- [ ] UI — paringsskjermen henter kode og poller API-et, og bytter til klokkeskjermen som poller `/api/snapshot` — 01-01/01-02
- [ ] Deployment — kjører på `workers.dev` med fjern-D1; lokal fullstack-kjøring dokumentert i `README.md` (`npm run db:migrate:local && npm run dev`, deretter `npm run pair:approve -- --local --code XXXX-XXXX --email du@example.com`) — 01-02/01-03

## Out of Scope (Deferred to Later Slices)

- Skjelettet har ingen Google-innlogging; godkjenning skjer med CLI-skriptet. `/admin` (innlogging, godkjenning, enhetsliste, tilbaketrekking, `/admin/oppsett`) kommer i 01-04.
- Dato, ukenummer, nattmodus, drift og Wake Lock på klokken (01-05).
- Manifest, ikoner, service worker, daglig reload og reload ved ny versjon (01-06).
- Modulplasser, data-alder, offline-markør og feilisolering per modul (01-07).
- Ingen buss, vær, kalender eller e-post (fase 2-4). Ingen KV-cache, ingen cron (fase 2). Ingen Google-tokens med offline-tilgang (fase 3, SEC-04).
- Ingen egen domene, ingen Cloudflare Access, ingen flere brukere i UI.

## Subsequent Slice Plan

Each later plan or phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- 01-04: Eieren logger inn på `/admin` med Google på mobilen, godkjenner iPad-koden, ser enhetene og trekker tilbake tilgang; oppsettsjekklisten ligger på `/admin/oppsett`
- 01-05: Klokken viser dato og uke riktig i Oslo-tid, skjermen holdes våken, bytter til nattmodus og flytter seg mot innbrenning
- 01-06: Appen installeres som fullskjerm-PWA og laster seg selv på nytt daglig, ved ny versjon og når data har stoppet opp
- 01-07: Skjermen viser fire modulplasser som hver viser alder, utdatert/feil-tilstand og en global offline-markør; én feilende modul påvirker ikke resten
- 01-08: Alt er satt opp i skyen med Google-innlogging og bekreftet på den ekte iPaden over natten
- Phase 2: Buss (Entur) og vær (MET) som providere i `src/worker/providers/` og fyll i Buss/Vær-plassene
- Phase 3: Google-tilkobling (samme OAuth-klient, inkrementelle scopes) og kalender i Kalender-plassen
- Phase 4: AI-vurdert viktig e-post i E-post-plassen
