## Summary

Implements `stops_LOCKS_SCHDULING.MD` (the Oct 13 Back Office design's Tour module) in Pynwheel Connect on the existing Rails logic. The legacy CMS keeps running on the shared database: **no migrations, no legacy action or callback changed**; every new behaviour is a JSON controller under `Connect::` calling the services the legacy screens already use.

Tours page tabs: **Overview · Stops · Elevators · Locks · Visitors · Live Chat · Settings** (`?tab=routing` opens Stops, where the route preview now lives).

### Backend (`89dda9ace`)
- `Connect::ReadsJson` / `Connect::BaseController`, `Connect::DomainError`.
- **Locks**: providers (igloohome, Latch, Zerv, Dwelo / EdgeState), inventory, map / unmap / manual code (`AssignLocksHelper`), auto-match (`MapLocksJob#parse_stop`), purge, sync / test, issued codes, locks on/off.
- **Stops**: one row per `tour_stop` with content, pin, lock state and setup gaps; the drawer saves the record's own columns (`stop_description`, `directional_text`, …) and bumps the tour version.
- **Visitors**: derived booking status (upcoming / in progress / completed / missed / cancelled via PaperTrail destroy versions), list with filters and counts, profile, CSV export, New booking through the legacy lifecycle (CRM pushes, mail, SMS moved verbatim into `SchedualTours::Notifications`), reschedule, cancel, ID review, privacy actions (super admin).
- **Booking settings**: gates, widget state, tour types, slot interval, capacity, behaviour, visiting / agent hours, form, button, signed link + embed, with the legacy validation bounds.
- Legacy delegations only where the new service replaces duplicated code (`TourUsersController` privacy actions, `ToursController#flag_id_mismatch`, `SchedualToursController#check_limit`).

### Frontend
- One BFF route `/api/properties/:id/tour/[...path]` (GET allowlist, POST → Rails verbs, write-outcome vocabulary).
- Stops: grouped list with drag-and-drop order (saved by the page's Save), attention filter, drawer (Content / Lock / Preview), Add stops, read-only route preview and TEST SHORTEST PATH on the saved graph.
- Locks, Visitors (list, profile, dialogs) and Settings → Scheduling (tour types & slots, visiting hours) and Booking & CRM (form with prospect preview, link, CRM read-only — deferred by the brief).
- Overview KPIs and attention list from the module reads.

### Docs
`PYN_CONNECT_PROGRESS.md` §41, `context.md` §36, `gaps_tour_setup_feature.md` (Oct 17 update), `TOUR_SETUP_MODULES_QA_17_oct.md` (module status table, real-data validation, backend / DB changes, legacy regression, remaining issues).

## Test plan
- [x] Rails `test/controllers/connect`: 31 runs, 244 assertions, 0 failures. Full suite: 256 runs, 1 failure + 3 errors, all pre-existing in `PartnerConfigurationsControllerTest`.
- [x] `tsc --noEmit` clean; `next build` clean.
- [x] Playwright `tourModules.spec` + `tourSetup.spec` against CMS :3100 on `pynwheel_audit_clone` (writes on) + `next dev` :3005: 7 passed, only GETs.
- [x] Browser pass on Hazel 1618 (igloohome v1 + Zerv, 277 visitors): overview, stops (drawer content save and revert, manual code set and removed — audit rows written), route preview + shortest path, locks, visitors (profile, New booking dialog), settings (rules, hours, form + preview, link). Alliance 818 / 8005: no provider state and empty stops state.
- [ ] Set `HOST_URL` on the Connect-facing Rails instance so the booking link panel can build the link.
