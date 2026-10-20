---
phase: 2
slug: buss-og-v-r
status: approved
reviewed_at: 2026-10-20
shadcn_initialized: false
preset: none
created: 2026-10-20
extends: 01-skall-enhetsparing-og-alltid-p-klokke/01-UI-SPEC.md
---

# Phase 2 — UI Design Contract (Buss og vær)

> Extends the approved Phase 1 contract. Everything in 01-UI-SPEC.md (tokens, 5-size type scale, 2 weights, spacing scale, module frame, staleness copy, night behaviour, admin patterns) still applies and is NOT restated unless changed.
> Sources: 02-CONTEXT.md (D-01..D-19), 01-UI-SPEC.md, existing code (theme.css, ModuleFrame.tsx, ModuleGrid.tsx, admin-pages.ts, admin.css). No RESEARCH.md exists yet.
> **[Discretion]** = decided by researcher where CONTEXT left freedom. **[Context]** = locked by CONTEXT.md. All copy is Norwegian bokmål.

## Surfaces in scope

| # | Surface | Device / viewport | Rendered by |
|---|---------|-------------------|-------------|
| S1a | Buss-modul (inside day view) | iPad landscape 1180x820 up to 1366x1024 | React SPA, `BusModule` inside `ModuleFrame` |
| S1b | Vær-modul (inside day view) | same | React SPA, `WeatherModule` inside `ModuleFrame` |
| S4b | /admin/innstillinger | Phone portrait 390px (320 min) | Hono server-rendered HTML, works without JS |

Night view (S2) is unchanged: clock only, modules mounted but hidden. Nothing from this phase is visible at night, so weather icons need no night treatment.

---

## Design System

No change from Phase 1: `Tool: none`, Tailwind 4 `@theme` tokens in `src/shared/theme.css`, system font, `tabular-nums` on all numeric text, no new UI library.

Icons:
- SPA: Lucide `rss` (realtime marker, 16px, stroke 2) added to existing `lucide-react` usage.
- Admin: inline Lucide `check` (already exists) only. No new admin icons.
- Weather symbols: **MET weathericons** (metno/weathericons, MIT, code license; the symbols are CC BY 4.0 / open per repo, credit via the on-screen attribution plus a `docs/` or `public/weather-icons/LICENSE` note). **[Discretion]** Shipped as static SVG files in `public/weather-icons/{symbol_code}.svg` (all `_day`, `_night`, `_polartwilight` variants as named by MET), loaded with `<img alt="" width height>`; no inline bundling (about 100 files would bloat the JS). The service worker precaches them cache-first (immutable). Missing file: render nothing (never a broken-image icon); text values still show.

---

## Layout change to the module grid (DECIDED by owner: bento, D-20)

**Problem.** Phase 1 geometry: content area 1084x724 (1180x820 minus 48px padding), clock column 5/12, module area about 600–632px wide. A 2x2 grid gives each slot about 284–300px wide and about 346px tall; inner width about 236–252px. Eight hourly weather columns would be about 30px each (unreadable at 1–2 m), and the bus go-line plus three departures do not fit a width this narrow without truncating destinations.

**[Discretion] Decision: keep the four slots, their order, ModuleFrame and the left clock column; change only the grid geometry of the module area** to a bento layout via `grid-template-areas`:

```
 module area (about 600-632 x 724)
 +-----------------------------------+
 | Vær  (full width, about 304 tall) |
 +----------------------+------------+
 | Buss                 | Kalender   |
 | (11fr, about 388     +------------+
 |  tall, spans 2 rows) | E-post     |
 |                      | (9fr)      |
 +----------------------+------------+
```

- `grid-template-columns: 11fr 9fr; grid-template-rows: auto 1fr 1fr; gap: 32px (xl)`.
- Areas: `"weather weather" / "bus calendar" / "bus mail"`. DOM order stays Buss, Vær, Kalender, E-post (reading order and Phase 1 slot keys unchanged); only CSS placement changes.
- Resulting sizes at 1180x820, module area 600px: Vær 600x about 304; Buss about 314x about 388; Kalender and E-post each about 266x about 178 (tight; Phase 3/4 must design for this or the owner chooses the fallback).
- Plain 2x2 with a cramped 30px-per-column hourly strip was considered and rejected by the owner.
- **Consequence for phases 3–4:** Kalender and E-post get small slots (about 266x178). Their UI contracts must be designed for that size.

---

## Spacing Scale

