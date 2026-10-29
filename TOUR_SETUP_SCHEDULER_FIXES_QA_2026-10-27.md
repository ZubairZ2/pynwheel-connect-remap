# Tour Setup — design alignment, scheduling settings and booking widget: findings and QA (October 27, 2026)

Branch `feature/tour-setup-scheduler-fixes` (from `main` 84efde65a). Paths are relative to the repo root; `pcw/` = `pyn-connect-web/`.
Design read from `Oct_27_Pynwheel Admin - Back Office.html` (its `TourModule.dc.html` sub-page, gzip-compressed inside
`__bundler/manifest`). Production facts come from the read-only production URL and from public HTTP probes with a bogus code;
nothing was written to any deployed environment.

## 1. Findings

| # | Issue | Classification | Finding / root cause | Fix |
|---|---|---|---|---|
| 1 | Elevators tab | CONFIRMED BUG (design mismatch) | The design's Tour Module has six tabs (Overview · Stops · Locks · Visitors · Live Chat · Settings), each with a role list; Connect had seven. The tab's gate toggle, photos and "Add Elevator Bank" were local-only and never saved (gap T4); only "delete bank" persisted through Save. | Tab, component, dialog and local state removed; `?tab=elevators` opens Stops (as `routing` did); checklist is the design's five steps; the locks pill counts the stored lock providers; publish text, banner, i18n, CSS and both specs updated. Elevator records, routing and `TourSetup::Save`'s `elevators.delete` are untouched. |
| 2 | Settings rail | CONFIRMED (design mismatch, owner's D3) | The design's `SET_GROUPS` has five groups; "Route & navigation" is a section of Tour experience, not a group. | Rail is Scheduling · Booking & CRM · Access & security · Tour experience · Messages; every group has pills; Route & navigation shows the stored flags under Tour experience with `?section=navigation`; the other sections say "Not available in Connect yet". |
| 3 | Disabled Scheduling controls (tour types, slot length, buffer, notice, horizon, capacity, scheduled-only, grace, length) | EXPECTED BEHAVIOUR (one gate) | `canEdit = meta.can_edit && meta.writes_enabled`: the admin role (`User#can_edit_map?`) and the production kill switch `PYN_CONNECT_WRITES` (default off; optional `PYN_CONNECT_WRITES_COMMUNITY_IDS`). On Heroku the owner confirmed `off`, so the switch, not the role, disabled everything; the owner has since set it on for an allowlist (1411 included; 1618 not). Server validation and refusal (403 role / 404 disabled) were already right. | No control enabled in code. |
| 4 | "One active booking per person", "Property time zone" | EXPECTED (matches the design) | Built-in behaviour of `Bookings::Create`; zone set from latitude/longitude, no setting by the Oct 25 decision. | None. |
| 5 | Read-only wording | CONFIRMED BUG | Every disabled panel said "your role cannot change it" even when the switch was the cause; the scheduler switch had no explanation. | Per-cause notes: role vs. Connect writes off (`PYN_CONNECT_WRITES` named), on every panel and under the scheduler switch. |
| 6 | Visiting hours when a CRM manages the calendar | CONFIRMED (design mismatch, owner's D4) | The widget takes dates/times from Yardi / Knock / Funnel; the design shows the hours as stored with a "Managed by …" banner; Connect let admins edit them. | Hours and closures are read-only while `crm.managed_hours` is set (banner names the CRM and says to edit there); the server refuses nothing new, the page simply does not offer the editor. |
| 7 | Booking form: marketing source required, "how did you hear", SMS opt-in | EXPECTED | RealPage-only rule (same as the design); the other two have no column. | None. |
| 8 | Booking link / embed on Heroku | CONFIRMED BUG (configuration) | `pyn-system`'s `HOST_URL` is `https://pyn-system.herokuapp.com`, which Heroku answers with "No such app"; the CMS runs at `https://pyn-system-16a05cad79df.herokuapp.com` (the widget page it serves for 1411 embeds the dead host 12 times). | Owner, manual mode: `heroku config:set HOST_URL=https://pyn-system-16a05cad79df.herokuapp.com -a pyn-system` (or the real public domain). Connect now prints the configured host beside the link with a note that a stale value must be fixed there. Nothing probes the widget live. |
| 9 | Widget-status gate vs. the widget's rule | CONFIRMED BUG (latent, owner's D5) | Connect's "Pynwheel Tour is on" used `Connect::ProductState.tour?` (self_tour or the Launch order option); the widget checks `communities.self_tour` only. | The gate reads `communities.self_tour`, test added. |
| 10 | Bad / mismatched signed code | CONFIRMED BUG (minor safety) | `JWT.decode … rescue nil` then `decoded[0]` raised; the action's rescue redirected the prospect to the staff scheduled-tours page. | `before_action :verify_community_code!` answers 404 (plain) for an unknown property and, on a direct link, for a missing, invalid, foreign-key or mismatched code, before any row is written. Seven controller tests. |
| 11 | The owner's signed link on Heroku | BLOCKED (no code given) / explained by #8 | Not reproduced with the real code (owner's D2); the host finding explains the failure. Local reproduction with a locally signed code passes (below). | — |
| 12 | Configuration persistence | VERIFIED LOCALLY | Form → generator bounds → BFF allowlist → `Connect::WritesJson` → `Scheduling::Settings#update_*!` → re-read → page adopts the answer; the widget reads the same columns per request. | Slot length and button text saved, reloaded, shown, restored (below). |
| 13 | CRM integration & sync | EXPECTED / not implemented | Demo panel behind a "Demo — not connected" banner; the design's options A/B/C are proposals. | Unchanged. |
| 14 | Access & security, Tour experience (other sections), Messages | EXPECTED gap | No backend for the design's forms. | Placeholders kept, now sectioned like the design. |

