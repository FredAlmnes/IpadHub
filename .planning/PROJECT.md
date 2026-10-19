# IpadHub

## What This Is

En alltid-på infoskjerm for en iPad i leiligheten, som viser nyttig informasjon på ett blikk: når bussen går fra nærmeste stopp, været, dagens kalender og viktige e-poster som bør følges opp. Over tid skal den også bli et knutepunkt for en handleliste (som også kan nås fra telefonen) og en stemmeassistent du kan snakke til med et kodeord. Laget for én person (eieren) til å begynne med, med mulighet for flere brukere senere.

## Core Value

Et raskt blikk på iPaden gir meg det jeg trenger for å komme meg ut døra og holde oversikt over dagen: buss, vær, kalender og hva i innboksen som krever handling.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**v1 – Infoskjerm (ferdig nok til daglig bruk)**
- [ ] Sanntidsavganger for buss fra ett nærmeste stopp (Entur)
- [ ] Værvisning for nå og utover dagen
- [ ] Dagens hendelser fra Google Kalender
- [ ] Viktige e-poster fra Gmail som bør følges opp, vurdert av AI (ikke bare antall uleste)
- [ ] Alltid-på visning i fullskjerm på iPad (iPadOS 18.4+), oppdaterer seg selv uten at man rører den
- [ ] Nattmodus: skjermen dimmes eller blir mørk med bare klokken om natten

**Senere – Handleliste**
- [ ] Egen enkel handleliste som synkes mellom iPad og telefon
- [ ] Tilgang fra mobilen via nettsiden (lagret på hjemskjermen)
- [ ] Legge til varer via Siri / iOS-snarvei («Hei Siri, legg til melk»)

**Senere – Stemmeassistent**
- [ ] Vekkes med et kodeord (eller f.eks. to klapp)
- [ ] Legge til varer i handlelisten med stemmen
- [ ] Svare på spørsmål om informasjonen på skjermen («Når går neste buss?», «Hva skjer i morgen?»)
- [ ] Generell AI-assistent for frie spørsmål

**Ideer til senere – flere moduler**
- [ ] Nyhetsoverskrifter (f.eks. NRK)
- [ ] Bildeslideshow (f.eks. om natten eller når ingenting annet skjer)

### Out of Scope

- Styring av smarthus (lys, musikk o.l.) — ikke ønsket i denne omgangen
- Flere brukere/kontoer i v1 — starter med bare meg, utvides senere
- Native iOS-app i App Store — en webapp i Safari holder på en moderne iPad
- Integrasjon mot eksisterende handlelisteapper (Bring!, Keep osv.) — valgt egen enkel liste i stedet
- Støtte for eldre iPader/gammel Safari — iPaden har iPadOS 18.4+
- Flere holdeplasser og andre transportformer — ett busstopp holder

## Context

- Bor i Norge; kollektivdata hentes fra Entur, som dekker hele landet.
- Bruker én Google-konto til både Gmail og Google Kalender. Trenger OAuth med lesetilgang.
- iPaden kjører iPadOS 18.4 eller nyere, så Screen Wake Lock fungerer i hjemskjerm-PWA (WebKit-bug 254545 er fikset).
- «Bør følges opp» betyr innkommende mail som krever svar eller handling, pluss frister, regninger og betalinger. Sendte mailer uten svar teller ikke.
- iPaden står på hele døgnet, så lav belastning, at den henter seg inn igjen etter nettverksbrudd og at den ikke brenner seg inn i skjermen betyr noe.
- AI-vurdering av e-post betyr at innholdet sendes til en språkmodell (Claude). Personvern og kostnad må tas med i vurderingen.
- Stemmestyring med kodeord i nettleseren har begrensninger (mikrofontilgang, at den alltid må lytte i Safari). Dette må utforskes når vi kommer dit.

## Constraints

- **Hosting**: Backend i skyen på gratis eller billig nivå (f.eks. Vercel/Cloudflare). Ingen maskin hjemme.
- **Budsjett**: Lave løpende kostnader. Hold AI-kall og API-bruk nøkterne.
- **Plattform**: Webapp som kjører i Safari på iPad (iPadOS 18.4+), også brukbar på mobil for handlelisten.
- **Sikkerhet**: Google-tokens og API-nøkler må ligge på serveren, aldri i klienten. Skjermen viser privat e-post, så tilgang må beskyttes.
- **Brukere**: Én bruker i v1, men datamodellen bør ikke stenge for flere senere.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Webapp, ikke native app | Nyere iPad med moderne Safari; enklere å bygge og deploye, fungerer også på mobil | — Pending |
| Skybasert backend (gratis/billig nivå) | Ingen maskin hjemme som må holdes i gang | — Pending |
| Entur for kollektivdata | Dekker hele Norge, åpent API | — Pending |
| Google (Gmail + Kalender) | Brukerens eksisterende kontoer | — Pending |
| AI-vurdering av viktig e-post | Brukeren vil ha det som krever handling løftet frem, ikke bare antall uleste | — Pending |
| Egen handleliste i stedet for tredjepartsapp | Full kontroll, enkel synk mellom iPad, mobil og stemme | — Pending |
| v1 = bare infoskjermen | Brukeren vil ha daglig nytte fort; liste og stemme kommer i senere faser | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-19 after initialization*
