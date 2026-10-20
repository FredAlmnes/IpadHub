# Requirements: IpadHub

**Defined:** 2026-10-19
**Core Value:** Et raskt blikk på iPaden gir meg det jeg trenger for å komme meg ut døra og holde oversikt over dagen: buss, vær, kalender og hva i innboksen som krever handling.

## v1 Requirements

Krav til første versjon («bare visningen»). Hvert krav kobles til en fase i roadmapen.

### Display (skjerm og skall)

- [x] **DISP-01**: Bruker kan legge appen på iPadens hjemskjerm og åpne den i fullskjerm uten nettleserlinjer (standalone PWA)
- [x] **DISP-02**: Bruker ser en stor klokke (24t, uten sekunder) med dato og ukenummer på norsk, alltid i Europe/Oslo-tid, også rundt sommer- og vintertid
- [x] **DISP-03**: Skjermen holder seg våken hele døgnet via Screen Wake Lock (iPadOS 18.4+), som hentes på nytt når appen blir synlig igjen
- [x] **DISP-04**: Hver modul oppdaterer seg selv i bakgrunnen uten at bruker rører skjermen, og henter nye data når nettet kommer tilbake
- [x] **DISP-05**: Bruker ser per modul når dataene sist ble oppdatert, og får en tydelig markering når data er gamle eller appen er offline
- [x] **DISP-06**: Når én modul feiler, fungerer resten av skjermen som normalt
- [x] **DISP-07**: Om natten (konfigurerbart tidsrom) bytter skjermen automatisk til en mørk, dempet visning med bare klokken
- [x] **DISP-08**: Innholdet flytter seg litt med jevne mellomrom for å unngå innbrenning
- [x] **DISP-09**: Appen laster seg selv inn på nytt én gang i døgnet og når en ny versjon er publisert, uten at bruker må gjøre noe
- [x] **DISP-10**: Bruker følger en oppsettsjekkliste for iPaden (Auto-Lock, Guided Access, lading, lysstyrke-snarvei)

### Security (tilgang)

- [x] **SEC-01**: Bruker kan pare iPaden én gang med en engangskode og forblir innlogget permanent uten å se en innloggingsskjerm
- [x] **SEC-02**: Alle data-endepunkter avviser forespørsler uten gyldig enhetstoken, så private data (kalender og e-post) ikke kan leses av andre
- [x] **SEC-03**: Bruker kan trekke tilbake tilgangen til en paret enhet
- [ ] **SEC-04**: Google-tokens og API-nøkler ligger kun på serveren (krypterte i databasen eller som secrets) og sendes aldri til klienten

### Bus (kollektiv)

- [ ] **BUS-01**: Bruker ser de neste avgangene fra nærmeste busstopp med linje, destinasjon og minutter til avgang (Entur)
- [ ] **BUS-02**: Bruker ser om en avgangstid er sanntid eller rutetid
- [ ] **BUS-03**: Bruker ser tydelig markering av forsinkede og innstilte avganger
- [ ] **BUS-04**: Bare avganger fra plattformen eller retningen bruker faktisk tar vises
- [ ] **BUS-05**: Bruker ser «gå om N min» basert på en konfigurert gangtid til stoppet

### Weather (vær)

- [ ] **WTHR-01**: Bruker ser været akkurat nå (temperatur, symbol, nedbør) for hjemadressen (MET Norway)
- [ ] **WTHR-02**: Bruker ser en timesstripe for de neste 8–12 timene med temperatur og nedbør
- [ ] **WTHR-03**: Værdata vises med påkrevd kildehenvisning til MET Norway / Yr

### Calendar (kalender)

- [ ] **CAL-01**: Bruker kan koble Google-kontoen sin én gang, og tilkoblingen varer uten at bruker må logge inn igjen hver uke
- [ ] **CAL-02**: Bruker ser dagens hendelser fra Google Kalender, med heldagshendelser skilt ut
- [ ] **CAL-03**: Pågående og neste hendelse er uthevet
- [ ] **CAL-04**: Om kvelden (etter et konfigurerbart klokkeslett) ser bruker morgendagens første avtale
- [ ] **CAL-05**: Visningen ruller over til ny dag ved midnatt
- [ ] **CAL-06**: Hvis Google-tilkoblingen slutter å virke, ser bruker en tydelig «koble til på nytt»-melding i stedet for at modulen forsvinner

### Mail (viktig e-post)

- [ ] **MAIL-01**: Bruker ser en liste over innkommende Gmail-meldinger som AI har vurdert til å kreve handling: noen ber om noe, stiller spørsmål eller venter på svar
- [ ] **MAIL-02**: Mailer med frister, regninger og betalinger som må håndteres løftes også frem
- [ ] **MAIL-03**: Hver flagget mail vises med avsender, emne og en kort begrunnelse på én linje (norsk) fra AI
- [ ] **MAIL-04**: Hver mail vurderes bare én gang (lagret per meldings-ID), med minimalt innhold sendt til AI, og reklame/sosiale mailer filtreres bort før vurdering
- [ ] **MAIL-05**: Mailer som er besvart, arkivert eller lest og håndtert forsvinner fra listen
- [ ] **MAIL-06**: AI-bruken har et daglig tak, så kostnaden holder seg lav

