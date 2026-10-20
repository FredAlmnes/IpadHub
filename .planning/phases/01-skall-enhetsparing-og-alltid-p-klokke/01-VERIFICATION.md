---
phase: 01-skall-enhetsparing-og-alltid-p-klokke
verified: 2026-10-20T00:00:00Z
status: human_needed
score: 13/13 requirements verified in code (iPad-only behaviour pending)
overrides_applied: 0
gaps: []
human_verification:
  - test: "Add to Home Screen on the iPad and open the app"
    expected: "Opens fullscreen with no Safari chrome, landscape, black splash, icon 'IpadHub' (DISP-01)"
    why_human: "Needs physical iPad / iPadOS standalone mode"
  - test: "Pair the iPad via the code + /admin, then close and reopen the Home Screen app"
    expected: "Stays paired, no login screen, goes straight to the clock (SEC-01). Note that iOS Home Screen apps can have a separate cookie jar from Safari, so pair from inside the installed app."
    why_human: "Cookie persistence in iOS standalone mode cannot be checked from the repo"
  - test: "Leave the app open on iPadOS 18.4+ with Auto-Lock at default"
    expected: "Screen does not sleep (Wake Lock acquired and reacquired after visibilitychange) (DISP-03)"
    why_human: "Wake Lock behaviour in a standalone app depends on the device and OS"
  - test: "Walk through docs/ipad-setup.md and /admin/oppsett: Auto-Lock Never, Guided Access with Touch off, charging, Shortcuts brightness automation 23:00/06:00 (DISP-10)"
    expected: "Each step is possible and works as written on the real iPad"
    why_human: "iPadOS Settings and Shortcuts"
  - test: "One night unattended (23:00 to 06:00, plus the 03:30 daily reload)"
    expected: "Night view dims after 23:00 with only the grey clock and drift, daily reload at 03:30 without hanging, day view returns at 06:00, no 'Frakoblet' marker stuck after Wi-Fi returns (DISP-04, 07, 08, 09)"
    why_human: "Needs real time and real device"
  - test: "Revoke the device in /admin and check the iPad"
    expected: "iPad returns to the pairing screen with a fresh code on the next poll (SEC-03)"
    why_human: "Server side is tested; the end-to-end behaviour on the iPad is not"
---

# Phase 1: Skall, enhetsparing og alltid-på klokke - Verification Report

**Phase Goal:** Brukeren har en paret iPad som viser en stor norsk klokke i fullskjerm døgnet rundt, bare tilgjengelig for den parede enheten, og som tåler en natt uten tilsyn
**Status:** human_needed (no code gaps found; physical-iPad checks pending)
**Re-verification:** No, initial verification

## Evidence run by the verifier

- `npm test`: 11 files, 104 tests passed.
- `npm run typecheck` (`tsc -b`): clean.
- Live `GET https://ipadhub.fredrik-almnes.workers.dev/api/snapshot` without a cookie returns 401 `{"error":"unpaired"}` (SEC-02 on production).
- No TBD/FIXME/XXX debt markers found in src, public, scripts or docs.

## Requirements coverage (all 13 IDs from the plans are in REQUIREMENTS.md and mapped to Phase 1; no orphaned Phase 1 IDs; SEC-04 belongs to Phase 3)