Unchanged (4, 8, 16, 24, 32, 48, 64). Module slot padding remains lg (24px). Phase 2 additions inside modules use only these tokens:
- Departure row gap: 8px (sm). Departure row min-height 64px (a size floor, not a spacing token).
- Hourly strip column gap: 0 (columns are equal-width `1fr`), strip top margin 16px (md).
- Gap symbol to temperature in the weather "now" block: 16px (md).
- Admin: card gap 16px (md), radio option min-height 48px.

---

## Typography

**No new sizes.** Phase 2 uses only the Phase 1 scale (Label 16/400, Body 24/400, Heading 40/600, Display-M 96/400, Display-L unused here) and weights 400 and 600.

| Element | Role | Size / weight |
|---------|------|---------------|
| Bus go-line headline «Gå om 3 min» / «Gå nå» | Heading | 40 / 600, accent |
| Bus go-line sub-line «rekker 12 Marienborg 11:26» | Label | 16 / 400, accent |
| Departure line number | Body | 24 / 600 |
| Departure destination | Body | 24 / 400, single line, ellipsis on overflow |
| Departure time («4 min», «11:43») | Body | 24 / 600, tabular |
| «ca.» prefix | Label | 16 / 400, muted |
| «+N min» and «Innstilt» | Label | 16 / 600 |
| Bus empty state line 1 | Body | 24 / 400, primary |
| Bus empty state line 2 «Første avgang 12:05» | Label | 16 / 400, muted |
| Weather temperature (now) | Display-M | 96 / 400 (reuses the existing 96px size; justified: «big temp» is the single glance value of the module and the size already exists, so the scale stays at 5) |
| Weather precipitation caption «Nedbør neste time» | Label | 16 / 400, muted |
| Weather precipitation value «0,4 mm» | Body | 24 / 600 |
| Hourly time / temperature / mm | Label | 16 / 400 (time, mm) and 16 / 600 (temperature) |
| Attribution «Data fra MET Norway» | Label | 16 / 400, muted |
| Admin | unchanged Phase 1 admin rules (16px body, 24/600 titles, never below 16px) |

Rules: letter-spacing default for all new elements. Line heights per Phase 1 (1.5 body/label, 1.2 heading, 1.0 display). The Display-M temperature uses `line-height: 1`, `white-space: nowrap`.

---

## Color

No change to 60/30/10. Dominant `#000000`, secondary `#1C1C1E` (admin only), accent `#8FB8DE`, destructive `#E5645A`, text `#F2F2F7`, muted `#8E8E93`, hairline `#2C2C2E`.

**New token (D-14), add to `src/shared/theme.css`:**

```css
--color-delay: #D9963F;  /* muted amber-orange, delay "+N min" only */
```

- Contrast on `#000`: about 8.6:1 (passes AA). Hue about 33 degrees versus destructive about 5 degrees (red-coral), so delay and cancelled are distinguishable; both also carry text («+3 min», «Innstilt»), so colour is never the only signal.
- Usage is exclusive: «+N min» text next to a delayed departure time. Not used for anything else, not in admin.

**Accent reserved for (Phase 2 additions to the Phase 1 list):**
1. Bus go-line («Gå om N min» / «Gå nå» and its sub-line). This is the "gå nå" use already reserved in Phase 1.
2. Admin: primary save buttons (one per card), focus ring, radio/selected-option indicator (`accent-color`), success check «Lagret».
No other accent use on the wall. Weather icons are the only multi-colour elements and are not "accent" (see below).

**Destructive** additions: «Innstilt» label and the strike-through line on cancelled departures; admin error text. No destructive confirm flows in this phase (no deletes; «Fjern adresse» is reversible and not styled destructive).

**Weather symbols and the dark UI [Discretion].** MET symbols render in their native colours at 100% opacity, no filter, no background tile. They are the single splash of colour on a monochrome wall, which is intended and helps recognition at distance. Sizes: 72px (now), 32px (hourly). Dimming behaviour only through the existing ModuleFrame stale opacity (0.4). Night: modules hidden, nothing to handle. Do not recolour or desaturate.

---

## S1a Buss-modul (D-09..D-15, BUS-01..05)

Inside `ModuleFrame` label «Buss». The frame centres content (`items-center justify-center`); for this module children fill the full width/height and align to top (`w-full h-full flex flex-col`), so ModuleFrame needs no change except the optional footer prop below.

Content stack (top to bottom, inner width about 266px):

