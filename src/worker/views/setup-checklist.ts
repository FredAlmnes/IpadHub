// Single source of the iPad setup checklist (DISP-10, D-18). Copy per 01-UI-SPEC.md.
// docs/ipad-setup.md mirrors this text; /admin/oppsett is canonical.
export const SETUP_STEPS: { title: string; text: string }[] = [
  {
    title: "Oppdater",
    text: "Bruk iPadOS 18.4 eller nyere. Det trengs for at skjermen kan holde seg våken i hjemskjerm-appen.",
  },
  {
    title: "Hjemskjerm",
    text: "Åpne siden i Safari, trykk Del og velg Legg til på Hjem-skjerm. Start deretter appen fra ikonet, ikke fra Safari.",
  },
  {
    title: "Parring",
    text: "Åpne appen fra hjemskjermen og finn koden på skjermen. Godkjenn den her på mobilen. Legger du appen til på nytt, må du pare på nytt.",
  },
  {
    title: "Autolås",
    text: "Innstillinger > Skjerm og lysstyrke > Autolås > Aldri.",
  },
  {
    title: "Veiledet tilgang",
    text: "Innstillinger > Tilgjengelighet > Veiledet tilgang. Slå på, sett kode og start med trippeltrykk på sideknappen i appen. La Berøring stå på (trengs for å vekke skjermen om natten) og sett Autolås for skjerm til Aldri.",
  },
  {
    title: "Lading",
    text: "La iPaden stå i lader hele tiden. Bruk optimalisert lading hvis modellen har det, og unngå sol, varme og tykke deksler.",
  },
  {
    title: "Lysstyrke om natten",
    text: "Snarveier > Automatisering > Ny automasjon > Tid på døgnet. Kl. 23:00: Angi lysstyrke lavt. Kl. 06:00: Angi lysstyrke høyt. Velg Kjør umiddelbart.",
  },
  {
    title: "Forstyrr ikke",
    text: "Slå på en fokusmodus som skjuler varsler, og unngå lav strømforbruk-modus. Etter en iPadOS-oppdatering: sjekk punkt 4 og 5 på nytt.",
  },
  {
    title: "Hvis koden dukker opp",
    text: "Åpne /admin på mobilen og godkjenn den. Trekk tilbake mistede enheter under Enheter.",
  },
];
