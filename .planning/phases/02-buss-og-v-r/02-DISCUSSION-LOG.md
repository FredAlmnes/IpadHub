# Phase 2: Buss og vær - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-20
**Phase:** 2-Buss og vær
**Areas discussed:** Stopp og innstillinger, Bussvisningen, Værvisningen

---

## Stopp og innstillinger

| Question | Options | Selected |
|---|---|---|
| Hvor settes stopp/gangtid/adresse | Admin-side på mobilen · Fast i konfig | Admin-side på mobilen |
| Hvilket stopp | Jeg skriver navnet · Velges på admin-siden | Skriver navnet → «Bakkegata Trondheim» (NSR:StopPlace:43577) |
| Retningsfilter | Velg plattform · Velg linjer · Begge | Velg plattform |
| Plattform | Ved Adressahuset · Ved Scandic Bakklandet · Begge i to kolonner | Ved Adressahuset (NSR:Quay:74792) |
| Gangtid | 2 · 4 · 6 min · Settes på admin-siden | 5 min (fritekst) |
| Lagre hjemkoordinater | Ja, i databasen · Bruk stoppets posisjon | Ja, i databasen |
| Hvordan oppgi adresse | Søk etter adresse · Stoppet som standard · Skriv koordinater | Søk etter adresse |

**Notes:** Stopp og plattformer ble slått opp live mot Entur (geocoder + Journey Planner) under diskusjonen.

---

## Bussvisningen

| Question | Options | Selected |
|---|---|---|
| Antall avganger | 3 · 5 · Neste per linje | 3 |
| Tidsformat | Minutter så klokkeslett · Alltid minutter · Alltid klokkeslett | Minutter så klokkeslett |
| «Gå om N min» | Én linje øverst · På hver rad | Én linje øverst |
| Avganger du ikke rekker | Vis dempet · Skjul | Vis dempet |
| Sanntid vs rutetid | Liten markør ved sanntid · Bare «ca.» ved rutetid | Liten markør ved sanntid |
| Avvik | Tekst + farge · Bare tekst | Tekst + farge |
| Ingen flere avganger | «Ingen avganger neste time» + første avgang · Bare «Ingen avganger» | Med første avgang |

---

## Værvisningen

| Question | Options | Selected |
|---|---|---|
| «Nå» (multi) | Temp + symbol · Nedbør neste time · Vind · Føles som | Temp + symbol, Nedbør neste time |
| Timesstripe | Hver time 8 t · Hver 2. time 12 t · Hver 3. time 12 t | Hver time, 8 t |
| Symboler | Yr/MET · Enkle linjeikoner | Yr/MET |
| Nedbør i stripen | Tall i mm · Søyler · Begge | Tall i mm |

---

## Claude's Discretion

- Plass i rutenettet (ikke valgt for diskusjon) — beholder 2×2
- Terskel minutter→klokkeslett, sanntidsmarkør, oransjefarge, fontstørrelser
- Oppdateringsstrategi/TTL og cron vs on-request

## Deferred Ideas

- To retninger, linjefilter, vind/føles som, nedbørssøyler, større felt for buss/vær
