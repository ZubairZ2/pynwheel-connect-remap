# Self Tour App: the Start Tour experience on the live Claude Design (October 21, 2026)

Branch `feature/self-tour-start-tour-experience` → `main`. Brief: `pynwheel_tour_app_screens.md`. Report: `SELF_TOUR_START_EXPERIENCE_QA.md`.

## What changed

**Build Your Tour / Add Stops** — "All floors" in the floor menu, a bigger map, locate that switches floor and zooms, CMS thumbnails,
stops the CMS has not plotted named and left out of the route, building chips and an honest "Available now" filter, the backend's route
time as the estimate once calculated, stops the route cannot reach named instead of dropped.

**Guided Navigation** — replay icon on the map, the audio guide with real pause / resume and no re-reading on replay
(`services/audioGuide.ts`), a secured-floor note on elevators the CMS marks with a lock vendor, `Rerouting…` for Avoid stairs, minutes left.

**Stop (unit / amenity)** — rewritten on the CMS data: facts, generated "About this space", the real floor plan with zoom and "On map",
CMS photos and the visitor's own camera shots, 360° links in a frame, published lease terms, a move-in estimate from published figures
only, Video only for real videos.

**Unlock** — the design's shared frame with the four `Demo · Method` variants (`screens/UnlockPanel.tsx`). Real locks follow the
backend's lock: PIN (igloohome API / Iglooworks), BLE (igloohome v1 through the plugin), or an honest unsupported note; Remote and Gate
exist on demo data only (no integration). Try another method only when the lock offers one; Report, Call leasing (the property's own
phone), Skip.

**Booking** — Schedule asks the Booking Form's desired bedrooms / move-in date when the property shows them; Book a Live Tour uses the
property's real agent-guided calendar and reports when the CMS moved an earlier booking.

**Backend (additive)** — `GET …/stops`: unit facts (`unit_type`, `available_date`, `availability`, `lease_terms`, `deposit`,
`additional_fee`, `virtual_tour_url`) and `media` per stop; `GET …/properties/{id}`: `phone`, `email`; `POST …/tour-route` leaves
unplotted stops out as `skipped` instead of refusing the tour.

## Verification

tsc, vitest 103/103, `vite build`, Rails Tour App suite 95 runs / 0 failures, Android debug APK built. Headless Playwright runs on the
audit clone: Hazel, John Demo, Jennifer Demo FP, Cypress Terra (no graph on the clone), Oeuvre (two bookings written and listed by the
Visitors query), the dummy property (all four Unlock variants). Not run: live vendor PIN issuance, Bluetooth hardware, iOS build.
