# Feature Landscape

**Domain:** Always-on home wall/desk info dashboard (iPad web app, single user, Norway)
**Researched:** 2026-10-19
**Confidence:** MEDIUM. Based on knowledge of MagicMirror², DAKboard, Home Assistant dashboards, Skylight Calendar, Echo Show / Nest Hub and Entur's public API. No live web verification was done in this pass. Entur and iOS-specific constraints are flagged for phase-level checks.

## Table Stakes

Features users expect. Missing = the display gets ignored or unplugged.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Large clock + date (weekday, week number) | Every product has it; it is the anchor of a glance display and the only element that stays in night mode | Low | Norwegian locale (nb-NO), 24h, uke-nummer. Needed in night mode as well. |
| Real-time bus departures for one stop | The core value ("get out the door") | Med | Entur JourneyPlanner GraphQL (`estimatedCalls`). Show line number + destination, minutes-to-departure ("3 min") that flips to clock time when far off, and a visual distinction between real-time and scheduled-only. Show 4-6 departures. Show cancelled/delayed state. Filter to a direction/quay. |
| Weather now + next hours + today hi/lo | Universal module in all products | Low-Med | MET Norway Locationforecast (free, requires User-Agent, no key) is the natural fit. Icon (symbol_code), temperature, precipitation (mm), wind. Rain in the next few hours matters more than a 7-day forecast. |
| Today's calendar events | Skylight, DAKboard, Echo Show all lead with this | Med | Google Calendar read-only OAuth. Show time, title, all-day events separated, "now/next" highlighted, past events dimmed or hidden. Include tomorrow's first event when today is nearly done. |
| Self-refresh without touching it | Wall displays must be zero-maintenance | Med | Per-module polling cadence (bus ~30s, weather ~15 min, calendar ~5 min, email ~10-15 min). Visibility-aware. Full page reload on version change. |
| Stale-data and offline indication | A frozen bus time is worse than none; users stop trusting the screen | Low-Med | Per-module "updated HH:MM" or greyed-out state when data is older than a threshold. Auto-recovery after network drop. This is the biggest trust feature. |
| Fullscreen / kiosk-like display on iPad | Expected from a wall display | Med | PWA "Add to Home Screen" (standalone). Guided Access and Auto-Lock "Never" are manual iPad settings; document them. Wake Lock API support on iPadOS 16.4+ for home-screen web apps was historically flaky, so verify. |
| Night mode (dim / clock-only) | Bedroom/living room unusability otherwise; named in project requirements | Low-Med | Schedule-based (e.g. 23:00-06:00) with sunrise/sunset option. Web cannot control hardware brightness, so use a dark overlay and a pure black (OLED-like) clock-only view. Manual override (tap to wake for N minutes). |
| Burn-in avoidance | iPads are LCD (low risk), but long static high-contrast UI and a 24/7 duty cycle make it a stated concern | Low-Med | Slow pixel drift of the whole layout (a few px every few minutes), no permanent bright borders, dim palette, night-mode blackout. Cheap to include from day one. |
| Glanceable legibility | The whole point: readable from 2-3 m | Low (design) | Large type, high contrast, minimal chrome, no scrolling, no interaction required, no cards that need tapping. |
| Secure access to the display | It shows private email and calendar | Med | Auth on the backend (Google tokens server-side as already in constraints). The iPad needs a long-lived session or device token so it never shows a login screen on the wall. |
| Graceful error states per module | One failing API must not blank the screen | Low-Med | Module isolation: each module has its own loading/error/stale state. |

## Differentiators