1. **Go-line block** (accent), margin-bottom 16px.
   - Line 1: Heading «Gå om 3 min» (or «Gå nå» when the computed value is 0).
   - Line 2: Label «rekker 12 Marienborg 11:26» (line number, destination, expected departure `HH:MM`, one line, ellipsis).
   - Computation **[Context D-11]**: `goIn = floor((expectedDeparture - walkMinutes*60s - now) / 60s)` using server-corrected now (same technique as staleness: `serverTime` plus local elapsed). Target = first non-cancelled departure with `goIn >= 0`.
   - If no non-cancelled departure in the fetched set has `goIn >= 0` but some departures exist: single muted Body line «Ingen å rekke akkurat nå» (no accent).
   - Fetch more than 3 from Entur (suggest 8) so the go-line can point beyond the three displayed rows; display rows stay 3 (D-09).
2. **Departure list**: exactly 3 rows (cancelled rows count), chronological by expected time, row min-height 64px, 8px gap. Departures already in the past (client clock) are dropped between polls.

Row anatomy (left to right):

```
[12]  Marienborg        (rss) 4 min
                              +2 min        <- optional Label line, right-aligned
```

- Line number: Body 600, fixed min-width 40px (fits «22», «1», «G11»), left aligned.
- Destination: Body 400, flex 1, `truncate`.
- Time column, right-aligned, tabular, width auto (about 96px reserved):
  - **Realtime [D-13]**: Lucide `rss` 16px, muted, 4px (xs) before the time, `aria-label="sanntid"`. Time shown without prefix.
  - **Scheduled only**: Label muted «ca.» then 4px, then the time. No icon.
  - **Time format [D-10]**: minutes `N min` when 1 <= minutes < 15; «Nå» when under 1 minute; otherwise the clock time `HH:MM` (Oslo time via `oslo-time.ts`, 24 h). Minutes are `floor((expected - now)/60s)` from the server-corrected clock; recomputed on the existing minute tick. At exactly 15 min the clock time is shown.
- Optional second line under the time (Label, 600, right-aligned), never both:
  - **Delayed [D-14]**: «+N min» in `--color-delay` when `expected - aimed >= 2 min` (smaller deviations are noise and not shown).
  - **Cancelled [D-14]**: «Innstilt» in destructive. Destination and time get `line-through` (still readable), and the row is treated as not catchable.
- **Not catchable [D-12]**: row text colour becomes muted `#8E8E93` and weights drop to 400 (line number, time). No extra opacity (avoids compounding with the 0.4 stale dim). Cancelled rows are also muted except «Innstilt».
- Catchable rows: text `#F2F2F7`, line number and time at 600.

**Empty (D-15)** (zero upcoming departures within the next hour): centred in the module, Body primary «Ingen avganger neste time», below it Label muted «Første avgang 12:05». If the first departure is on another day: «Første avgang i morgen 05:42» / «Første avgang tirsdag 05:42» using the same weekday logic as `whenLabel` in `staleness.ts`. If none is known at all: line 1 only. No go-line in this state.

**Not configured (D-08)** (status `not_configured`): centred, Body muted «Velg holdeplass på mobilen», Label muted «Åpne /admin/innstillinger.» The freshness line reads «Ingen data ennå» (existing).

**Error / stale**: existing ModuleFrame behaviour (centred «Utilgjengelig»; stale = 0.4 opacity + hollow dot + «· utdatert»). Bus `staleAfterSec` stays **180** (poll every 30 s, server TTL about 20 s; three misses = visibly stale). A stale list must not keep counting down as if live: minutes keep updating from the clock (correct arithmetic), the stale dim signals reduced trust.

No animation on list changes (consistent with "clock digit change: no animation").

---

## S1b Vær-modul (D-16..D-19, WTHR-01..03)

Inside `ModuleFrame` label «Vær», full-width slot (about 600x304). Inner width about 552px.

Stack:

1. **Now row** (flex, space-between, items-center), height 96px:
   - Left: symbol 72px, 16px gap, temperature Display-M 96/400 e.g. «−3°» (integer, rounded half away from zero; no unit letter; negative uses true minus U+2212, never a hyphen; «-0» normalises to «0°»).
   - Right (text-end): Label muted «Nedbør neste time», under it Body 600 «0,4 mm». Norwegian decimal comma, one decimal. When the value is 0: Body muted «Ingen nedbør» (no mm). Values below 0.05 count as 0.
2. **Hourly strip**, margin-top 16px: 8 equal columns (`grid-cols-8`, about 69px each), centred text, the next 8 whole hours after now (at 14:32 the columns are 15:00 to 22:00). Per column, top to bottom:
   - Time: Label muted `HH:00` («15:00»).
   - Symbol: 32px, centred, 4px margin top/bottom.
   - Temperature: Label 600, same format as above («−3°»).
   - Precipitation: Label 400, number only with decimal comma («1,2»); zero is shown as muted «–» (en dash) so rows with rain stand out. Unit is established by the caption «Nedbør neste time … mm» above; additionally the strip carries no unit text (space).
   - Hairline: none; no column dividers.
