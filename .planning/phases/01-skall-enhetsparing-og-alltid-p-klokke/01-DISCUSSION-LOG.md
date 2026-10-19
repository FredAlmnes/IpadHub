# Phase 1: Skall, enhetsparing og alltid-på klokke - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-19
**Phase:** 1-Skall, enhetsparing og alltid-på klokke
**Areas discussed:** Utseende og layout, Paringsflyten, Nattmodus

---

## Utseende og layout

| Option | Description | Selected |
|--------|-------------|----------|
| Liggende | Bred skjerm, klokke + 2–3 kolonner | ✓ |
| Stående | Moduler stablet | |
| Begge | Tilpasser seg rotasjon | |

| Option | Description | Selected |
|--------|-------------|----------|
| Mørkt | Mørk bakgrunn, lys tekst | ✓ |
| Lyst | Papir-uttrykk | |
| Følger tid på døgnet | Lyst dag, mørkt kveld | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stor topp-stripe | Klokke øverst over hele bredden | |
| Venstre kolonne | Klokke + dato + vær til venstre | |
| Du bestemmer | Best lesbarhet | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Minimalistisk | Mye luft, store tall | ✓ |
| Kort/fliser | Avrundede kort | |
| Informasjonstett | Avgangstavle | |

| Option | Description | Selected |
|--------|-------------|----------|
| Over rommet (2–4 m) | Svært store tall | |
| Forbi i gangen (1–2 m) | Store hovedtall, mindre detaljtekst | ✓ |
| Ved benken (<1 m) | Mer tekst | |

| Option | Description | Selected |
|--------|-------------|----------|
| Én dempet farge | Sparsom aksent | ✓ |
| Kun gråtoner | Ingen farge | |
| Du bestemmer | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Bare klokken, sentrert | Ren skjerm | |
| Plassholdere | Rammer der moduler kommer | ✓ |
| Statusmodul | Systemmodul | |

| Option | Description | Selected |
|--------|-------------|----------|
| Systemfont (SF Pro) | Ingen nedlasting | ✓ |
| Inter / lignende | Webfont | |
| Du bestemmer | | |

**User's choice:** Liggende, mørkt, minimalistisk, 1–2 m, én dempet aksentfarge, plassholdere, systemfont. Klokkens plassering: Claude bestemmer.

---

## Paringsflyten

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-side på mobilen | /admin, gjenbrukes senere | ✓ |
| Kommando i terminalen | Script på Mac | |
| Begge | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare Access | E-postkode fra Cloudflare | |
| Passkey (Face ID) | | |
| Logg inn med Google | Kun eierens e-post | ✓ |
| Du bestemmer | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Skriv inn kode | 6-sifret kode på iPaden | |
| iPaden viser kode | Godkjenn på mobil | |
| Du bestemmer | | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Tilbake til paringsskjerm | Umiddelbart | ✓ |
| Diskret melding | Klokken fortsetter | |

| Option | Description | Selected |
|--------|-------------|----------|
| Liste med navn + sist sett | Med Trekk tilbake-knapp | ✓ |
| Bare «trekk tilbake alle» | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Kort (1 time) | | |
| Lang (30 dager) | | ✓ |
| Du bestemmer | | |

**User's choice:** Admin-side med Google-innlogging, 30-dagers økt, enhetsliste med sist sett, tilbake til paringsskjerm ved ugyldig token. Paringsretning: Claude bestemmer.
**Notes:** Google-innlogging betyr at OAuth-klienten opprettes allerede i fase 1 (kun `openid email`).

---

## Nattmodus

| Option | Description | Selected |
|--------|-------------|----------|
| Fast tidsrom | Konfigurerbart | ✓ |
| Fast, ulikt i helg | | |
| Etter sol | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Bare klokken, dempet | Driftende grå tall | ✓ |
| Klokke + neste avtale | | |
| Helt sort | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Full visning i 1–2 min | Ved trykk | ✓ |
| Ingenting | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, i sjekklisten | Snarveier-automasjon for lysstyrke | ✓ |
| Nei | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Myk fade | | ✓ |
| Brått bytte | | |

| Option | Description | Selected |
|--------|-------------|----------|
| 23:00–06:00 | | ✓ |
| 22:00–06:30 | | |
| 00:00–07:00 | | |

**User's choice:** Fast 23:00–06:00, bare dempet klokke, myk fade, trykk gir 1–2 min full visning, lysstyrke-snarvei i sjekklisten.

---

## Claude's Discretion

- Klokkens plassering i layouten
- Paringsretning (anbefalt: iPaden viser kode, mobilen godkjenner)
- Visning av gamle data/offline (ikke valgt for diskusjon)
- Reload-tidspunkt, watchdog, aksentfarge, fontstørrelser

## Deferred Ideas

- Morgendagens første avtale i nattvisningen (vurderes i fase 3)
- Egne helgetider for nattmodus