| Req | Status | Evidence |
|-----|--------|----------|
| DISP-01 | VERIFIED in code, iPad pending | `public/manifest.webmanifest` has display standalone, landscape, black background, 3 icons. `index.html` has apple-mobile-web-app-capable, apple-touch-icon and a manifest link. SW registered via `sw-register.ts` |
| DISP-02 | VERIFIED | `oslo-time.ts` uses `Intl.DateTimeFormat` `formatToParts` with timeZone Europe/Oslo and its own `isoWeek`. `oslo-time.test.ts` covers DST and midnight boundary. `Clock.tsx` renders it |
| DISP-03 | VERIFIED in code, iPad pending | `useWakeLock.ts` requests the lock, reacquires on visibilitychange, pointerdown and a 60 s heartbeat, and fails silently |
| DISP-04 | VERIFIED | `useSnapshot.ts` polls every 30 s and refetches on visibility and online. The last good data is kept on failure |
| DISP-05 | VERIFIED | `staleness.ts` (tested), `ModuleFrame.tsx` and `OfflineMarker.tsx` provide per-module "Oppdatert HH:MM", dimming and an offline marker |
| DISP-06 | VERIFIED | Provider registry isolates failures per module (provider tests) and the slots have error boundaries |
| DISP-07 | VERIFIED | `night-mode.ts` (tested, wraps midnight), `useNightMode.ts`, `NightClock.tsx`. Config comes from the snapshot with a hardcoded fallback |
| DISP-08 | VERIFIED | `drift.ts` (tested) and `useDrift.ts` are used by the night clock and the day layout |
| DISP-09 | VERIFIED | `useAutoReload.ts` and `reload-guard.ts` (tested): daily reload at 03:30 Oslo once per date, version-mismatch reload throttled to 10 min, watchdog. See WR-03 |
| DISP-10 | VERIFIED in code, iPad pending | `docs/ipad-setup.md` and the `/admin/oppsett` checklist cover Auto-Lock, Guided Access, charging and the Shortcuts brightness automation at 23:00/06:00 |
| SEC-01 | VERIFIED | `pair-start.e2e.test.ts` and `pair-flow.e2e.test.ts` cover code, approval and an HttpOnly cookie. The hash is stored, the token is 256-bit, and the cookie is sliding |
| SEC-02 | VERIFIED | `app.ts` applies default-deny `deviceAuth` to `/api/*` except `/api/pair/*`. Confirmed on production (401) and in tests |
| SEC-03 | VERIFIED | Admin revoke sets `revoked_at`. `deviceAuth` filters `isNull(revokedAt)`, and the client returns to the pairing screen on 401. Covered by `admin.test.ts` |

## Code review warnings (01-REVIEW.md: 0 critical, 6 warnings, 5 info)

None of them defeats a must-have, so none are classified as gaps. Recommended follow-up, not blocking:

- **WR-03** (reload loop between 03:30 and 06:00 if localStorage is blocked): only triggers when storage is unavailable, which is unlikely for a Home Screen app on the owner's own iPad. It would hit DISP-09 and the night-unattended goal if it did happen. Fix is cheap: use an in-memory flag as a fallback. Worth fixing before the overnight test.
- **WR-06** (SW cache-first on `/assets/*` can cache the SPA-fallback HTML under an asset URL, and the cache never prunes): only after a deploy removes a hashed asset that an old shell still references. The reload on version change reduces the risk. The `content-type` check is a small fix. Recommended because the device is unattended.
- **WR-01** (global pending cap on unauthenticated `/api/pair/start` can block pairing), **WR-02** (non-atomic pairing hand-off), **WR-04** (approved row redeemable after TTL), **WR-05** (google_sub not compared) and IN-01 to IN-05: robustness and hardening items. They do not break pairing, access control or revocation as verified above.

## Anti-patterns

No stubs or placeholders in the display path. `PlaceholderModule.tsx` is intentional for bus, weather, calendar and mail, which are scheduled for later phases (the Phase 1 goal is the clock shell).

## Gaps Summary

No code gaps. The goal is achieved to the extent it can be verified without the physical iPad. Status is human_needed because the on-device checks (Home Screen install, staying paired as an app, Wake Lock, setup checklist, one unattended night) are still pending. The Mac browser walkthrough and the production smoke checks in 01-08-SUMMARY.md passed.

Note: during verification one unauthenticated `POST /api/pair/start` was sent to production to test reachability. It created at most one pending pairing request that expires after 10 minutes.

---

_Verified: 2026-10-20_
_Verifier: Claude (gsd-verifier)_
