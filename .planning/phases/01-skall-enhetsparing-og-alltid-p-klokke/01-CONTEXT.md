# Phase 1: Skall, enhetsparing og alltid-på klokke - Context

**Gathered:** 2026-10-19
**Status:** Ready for planning

<domain>
## Phase Boundary

En paret iPad (liggende, iPadOS 18.4+) som viser en stor norsk klokke i fullskjerm døgnet rundt som hjemskjerm-PWA. Bare den parede enheten får tilgang til data. Den tåler en natt uten tilsyn: holder seg våken, oppdaterer seg selv, viser data-alder og offline-status, isolerer feil per modul, bytter til nattmodus og flytter innholdet mot innbrenning. Den laster seg på nytt daglig og ved ny versjon.

Fasen leverer også backend-skjelettet (Cloudflare Worker + Hono + D1 med `user_id`), snapshot-endepunktet med per-modul-status, en admin-side på mobilen med Google-innlogging for paring og tilbaketrekking av enheter, samt oppsettsjekklisten for iPaden.

Krav: DISP-01–DISP-10, SEC-01–SEC-03. Buss, vær, kalender og e-post er IKKE med. De kommer i fase 2–4, men layouten må ha plass til dem.

</domain>

<decisions>
## Implementation Decisions

### Utseende og layout
- **D-01:** Liggende orientering (landscape) er det eneste målet. Stående trenger ikke egen layout.
- **D-02:** Mørkt tema på dagvisningen: sort/nesten-sort bakgrunn med lys tekst. Nattmodus er en enda mer dempet variant av samme uttrykk.
- **D-03:** Minimalistisk stil: mye luft, store tall, få farger (tenk Apple-widgets / MagicMirror). Ingen kort/fliser med tunge bakgrunner.
- **D-04:** Lesbar på 1–2 meters avstand (forbi i gangen). Hovedtall (klokke, senere bussminutter) skal være store; detaljtekst kan være mindre.
- **D-05:** Én dempet aksentfarge brukes sparsomt for uthevinger (f.eks. «neste»-hendelse, «gå nå» i senere faser). Resten er gråtoner.
- **D-06:** Systemfonten (SF Pro via `-apple-system`/`system-ui`). Ingen webfont-nedlasting. Bruk tabulære tall (`font-variant-numeric: tabular-nums`) så klokken ikke hopper.
- **D-07:** I fase 1 vises plassholdere (diskrete rammer/etiketter) der buss, vær, kalender og e-post skal komme. Layout-gridet etableres nå, så senere faser bare fyller inn moduler.

### Paringsflyten
- **D-08:** Engangskoden kommer fra en admin-side (`/admin`) som eieren åpner på mobilen. Admin-siden skal senere også romme Google-tilkobling for kalender/Gmail (fase 3).
- **D-09:** Innlogging på admin-siden skjer med «Logg inn med Google» (OpenID Connect, bare `openid email`-scopes i denne fasen). Bare eierens e-postadresse (allowlist i konfig/secret) slipper inn. Konsekvens: Google OAuth-klienten opprettes allerede i fase 1, og consent screen bør settes til «In production» fra start. Fase 3 utvider samme klient med `calendar.readonly`/`gmail.readonly` (inkrementell autorisasjon).
- **D-10:** Admin-økten varer 30 dager (HttpOnly, Secure-cookie), skilt fra enhetstokenet.
- **D-11:** Admin-siden viser en liste over parede enheter med navn (f.eks. «Stue-iPad») og «sist sett»-tid, og en «Trekk tilbake»-knapp per enhet.
- **D-12:** Når en enhet trekkes tilbake eller tokenet blir ugyldig (401), går iPaden umiddelbart tilbake til paringsskjermen.
- **D-13:** Enhetstokenet er permanent til det trekkes tilbake. Det lagres hashet i D1, og iPaden skal aldri vise en innloggingsskjerm i normal drift (SEC-01).

### Nattmodus
- **D-14:** Fast tidsrom, standard 23:00–06:00 Europe/Oslo-tid, konfigurerbart (samme hver dag, ingen egen helgeregel).
- **D-15:** Natt-visningen er bare klokken: små/dempede grå tall på sort bakgrunn som sakte flytter seg (burn-in-drift). Plassholdere og moduler skjules.
- **D-16:** Myk fade over noen sekunder mellom dag- og nattvisning.
- **D-17:** Et trykk på skjermen om natten viser full dagsvisning midlertidig i 1–2 minutter, og går så tilbake til nattmodus.
- **D-18:** Oppsettsjekklisten (DISP-10) inkluderer instruksjoner for en Snarveier-automasjon som dimmer iPadens lysstyrke kl. 23:00 og øker den kl. 06:00, siden en nettside ikke kan styre lysstyrken.

