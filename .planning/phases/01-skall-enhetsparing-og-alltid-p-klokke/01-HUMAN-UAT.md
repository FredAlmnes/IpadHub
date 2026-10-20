---
status: partial
phase: 01-skall-enhetsparing-og-alltid-p-klokke
source: [01-VERIFICATION.md]
started: 2026-10-20T08:00:15Z
updated: 2026-10-20T08:00:15Z
---

## Current Test

[awaiting human testing — owner tests on the iPad at home]

## Tests

### 1. Legg til på Hjem-skjerm og åpne i fullskjerm (liggende) (DISP-01)
expected: Appen starter fra ikonet i fullskjerm uten adresselinje, svart bakgrunn, viser paringskode
result: [pending]

### 2. Par fra inne i den installerte appen, lukk og åpne igjen (SEC-01)
expected: Etter godkjenning på mobilen vises klokken; etter lukk/åpne fra ikonet er iPaden fortsatt paret (ingen ny kode)
result: [pending]

### 3. Wake Lock holder skjermen på (iPadOS 18.4+) (DISP-03)
expected: Med Autolås 2 min står skjermen på i 5 min uten berøring
result: [pending]

### 4. Oppsettsjekklisten på /admin/oppsett (DISP-10)
expected: Autolås Aldri, Veiledet tilgang med Berøring på, lader, Snarveier-automasjon for lysstyrke 23:00/06:00 satt opp
result: [pending]

### 5. Én natt uten tilsyn (DISP-04, DISP-07, DISP-08, DISP-09)
expected: Nattmodus fra 23:00 med dempet driftende klokke, reload ca. 03:30, gjenoppretting etter Wi-Fi-brudd, dagvisning etter 06:00, ingen paringskode eller «Frakoblet» om morgenen
result: [pending]

### 6. Tilbaketrekking fra /admin (SEC-03)
expected: iPaden viser ny paringskode innen ca. 30 s etter «Trekk tilbake»
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