## 2. What changed

**Connect (`pcw/`)**
- `src/core/utils/generator/tour/tourSetup.generator.ts`: `TourTab` without `elevators` (deep link → stops); local elevator
  state, cards and the save payload's `elevators` removed; `summary.gatedElevators`.
- `src/core/hooks/useTourSetup.ts`: elevator actions and the add-bank dialog removed.
- `src/core/screens/properties/tourSetup.screen.tsx`: tab, `ElevatorsTab`, dialog removed; publish text.
- `src/core/utils/generator/tour/tourModule.generator.ts`: five-step checklist; `TOUR_SETTINGS_GROUPS` / sections;
  `settingsSectionOf` (pure, read by the server page).
- `src/core/screens/properties/tour/tourModuleTabs.tsx`: the five-group rail with pills and `?section=` for every group.
- `src/core/hooks/tour/useTourBooking.ts`: `readOnlyReason` (`writesOff` | `role`), `hoursEditable`.
- `src/core/screens/properties/tour/BookingPanels.tsx`, `AvailabilityHeader.tsx`: `ReadOnlyNote` per cause; managed hours and
  closures read-only; link host line.
- `src/config/app/strings.ts`, `src/resources/i18n/index.ts`, `src/app/globals.css`: elevator keys/classes removed, new strings.
- `tests/e2e/tourSetup.spec.ts`, `tests/e2e/tourModules.spec.ts`: no Elevators tab, five groups, Route & navigation section.

**Rails**
- `app/services/scheduling/settings.rb`: `tour_on` gate = `communities.self_tour`.
- `app/controllers/scheduler_widget/widgets_controller.rb`: `verify_community_code!` (404 before any write).
- `test/controllers/schedular_widget/widget_controller_test.rb` (new, 7 tests), `test/controllers/connect/booking_controller_test.rb`
  (gate test). No migration, no config change in the repo.

## 3. Tests

