# Phase 2: Buss og vær - Context

**Gathered:** 2026-10-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Fyller to av de fire modulplassene fra fase 1 med ekte data: **Buss** (sanntidsavganger fra Entur for én plattform, med «gå om N min») og **Vær** (MET Norway Locationforecast: nå + timesstripe). Begge implementeres som providers i `getProviders(env)` (`src/worker/providers/registry.ts`) og bruker den eksisterende snapshot-kontrakten, staleness-visningen («Oppdatert HH:MM», «· utdatert») og feilisoleringen («Utilgjengelig»). Fasen legger også til en innstillingsside på `/admin/innstillinger` der eieren setter stopp, plattform, gangtid og hjemadresse.

Krav: BUS-01–BUS-05, WTHR-01–WTHR-03. Kalender og e-post er IKKE med (fase 3–4); plassene deres forblir «Kommer snart».

</domain>

<decisions>
## Implementation Decisions

### Stopp og innstillinger
- **D-01:** Stopp, plattform, gangtid og hjemadresse settes på en ny admin-side `/admin/innstillinger` (mobil, server-rendret som resten av `/admin`, bak eksisterende `adminAuth` og CSRF). Ingen innstillinger på veggen, og ingen av disse verdiene i `wrangler.jsonc` (repoet er offentlig).
- **D-02:** Verdiene lagres per bruker i D1. Utvid `user_settings` (eller tilsvarende tabell med `user_id`) med f.eks. `stop_place_id`, `quay_id`, `walk_minutes`, `home_lat`, `home_lon`, `home_label`. Ny Drizzle-migrasjon, generert og applisert lokalt og remote (ikke `drizzle-kit push`).
- **D-03:** Eierens stopp er **Bakkegata, Trondheim** — `NSR:StopPlace:43577` (63.43234, 10.407248). Plattformen er **«ved Adressahuset» — `NSR:Quay:74792`** (mot sentrum: linje 1 Kattem via sentrum-Tiller, 12 Marienborg via sentrum, 22 Vestlia via sentrum). Den andre plattformen er `NSR:Quay:74793` «ved Scandic Bakklandet» (mot øst). Verdiene ble slått opp mot Entur 2026-10-20.
- **D-04:** Retningsfilter = valgt plattform (quay). Ingen linjefilter i denne fasen.
- **D-05:** Admin-siden lar eieren søke opp stopp etter navn (Entur geocoder, `layers=venue`), viser stoppets plattformer med `description` og eksempel-linjer/destinasjoner, og eieren velger én plattform.
- **D-06:** Gangtid til stoppet: **5 min** (standardverdi for eieren; redigerbar på innstillingssiden).
- **D-07:** Hjemadressen oppgis ved adressesøk på innstillingssiden (geokoding via Entur geocoder `layers=address` eller Kartverket); eieren bekrefter treffet. Koordinatene lagres i D1 avrundet til 4 desimaler (MET-krav). Mangler adresse, brukes stoppets koordinater som fallback.
- **D-08:** Når innstillinger mangler, viser modulen status `not_configured` (eksisterende) med en kort tekst som peker til `/admin/innstillinger`.