## v2 Requirements

Utsatt til senere. Følges opp, men er ikke med i v1-roadmapen.

### Shopping List (handleliste)

- **LIST-01**: Bruker kan legge til, krysse av og fjerne varer på en egen handleliste fra iPaden
- **LIST-02**: Bruker kan åpne samme handleliste på telefonen via nettsiden lagret på hjemskjermen
- **LIST-03**: Endringer synkes mellom iPad og telefon innen noen sekunder
- **LIST-04**: Bruker kan legge til varer via Siri («Hei Siri, legg til melk») med en egen, begrenset nøkkel

### Voice (stemmeassistent)

- **VOICE-01**: Bruker kan vekke assistenten med et kodeord (eller trykk-for-å-snakke som reserve), avhengig av en go/no-go-spike
- **VOICE-02**: Bruker kan legge til varer i handlelisten med stemmen
- **VOICE-03**: Bruker kan spørre om informasjonen på skjermen («Når går neste buss?», «Hva skjer i morgen?»)
- **VOICE-04**: Bruker kan stille frie spørsmål til en generell AI-assistent

### Extras (flere moduler)

- **EXTRA-01**: Bruker ser nyhetsoverskrifter (f.eks. NRK)
- **EXTRA-02**: Bruker ser et bildeslideshow når ingenting annet skjer, f.eks. om natten
- **EXTRA-03**: Bruker ser høyeste og laveste temperatur for dagen
- **EXTRA-04**: Bruker kan velge hvilke Google-kalendere som vises
- **EXTRA-05**: Flere brukere eller kontoer i samme husstand

## Out of Scope

Eksplisitt utelatt. Dokumentert for å unngå at det sniker seg inn igjen.

| Feature | Reason |
|---------|--------|
| Smarthusstyring (lys, musikk) | Ikke ønsket |
| Innstillingsmeny/berøringsmenyer på veggen | Skjermen skal være et passivt blikk; konfigurasjon skjer i konfig/backend |
| Liste over hele innboksen / antall uleste | Motsatt av poenget; bare det som krever handling vises |
| Svare på e-post fra skjermen | Kun lesing; lav risiko og enkle Google-scopes |
| Flere holdeplasser / transportformer | Ett busstopp holder |
| Paraply-hint fra værdata | Ikke valgt for v1 |
| Personvernmodus (skjule emner) | Ikke valgt for v1 |
| Fallback-liste uten AI | Ikke valgt for v1; modulen viser feilstatus i stedet |
| «Sendte mailer uten svar» | Ikke valgt som definisjon på oppfølging |
| Native iOS-app / App Store | Webapp holder på iPadOS 18.4+ |
| Integrasjon med Bring!/Keep o.l. | Valgt egen handleliste |
| Layout-editor / pluginsystem | Overkill for én bruker |
| Lange værprognoser / radar | Ikke glanceable; støy |
| AI-kall ved hver oppdatering | Kostnad; vurderinger lagres per melding |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DISP-01 | Phase 1 | Complete |
| DISP-02 | Phase 1 | Complete |
| DISP-03 | Phase 1 | Complete |
| DISP-04 | Phase 1 | Complete |
| DISP-05 | Phase 1 | Complete |
| DISP-06 | Phase 1 | Complete |
| DISP-07 | Phase 1 | Complete |
| DISP-08 | Phase 1 | Complete |
| DISP-09 | Phase 1 | Complete |
| DISP-10 | Phase 1 | Complete |
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 3 | Pending |
| BUS-01 | Phase 2 | Pending |
| BUS-02 | Phase 2 | Pending |
| BUS-03 | Phase 2 | Pending |
| BUS-04 | Phase 2 | Pending |
| BUS-05 | Phase 2 | Pending |
| WTHR-01 | Phase 2 | Pending |
| WTHR-02 | Phase 2 | Pending |
| WTHR-03 | Phase 2 | Pending |
| CAL-01 | Phase 3 | Pending |
| MAIL-01 | Phase 4 | Pending |
| CAL-02 | Phase 3 | Pending |
| MAIL-02 | Phase 4 | Pending |
| CAL-03 | Phase 3 | Pending |
| MAIL-03 | Phase 4 | Pending |
| CAL-04 | Phase 3 | Pending |
| MAIL-04 | Phase 4 | Pending |
| CAL-05 | Phase 3 | Pending |
| MAIL-05 | Phase 4 | Pending |
| CAL-06 | Phase 3 | Pending |
| MAIL-06 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-19*
*Last updated: 2026-10-19 after initial definition*