3. Footer: ModuleFrame freshness line on the left; **«Data fra MET Norway»** (Label, muted) right-aligned on the same line (WTHR-03). Requires one optional prop on `ModuleFrame`: `footerRight?: ReactNode`, rendered `ml-auto`. Not hidden when stale.

States:
- Not configured: only when neither a home address nor a stop is set. Body muted «Velg hjemmeadresse på mobilen» / Label «Åpne /admin/innstillinger.». With only a stop set, weather works from the stop coordinates (D-07 fallback), no hint shown.
- Error / stale: existing behaviour. `staleAfterSec` stays **5400** (MET updates about hourly; stale only after 90 min).
- Missing hour data (shorter series): render the columns that exist, left aligned; do not invent values.
- Accessibility: the now row gets `aria-label` such as «Nå: −3 grader, lett regn»; hourly symbols are `alt=""` with the visually hidden Norwegian condition text omitted (wall display, not interactive). Keep a `data-symbol` attribute for tests.

---

## S4b /admin/innstillinger (D-01, D-02, D-05..D-08)

Same shell as Phase 1 admin (`page()` layout, max-width 480px, 16px padding, black background, `bg-surface` cards radius 16px, inputs 48px high, 16px text). Behind `adminAuth` and CSRF like other admin pages. Entry points: new link «Innstillinger» on `/admin` next to «Oppsett av iPaden» (Label 16 muted, 48px target). This page: title «Innstillinger» (24/600) in a header row with «Tilbake» link (muted, 48px) to /admin. All flows are plain GET (search, with `?q=`, `?stop=`, `?adresse=` query params) and POST + redirect (save), no JavaScript.

New admin classes (consistent with `admin-pages.ts` constants):
- `secondaryBtn`: `h-12 rounded-xl border border-hairline bg-transparent text-text text-[16px] px-4 box-border cursor-pointer` (search buttons).
- `option` (selectable result row): `min-h-12 rounded-xl border border-hairline bg-bg p-4 flex gap-4 items-start`, native radio with `accent-color: var(--color-accent)`, whole row is the `<label>`.
- Primary buttons reuse `primaryBtn` (accent fill, black text).

Page structure: three independent cards, each saved on its own (no multi-step state to lose).

**Card 1: «Holdeplass»**
- Current value line when saved (Label muted): «Valgt: Bakkegata · ved Adressahuset». Not saved: «Ingen holdeplass valgt ennå.»
- Search form (`GET`): label «Søk etter holdeplass», input `name=q` (`placeholder` not used; value kept after search), button «Søk holdeplass».
- Results (below, after search): up to 6 stops as links styled as `option` rows (non-radio): name (16/600) + locality (16 muted, e.g. «Trondheim»). Tapping goes to `?stop={id}` (GET) and shows the platforms.
- Platforms (when `stop` chosen): heading (16/600) «Velg plattform ved {stoppnavn}». One `option` radio per quay:
  - Line 1 (16/600): quay `publicCode`/name, e.g. «ved Adressahuset».
  - Line 2 (16 muted): description if present, e.g. «Mot sentrum».
  - Line 3 (16 muted): examples built from upcoming calls, up to 3 as «1 Kattem · 12 Marienborg · 22 Vestlia». No calls found: «Ingen avganger akkurat nå».
  - Currently saved quay is pre-checked; otherwise none is checked.
  - Button (POST `/admin/innstillinger/stopp`, hidden `stop_place_id`) «Bruk denne plattformen» (primary, full width). Submitting with nothing selected re-renders with error.
- Messages:
  - Success (status role, accent `check`): «Holdeplassen er lagret.»
  - Query too short: «Skriv minst to bokstaver.»
  - No hits: «Fant ingen holdeplasser som heter «{q}». Prøv et annet navn.»
  - Entur unreachable: «Kunne ikke hente holdeplasser akkurat nå. Prøv igjen om litt.»
  - No quay chosen: «Velg en plattform først.»

**Card 2: «Gangtid»**
- Helper (muted): «Hvor mange minutter du bruker fra døra til plattformen. Brukes til «Gå om …» på skjermen.»
- Form (POST `/admin/innstillinger/gangtid`): label «Minutter», `<input type="number" name="walk_minutes" inputmode="numeric" min="0" max="60" step="1" value="5" required>` (shows saved value, else 5 per D-06). Button «Lagre gangtid» (primary).
- Success: «Gangtiden er lagret.» Error: «Gangtid må være et helt tall mellom 0 og 60.»