| Suite | Result |
|---|---|
| Connect `npx tsc --noEmit` | PASS |
| Connect `npx vitest run` | PASS — 3 files, 28 tests |
| Connect `npx next build` | PASS |
| Connect lint | NOT RUN — the project has no ESLint configuration or `lint` script |
| Rails `test/controllers/schedular_widget/widget_controller_test.rb` | PASS — 7 runs, 17 assertions |
| Rails `test/controllers/connect/booking_controller_test.rb` | PASS — 14 runs (the two "opens" widget tests assert the action's side effect: the legacy page's stylesheet does not compile under the test asset pipeline, a pre-existing Sass `rgba` error) |
| Headless verification (`verify.mjs`, Playwright + Chrome) | PASS — 31/31 checks |

## 4. Local verification (Rails :3100 on `pynwheel_development`, Connect :3005)

Rails ran with `PYN_CONNECT_WRITES=on PYN_CONNECT_WRITES_COMMUNITY_IDS=1411,1618 HOST_URL=http://127.0.0.1:3100
SECRET_KEY_BASE_v2=local-dev-only-widget-code`, so 1411 and 1618 were writable, 229 was the writes-off case; sessions were minted
for the Super admin (1854) and a visitor-detail user (1198, assigned to 1411 for the run and unassigned after).

| Check | Property / user | Result |
|---|---|---|
| Six tabs, no Elevators; `?tab=elevators` opens Stops; checklist of five steps | 1411 / admin | PASS |
| Rail of five groups; Tour experience pills (Welcome & sign-in · Route & navigation · Stops & units · After the tour · Concierge & safety); Route & navigation shows the six stored rows with `?section=navigation`; Access & security = two pills + "not available" | 1411 / admin | PASS |
| No read-only note for an admin with writes on | 1411 / admin | PASS |
| Slot length 15 → 30 min: saved (toast), reload shows 30, restored to 15 | 1411 / admin | PASS |
| Hours editable when no CRM manages them | 1411 / admin | PASS |
| Link built on `HOST_URL` with the host line; direct link → HTTP 200 with the booking form for "John Pynwheel Demo"; bogus code → 404; another property's code → 404; unknown property → 404 | 1411 / admin | PASS |
| Button text "Book a Tour QA": saved, reload shows it in the field and the embed, restored | 1411 / admin | PASS |
| No page errors; only the four saves left the page | 1411 / admin | PASS |
| CRM-managed (Funnel) hours: banner "Managed by funnel … Edit hours in funnel"; no save, no editor, closures read-only; rules still editable | 1618 / admin | PASS |
| Writes off: note names `PYN_CONNECT_WRITES`, not the role; controls disabled on rules and link panels | 229 / admin | PASS |
| Role read-only: note names the role, not the switch; controls disabled | 1411 / visitor-detail | PASS |

Evidence (screenshots + `results.json`) in the session scratchpad `evidence/` folder. Dev-database residue: none (slot interval,
button text and the user assignment were restored; the widget's placeholder `schedual_tours` rows for 1411 already existed).

## 5. Heroku / follow-ups

- **Owner, manual mode:** set `HOST_URL` on `pyn-system` to the host the CMS runs on; then the Connect link, the embed and the
  legacy "Copy link" all resolve. `PYN_CONNECT_WRITES` is already on for the allowlist (1411 included; 1618 is read-only there by
  design of the allowlist, and the page now says so).
- The Elevators tab's "delete bank" has no Connect UI any more; elevator records are managed in the Map editor / legacy CMS, and
  `TourSetup::Save` still accepts `elevators.delete` for any caller.
- Design items with no backend stay placeholders: Visitor checks, Tour length & access, Welcome & sign-in, Stops & units, After
  the tour, Concierge & safety, Messages, the "Scheduler source" options.
- The design gives each tab a role list (Stops / Live Chat / Settings admins only; Visitors also the visitor-detail role; Overview /
  Locks also Dwelo admins); Connect still shows every tab to every signed-in user as read-only. Not in this task.
