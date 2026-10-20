# Roadmap: IpadHub

## Overview

IpadHub bygges som vertikale skiver, der hver fase gir en iPad som kan brukes i dagligstuen. Fase 1 gir en sikker, alltid-på klokke i fullskjerm som tåler en natt uten tilsyn. Fase 2 legger til buss og vær (ingen OAuth). Fase 3 kobler til Google og viser kalenderen. Fase 4 legger til AI-vurdert viktig e-post, som er den mest risikofylte delen og derfor kommer sist. Handleliste og stemme (v2) er ikke med i denne roadmapen.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Skall, enhetsparing og alltid-på klokke** - Sikker fullskjerm-PWA med klokke, nattmodus, selvoppdatering og staleness-visning
- [ ] **Phase 2: Buss og vær** - Sanntidsavganger fra Entur og vær fra MET på skjermen
- [ ] **Phase 3: Google-tilkobling og kalender** - Google OAuth med varig tilkobling og dagens kalender
- [ ] **Phase 4: Viktig e-post med AI** - Gmail-meldinger som krever handling, vurdert av Claude med kostnadstak

## Phase Details

### Phase 1: Skall, enhetsparing og alltid-på klokke

**Goal**: Brukeren har en paret iPad som viser en stor norsk klokke i fullskjerm døgnet rundt, bare tilgjengelig for den parede enheten, og som tåler en natt uten tilsyn
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04, DISP-05, DISP-06, DISP-07, DISP-08, DISP-09, DISP-10, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):

  1. Bruker kan legge appen på hjemskjermen, pare iPaden én gang med en engangskode og deretter åpne den i fullskjerm uten nettleserlinjer og uten innloggingsskjerm
  2. Skjermen viser stor klokke (24t, uten sekunder) med dato og ukenummer på norsk i Europe/Oslo-tid, også over sommer-/vintertid-skiftet
  3. Skjermen forblir våken og oppdaterer seg selv uten berøring, viser når hver modul sist ble oppdatert, markerer gamle data eller offline, og én feilende modul påvirker ikke resten
  4. Om natten bytter skjermen til en mørk, dempet visning med bare klokken, og innholdet flytter seg litt over tid mot innbrenning
  5. En forespørsel uten gyldig enhetstoken avvises, og bruker kan trekke tilbake tilgangen til en paret enhet; appen laster seg selv på nytt daglig og ved ny versjon, og oppsettsjekklisten for iPaden er fulgt

**Plans:** 5/8 plans executed
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Skjelett A: scaffold, D1-skjema, iPaden viser en ekte paringskode, default-deny /api

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Skjelett B: godkjenning -> enhets-cookie -> klokke, snapshot-kontrakt, 401 -> paring, CLI-godkjenning

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Skjelett C: Cloudflare-innlogging, fjern-D1 og deploy til workers.dev
- [x] 01-04-PLAN.md — Admin på mobilen: Google-innlogging, godkjenn, enheter, trekk tilbake, /admin/oppsett
- [x] 01-05-PLAN.md — Klokke med dato/uke i Oslo-tid, Wake Lock, nattmodus, tap-to-wake og drift

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-06-PLAN.md — Hjemskjerm-PWA: manifest, ikoner, service worker, daglig/versjon/watchdog-reload
- [ ] 01-07-PLAN.md — Modulplasser med data-alder, offline-markør og feilisolering per modul

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-08-PLAN.md — Go-live: Google OAuth-klient og secrets, deploy, bekreftelse på ekte iPad over natten

**UI hint**: yes

### Phase 2: Buss og vær

**Goal**: Brukeren ser på ett blikk når bussen går og hvordan været blir, og vet når hen må gå
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: BUS-01, BUS-02, BUS-03, BUS-04, BUS-05, WTHR-01, WTHR-02, WTHR-03
**Success Criteria** (what must be TRUE):

  1. Bruker ser de neste avgangene fra nærmeste stopp med linje, destinasjon og minutter til avgang, bare for plattformen/retningen bruker faktisk tar
  2. Bruker ser om hver tid er sanntid eller rutetid, og forsinkede og innstilte avganger er tydelig markert
  3. Bruker ser «gå om N min» basert på konfigurert gangtid
  4. Bruker ser været nå (temperatur, symbol, nedbør) og en timesstripe for de neste 8-12 timene, med kildehenvisning til MET Norway / Yr

**Plans**: TBD
**UI hint**: yes

### Phase 3: Google-tilkobling og kalender

**Goal**: Brukeren har koblet Google-kontoen én gang og ser dagens avtaler på skjermen, uten at tilkoblingen forsvinner etter en uke
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SEC-04, CAL-01, CAL-02, CAL-03, CAL-04, CAL-05, CAL-06
**Success Criteria** (what must be TRUE):

  1. Bruker kan koble Google-kontoen én gang, og kalenderen fortsetter å vises etter mer enn 7 dager uten ny innlogging
  2. Bruker ser dagens hendelser med heldagshendelser skilt ut, og pågående og neste hendelse er uthevet
  3. Om kvelden (etter konfigurerbart klokkeslett) ser bruker morgendagens første avtale, og visningen ruller over til ny dag ved midnatt
  4. Hvis Google-tilkoblingen slutter å virke, ser bruker en tydelig «koble til på nytt»-melding i stedet for at modulen forsvinner
  5. Google-tokens og API-nøkler finnes bare på serveren og kan ikke leses i klienten

**Plans**: TBD
**UI hint**: yes

### Phase 4: Viktig e-post med AI

**Goal**: Brukeren ser bare de innkommende e-postene som krever handling, med en kort norsk begrunnelse, til lav og forutsigbar kostnad
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: MAIL-01, MAIL-02, MAIL-03, MAIL-04, MAIL-05, MAIL-06
**Success Criteria** (what must be TRUE):

  1. Bruker ser en liste over innkommende mailer der noen ber om noe, stiller spørsmål eller venter på svar, pluss mailer med frister, regninger og betalinger
  2. Hver flagget mail viser avsender, emne og en kort begrunnelse på én linje på norsk
  3. Mailer som er besvart, arkivert eller lest og håndtert forsvinner fra listen
  4. Reklame og sosiale mailer vurderes aldri, hver mail vurderes bare én gang med minimalt innhold sendt til AI, og et daglig tak stopper AI-bruken når grensen nås

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 (Fase 2 og 3 er uavhengige av hverandre og kan bytte rekkefølge.)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Skall, enhetsparing og alltid-på klokke | 5/8 | In Progress|  |
| 2. Buss og vær | 0/TBD | Not started | - |
| 3. Google-tilkobling og kalender | 0/TBD | Not started | - |
| 4. Viktig e-post med AI | 0/TBD | Not started | - |