Not expected from basic dashboards, but this is where the product is better than DAKboard or MagicMirror².

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-flagged "needs follow-up" emails | The main differentiator. Competitors show unread counts or nothing. Surfaces only mail that needs action, with a one-line reason | High | Gmail read-only scope. Pipeline: fetch recent threads, pre-filter (skip promotions/social labels, newsletters, no-reply), classify with Claude (Haiku-class), cache by message id, show 1-5 items with sender, subject and "why". Needs: privacy minimisation (send snippet or trimmed body, not whole threads), cost cap, batching on a schedule rather than per-refresh. Gmail restricted scope verification does not apply for a single personal account in testing mode, but refresh-token expiry (7 days in "Testing" publish state) is a real trap; see PITFALLS. |
| "Time to leave" walking-aware departures | Turns "bus in 7 min" into "leave in 3 min" | Med | Needs a fixed walking time to the stop (a config constant). Highlight departures that are still catchable, dim those that are not. Cheap and very valuable. |
| Context-aware layout (morning vs evening) | Show bus prominently in the morning, tomorrow's calendar in the evening | Med | Rule-based by time of day and calendar, not ML. Defer past v1 unless trivial. |
| Calendar + travel linkage | "Meeting at 09:00 → take the 08:23 bus" | High | Needs destination routing (Entur trip planner), geocoding of event location. Cool but speculative; defer. |
| Weather-driven hints ("take umbrella", "rain at 08:00") | Higher value than raw numbers | Low-Med | Derived from the MET precipitation series. Cheap once weather is in. |
| Synced shopping list (iPad, phone PWA, Siri) | Makes the display interactive and sticky for daily use | Med-High | Own backend store with realtime-ish sync (polling or SSE). Phone PWA for editing. Siri via an iOS Shortcut that POSTs to an authenticated endpoint. Siri/Shortcuts avoids needing a native app. |
| Voice assistant with wake word | Hands-free use ("hey X, add milk", "when is the next bus?") | Very High | Safari cannot listen continuously in the background reliably; iOS PWA mic access prompts and suspends. Wake-word in-browser needs WASM engines (e.g. Picovoice Porcupine web, openWakeWord via ONNX) and a foregrounded always-on page. Treat as a feasibility spike before committing. Cloud STT/LLM costs apply. |
| Ambient photo slideshow in idle/night | Warmth; doubles as a burn-in mitigation | Med | Source options: a Google Photos album is hard since API access was restricted in 2025; a simple uploaded folder or a public album URL is more realistic. Verify before planning. |
| News headlines (NRK RSS) | Low-effort, familiar module | Low | NRK offers RSS. Show 3-5 headlines, rotate. Keep it visually secondary. |
| Rotating or paged secondary modules | Fits more content without clutter | Low-Med | Only for non-urgent modules (news, photos). |

## Anti-Features

Deliberately do not build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Touch-heavy UI / menus / settings screens on the wall | A wall display is glanced at, not operated; it adds states that can get stuck | Configure via code/env or a separate phone-friendly admin page; the wall UI is read-only except the shopping list. |
| Smart-home control (lights, music, thermostats) | Explicitly out of scope; this is where Home Assistant already wins | Leave to Home Assistant/HomeKit. |
| Unread email count or an inbox list | Contradicts the core value; recreates the noise the AI filter exists to remove | Show only AI-selected action items. |
| Multi-stop, multi-mode transit, route planner | Out of scope; huge UI surface | One stop, one configured quay/direction set. |
| 7-10 day weather forecasts, radar, maps | Not glanceable; clutters | Today + next hours + tomorrow summary. |
| Full email reading / replying / sending | Needs write scopes and security risk; far from the goal | Link out to Gmail on the phone if needed. |
| Drag-and-drop layout editor / plugin system (MagicMirror-style) | Huge scope for one user | Fixed layout in code, modules as components. |
| Integration with Bring!/Keep and other list apps | Out of scope per PROJECT.md | Own simple list. |
| Native iOS app | Out of scope | PWA. |
| Multi-user accounts in v1 | Out of scope | Keep user-id in the data model so it can come later. |
| Always-on cloud LLM calls on every refresh | Cost and privacy | Batch, cache by message id, daily cost cap. |
| Social/family features, chore charts, meal planners (Skylight territory) | Different product | Not for a single-user dashboard. |
| Attention-grabbing animations and scrolling tickers | Distracting; also burn-in/battery-unfriendly | Static layout with subtle transitions. |