### Bussvisningen
- **D-09:** Vis **3** avganger fra valgt plattform.
- **D-10:** Tidsformat: **minutter** («4 min») når avgangen er under ~15 min unna, ellers **klokkeslett** («11:43»). «Nå» ved 0 min.
- **D-11:** «Gå om N min» vises som **én tydelig linje øverst** i modulen i aksentfargen (#8FB8DE): f.eks. «Gå om 3 min – rekker 12 Marienborg 11:26». Ved 0: «Gå nå». Beregnes som avgangstid − gangtid (D-06) − nå, ut fra forventet (sanntid) avgangstid.
- **D-12:** Avganger du **ikke rekker** (går om færre minutter enn gangtiden) vises **dempet** (gråtonet); «gå om»-linjen peker på neste avgang du rekker.
- **D-13:** Sanntid vs rutetid: **liten diskret markør** ved tider med sanntid; tider uten sanntid får «ca.» foran.
- **D-14:** Avvik: **innstilt** avgang vises gjennomstreket med «Innstilt» i rødt (eksisterende destructive #E5645A); **forsinket** avgang viser «+N min» i en dempet oransje ved siden av. (Ny oransje farge må inn i design-tokens; UI-fasen fastsetter verdien.)
- **D-15:** Ingen avganger den neste timen: «Ingen avganger neste time» + «Første avgang HH:MM».

### Værvisningen
- **D-16:** «Nå»: **temperatur + værsymbol** (stort) og **nedbør neste time** i mm. Ikke vind, ikke «føles som».
- **D-17:** Timesstripe: **hver time, 8 timer** frem — kolonner med klokkeslett, symbol, temperatur og nedbør.
- **D-18:** Nedbør i stripen vises som **tall i mm** (f.eks. «1,2»; norsk desimalkomma). Ingen søyler.
- **D-19:** Værsymboler: **MET/Yr sine offisielle symboler** (metno/weathericons, åpen lisens). Kildehenvisning «Data fra MET Norway» / Yr vises i modulen (WTHR-03); lisens/attribusjon dokumenteres.

### Claude's Discretion
- **Plass i rutenettet:** ikke diskutert — behold 2×2 fra fase 1 (Buss, Vær, Kalender, E-post). Tilpass innholdet så buss og vær er lesbare på 1–2 m innenfor sine felt.
- Nøyaktig terskel for minutter→klokkeslett (~15 min), sanntidsmarkørens form, oransjefargens verdi og fontstørrelser (fastsettes i UI-SPEC).
- Oppdateringsstrategi per provider (TTL/stale-while-revalidate for buss ~15–30 s, vær etter MET `Expires`), `staleAfterSec` per modul, og om polling skjer på forespørsel eller via Cron (research avgjør innen gratisnivået).
- Om symbolene leveres som statiske SVG-er i `public/` eller inline.
- Avrunding av temperatur (heltall) og visning av negative grader.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prosjekt og krav
- `.planning/PROJECT.md` — Constraints (gratisnivå, ingen hemmeligheter i offentlig repo)
- `.planning/REQUIREMENTS.md` — BUS-01–BUS-05, WTHR-01–WTHR-03
- `.planning/ROADMAP.md` §Phase 2 — Mål og suksesskriterier

### Fase 1 (bygger videre på)
- `.planning/phases/01-skall-enhetsparing-og-alltid-p-klokke/01-CONTEXT.md` — Layout, stil, natt og admin-beslutninger
- `.planning/phases/01-skall-enhetsparing-og-alltid-p-klokke/01-UI-SPEC.md` — Design-tokens (farger, typografi, spacing), modulramme, staleness-kopi
- `.planning/phases/01-skall-enhetsparing-og-alltid-p-klokke/01-07-SUMMARY.md` — Provider-registry, `buildSnapshot`, `ModuleFrame`, staleness-logikk
- `.planning/phases/01-skall-enhetsparing-og-alltid-p-klokke/01-04-SUMMARY.md` — Admin-sider, `adminAuth`, CSRF, view-mønster
- `.planning/phases/01-skall-enhetsparing-og-alltid-p-klokke/01-REVIEW.md` — Åpne robusthetsfunn (WR-01 rate limiting m.m.) som ikke må forverres

### Research
- `.planning/research/STACK.md` — Entur (`ET-Client-Name`, GraphQL v3) og MET (User-Agent, 4 desimaler, `Expires`/`If-Modified-Since`) regler
- `.planning/research/PITFALLS.md` — Entur/MET-fallgruver, DST/Oslo-tid

### Eksterne API-er
- Entur Journey Planner v3: `POST https://api.entur.io/journey-planner/v3/graphql` (`quay(id){ estimatedCalls{ realtime cancellation expectedDepartureTime aimedDepartureTime destinationDisplay{frontText} serviceJourney{line{publicCode}} } }`)
- Entur Geocoder: `https://api.entur.io/geocoder/v1/autocomplete` (`layers=venue` for stopp, `layers=address` for adresse)
- MET Locationforecast 2.0 compact: `https://api.met.no/weatherapi/locationforecast/2.0/compact` + vilkår https://api.met.no/doc/TermsOfService
- MET værsymboler: https://github.com/metno/weathericons

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/worker/providers/registry.ts` — `getProviders(env)`: bytt `notConfiguredProvider("bus", 180)` og `notConfiguredProvider("weather", 5400)` med ekte providers.
- `src/worker/providers/types.ts` — `Provider { key, staleAfterSec, get({env, user, now}) }`.
- `src/worker/snapshot.ts` — `buildSnapshot` med `Promise.allSettled` og validering; feil blir `{status:"error"}` uten å lekke melding.
- `src/shared/contract.ts` — Zod-kontrakten for snapshot; modul-DTO-er for buss og vær legges her.
- `src/client/features/display/ModuleFrame.tsx`, `ModuleGrid.tsx`, `PlaceholderModule.tsx` — rammen og 2×2-gridet; bytt plassholder med `BusModule`/`WeatherModule`.
- `src/client/lib/staleness.ts` — staleness/«Oppdatert HH:MM».
- `src/shared/oslo-time.ts` — Oslo-tid-hjelpere (bruk for klokkeslett og «neste time»).
- `src/worker/routes/admin.ts`, `src/worker/views/admin-pages.ts`, `src/worker/views/layout.ts` — mønster for nye admin-sider og skjemaer (CSRF via `hono/csrf`).
- `src/worker/db/schema.ts` — `user_settings` (har `night_start`/`night_end`) utvides.

### Established Patterns
- Alle eksterne kall fra Worker, aldri fra klient. Zod på grensen.
- Admin er server-rendret Hono-HTML, fungerer uten JS.
- Tester: vitest `worker`-prosjekt (e2e mot Worker) og `pure`-prosjekt (ren logikk). Mock `fetch` for eksterne API-er.

### Integration Points
- `user_settings` → providers via `UserContext` (user_id).
- Snapshot `config` (fra fase 1) kan bære f.eks. gangtid hvis klienten trenger den til nedtelling mellom polls.

</code_context>

<specifics>
## Specific Ideas

- Linjen «Gå om 3 min – rekker 12 Marienborg 11:26» øverst i bussmodulen, i aksentfarge.
- Tidsformat som på holdeplass-skjermene i Trondheim/AtB: minutter når nært, klokkeslett ellers.
- Trondheim er vindfullt, men eieren valgte bort vind i denne omgang.

</specifics>

<deferred>
## Deferred Ideas

- Begge plattformer / to retninger i to kolonner — ikke valgt; ROADMAP sier én retning.
- Linjefilter (bare bestemte linjer) — ikke valgt nå.
- Vind og «føles som» i værmodulen — valgt bort for nå.
- Nedbørssøyler som på Yr — valgt bort til fordel for tall.
- Paraply-hint og dagens høy/lav (EXTRA-03) — står i v2/Out of Scope fra før.
- Større plass til buss/vær i rutenettet — ikke diskutert; 2×2 beholdes.

</deferred>

---

*Phase: 02-buss-og-v-r*
*Context gathered: 2026-10-20*