### Claude's Discretion
- **Klokkens plassering og dominans i layouten:** brukeren valgte «du bestemmer». Velg det som gir best lesbarhet på 1–2 m og plass til buss/vær/kalender/e-post senere, f.eks. en stor klokke/dato øverst eller i venstre kolonne.
- **Paringsretning:** brukeren valgte «du bestemmer». Anbefalt: iPaden viser en kort kode (eller QR), og eieren godkjenner den på admin-siden på mobilen (Apple TV/Netflix-mønster). iPaden poller til den er godkjent og får da token-cookien satt *inne i* den installerte PWA-en. Det unngår problemet med separat cookie-lager mellom Safari og hjemskjerm-appen, og krever ingen tasting på iPaden. Alternativet (taste inn en 6-sifret kode på iPaden) er akseptabelt hvis research viser at det er enklere.
- **Visning av gamle data og offline-status (DISP-05):** ikke diskutert. Hold det i den minimalistiske stilen: et diskret «oppdatert HH:MM» per modul, som tydelig endrer seg (f.eks. dempet/gråtonet innhold og en liten markør) når data er eldre enn modulens terskel, pluss en global, diskret offline-markør. Ingen store varselbannere.
- Daglig reload-tidspunkt (forslag ca. 03:30 i nattmodus), versjonssjekk og tekniske detaljer for watchdog, polling og backoff.
- Konkret aksentfarge og nøyaktige fontstørrelser.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prosjekt og krav
- `.planning/PROJECT.md` — Visjon, constraints (Cloudflare gratisnivå, iPadOS 18.4+, én bruker men `user_id` fra start), key decisions
- `.planning/REQUIREMENTS.md` — DISP-01–DISP-10 og SEC-01–SEC-03 er fasens krav
- `.planning/ROADMAP.md` §Phase 1 — Mål og suksesskriterier

### Research
- `.planning/research/SUMMARY.md` — Samlet anbefaling: stack, arkitektur, fallgruver, fase 1-flagg
- `.planning/research/STACK.md` — Vite + React + TS, Hono på Workers, D1/Drizzle, jose, vite-plugin-pwa; versjoner
- `.planning/research/ARCHITECTURE.md` — Snapshot-endepunkt `{data, fetchedAt, status}`, device pairing, `UserContext`, multi-user-forberedelse
- `.planning/research/PITFALLS.md` — Alltid-på iPad (Wake Lock, Guided Access, minne, service worker), privat skjerm, DST/Oslo, burn-in

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Ingen. Greenfield-prosjekt; repoet inneholder bare `.planning/`, `CLAUDE.md` og `.gitignore`.

### Established Patterns
- Ingen ennå. Fase 1 etablerer mønstrene alle senere faser følger: provider-funksjoner `(UserContext) -> DTO`, snapshot-kontrakten med per-modul-status, layout-grid med modulplasser, og auth-middleware for enhetstoken og admin-økt.

### Integration Points
- GitHub-repo: https://github.com/FredAlmnes/IpadHub (offentlig, så hemmeligheter må aldri committes; `.gitignore` dekker `.dev.vars` og `.env*`)
- Cloudflare-konto og Google Cloud OAuth-klient må opprettes av brukeren. Planen bør inneholde tydelige manuelle steg for dette.

</code_context>

<specifics>
## Specific Ideas

- Referanse for uttrykk: Apple-widgets / MagicMirror². Mørkt, rolig og glanceable.
- Paring som på Apple TV/Netflix: iPaden viser en kode, mobilen godkjenner.
- Lysstyrke-automasjon i Snarveier-appen som en del av sjekklisten.

</specifics>

<deferred>
## Deferred Ideas

- Morgendagens første avtale i nattvisningen vurderes når kalenderen finnes (fase 3). Brukeren valgte bare klokken om natten for nå.
- Egne helge-tider for nattmodus ble ikke valgt. Kan legges til senere som en konfigurasjonsendring.

</deferred>

---

*Phase: 01-skall-enhetsparing-og-alltid-p-klokke*
*Context gathered: 2026-10-19*