## What Each Module Must Show to Be Useful

| Module | Must show | Should show | Don't show |
|--------|-----------|-------------|------------|
| Bus | Line, destination, minutes to departure, real-time vs scheduled marker | Delay/cancellation, "leave in N min" | Full timetable, stop IDs |
| Weather | Current temp + symbol, hourly strip for next ~8-12 h, precipitation | Hi/lo, wind, umbrella hint | Radar, long-range |
| Calendar | Time + title for today, all-day items, now/next highlight | Tomorrow's first event after ~18:00 | Calendar names/colours overload, declined events |
| Email | Sender, subject, short AI reason, age | Count of flagged items | Bodies, unread totals |
| Clock | Time, weekday, date, week number | Sunrise/sunset | Seconds (distracting and burn-in-adverse) |
| Footer/status | Last-updated per module on failure | Small connectivity indicator | Debug info |

## Feature Dependencies

```
Backend + auth (server-held Google tokens, device session)
  ├→ Calendar module
  ├→ AI email module (also needs: Claude API key, cost cap, cache store)
  └→ Shopping list (needs persistent store)
        ├→ Phone PWA (same store/API)
        ├→ Siri/Shortcuts endpoint (needs API token auth)
        └→ Voice "add to list" (needs voice pipeline)

Entur client ──→ Bus module ──→ "time to leave" (needs walking-time config)
MET client ────→ Weather module ──→ weather hints
Polling + stale detection ──→ all modules (build once as shared infra)
Night mode ──→ burn-in drift + clock-only view ──→ photo slideshow (idle mode)
Voice pipeline (mic permission, wake word, STT, LLM, TTS)
  ├→ Q&A on screen data (needs module data accessible via API)
  └→ General assistant (needs LLM + cost control)
PWA fullscreen shell ──→ night mode / wake-lock behaviour
```

## MVP Recommendation

Prioritize (v1):
1. Shell: PWA fullscreen layout, clock, per-module polling, stale/offline state, error isolation
2. Bus (Entur), including real-time marking and cancellations
3. Weather (MET) with next-hours strip
4. Google Calendar today view
5. Night mode + burn-in drift
6. AI email follow-up (one differentiator in v1 since it is in the core value). Build it last in v1 so the display is already useful without it.

Cheap extras if time allows: "leave in N min" with walking time, umbrella hint.

Defer:
- Shopping list: needs its own backend store and phone UI; it forms a coherent phase of its own, with Siri Shortcut at the end.
- Voice assistant: highest technical risk (Safari mic/wake word limits); run a feasibility spike first, consider "tap to talk" as a fallback.
- News headlines and photo slideshow: low value to the core; slideshow pairs naturally with night/idle mode.
- Context-aware layout and calendar-travel linkage: speculative.

## Sources

- PROJECT.md (project requirements and constraints). HIGH.
- Product knowledge of MagicMirror² (module system: clock, weather, calendar, newsfeed), DAKboard (calendar/weather/photos/news), Home Assistant Lovelace wall panels, Skylight Calendar (family calendar/chores), Amazon Echo Show and Google Nest Hub (ambient photos, clock, glanceable cards). From training data, not re-verified. MEDIUM-LOW.
- Entur API (developer.entur.org, JourneyPlanner v3 GraphQL, `estimatedCalls`): from training data, verify in the stack/phase research. MEDIUM.
- MET Norway Locationforecast 2.0 (api.met.no): User-Agent required, no key. MEDIUM.
- Items flagged for verification before planning: iPadOS PWA Wake Lock support, in-browser wake word feasibility on Safari, Google Photos API access status, Google OAuth refresh-token lifetime in "Testing" mode.