**Card 3: «Hjemadresse»**
- Helper (muted): «Brukes til værmeldingen. Uten adresse bruker været posisjonen til holdeplassen.»
- Current value (Label muted): «Valgt: Kongens gate 1, Trondheim» or «Ingen adresse valgt.» Link-style secondary button «Fjern adresse» (POST, `secondaryBtn`, shown only when an address exists, no confirm needed because it only changes a fallback).
- Search form (`GET`): label «Søk etter adresse», input `name=adresse`, button «Søk adresse».
- Results: up to 5 `option` radios, label = full address line (16/600) plus locality (16 muted); none pre-checked. Button «Bruk denne adressen» (POST `/admin/innstillinger/adresse`; primary). This is the owner's "confirm the hit" step (D-07). Coordinates are rounded to 4 decimals server-side and never displayed.
- Messages: success «Adressen er lagret.»; short query «Skriv minst to tegn.»; no hits «Fant ingen adresser som «{q}». Prøv med gate og husnummer.»; Entur unreachable «Kunne ikke søke etter adresser akkurat nå. Prøv igjen om litt.»; nothing selected «Velg en adresse først.»

General: server error «Noe gikk galt. Prøv igjen om litt.» (existing). Flash messages appear at the top of the card they relate to (`role="status"` for success, `role="alert"` for errors, text colours accent / destructive as in Phase 1 admin). Focus ring, 48px targets, press state (80% opacity) all inherited from `admin.css`.

---

## Motion and Always-on Behaviour

Additions: none. No transitions in the bus or weather modules. Burn-in drift, day/night crossfade and tap-to-wake from Phase 1 apply to the whole content layer and need no change. Weather symbols are static images.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (admin) | «Bruk denne plattformen» / «Lagre gangtid» / «Bruk denne adressen» |
| Search CTA | «Søk holdeplass» / «Søk adresse» |
| Bus go-line | «Gå om 3 min» + «rekker 12 Marienborg 11:26»; zero: «Gå nå»; none catchable: «Ingen å rekke akkurat nå» |
| Bus time | «4 min», «Nå», «11:43», prefix «ca.» for scheduled |
| Bus delay / cancelled | «+3 min» / «Innstilt» |
| Bus empty | «Ingen avganger neste time» / «Første avgang 12:05» |
| Bus not configured | «Velg holdeplass på mobilen» / «Åpne /admin/innstillinger.» |
| Weather not configured | «Velg hjemmeadresse på mobilen» / «Åpne /admin/innstillinger.» |
| Weather precipitation | «Nedbør neste time» / «0,4 mm» / «Ingen nedbør» |
| Weather attribution | «Data fra MET Norway» |
| Module error | «Utilgjengelig» (existing) |
| Error states (admin) | see S4b per card; generic «Noe gikk galt. Prøv igjen om litt.» |
| Empty state (admin) | «Ingen holdeplass valgt ennå.» / «Ingen adresse valgt.» |

Destructive actions in this phase: none. «Fjern adresse» is reversible and low-impact, executed directly without a confirmation page.

---

## Accessibility and Robustness

- Wall: all text >= 16px; primary on black about 18:1, muted about 6.2:1, delay about 8.6:1, accent about 9:1. Realtime/delay/cancel never rely on colour alone (icon vs «ca.», signed text, strike-through plus word).
- Admin: labels on all inputs, `autocomplete="off"` on search inputs, `enterkeyhint="search"`; radios are real `<input type="radio">` inside `<label>`; focus ring from `admin.css`.
- Unavailable external data (Entur/MET down) never breaks other modules (ModuleFrame isolation, Phase 1).
- Data hygiene: no stop id, quay id or coordinates in `wrangler.jsonc`; settings only in D1 (D-01/D-02). Coordinates rounded to 4 decimals before storage.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none (shadcn not initialized) | not applicable |
| Third-party | none (MET weathericons are static assets, not a registry; license credit required) | not applicable |

---

## Open Questions for User

All RESOLVED (recorded in 02-CONTEXT.md as D-20/D-21):
1. RESOLVED: bento grid chosen.
2. RESOLVED: weather temperature stays Display-M 96px.
3. RESOLVED: «+N min» shown from 2 minutes delay.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS (FLAG resolved: «Søk» → «Søk holdeplass»/«Søk adresse»)
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS (FLAG: 5-size scale is user-confirmed phase 1 exception)
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-10-20 (gsd-ui-checker)

**Planner note (checker):** the Vær slot is ~304 px tall but its content sums to ~330 px. Verify at 1180×820 and, if it overflows, shrink the hourly symbol or adjust the `auto` row height. Do not add a new type size.
