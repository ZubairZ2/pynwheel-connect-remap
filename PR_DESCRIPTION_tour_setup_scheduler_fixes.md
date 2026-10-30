# Tour Setup: Oct 27 design alignment, read-only causes, CRM-managed hours, widget hardening

Branch `feature/tour-setup-scheduler-fixes` → `main`. Compare link:
https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...feature/tour-setup-scheduler-fixes

Findings table, decisions and the PASS/FAIL matrix: `TOUR_SETUP_SCHEDULER_FIXES_QA_2026-10-27.md`. Knowledge: `context.md` §44.
Progress: `PYN_CONNECT_PROGRESS.md` §50.

## What was wrong
- **Elevators tab** that the Oct 27 design does not have (its edits were local-only anyway).
- **Settings rail** had six groups; the design has five (Route & navigation is a section of Tour experience).
- **Every Scheduling / Booking control disabled on Heroku**: one gate (`PYN_CONNECT_WRITES` + admin role) — the switch was off
  in production, while the page blamed the user's role.
- **Visiting hours editable** for CRM-managed calendars, which the widget ignores (design shows them as stored).
- **Booking link broken on Heroku**: `HOST_URL` names `pyn-system.herokuapp.com`, a dead host ("No such app"); the CMS runs at
  `pyn-system-16a05cad79df.herokuapp.com`. Config fix for the owner, not code.
- **Widget-status gate** could say "Live" while the widget refused (product-option vs `self_tour`).
- **A bad signed code** redirected the prospect to the staff scheduled-tours page instead of a 404.

## What changed
**Connect**
- Tabs: Overview · Stops · Locks · Visitors · Live Chat · Settings; `?tab=elevators` opens Stops; five-step checklist; locks
  pill from the stored lock providers; elevator state, dialog, strings and CSS removed.
- Settings rail: Scheduling · Booking & CRM · Access & security · Tour experience · Messages, pills for every group,
  `?section=` for every section (Route & navigation = `section=navigation`).
- Read-only notes per cause (role vs. Connect writes off) on every panel and under the scheduler switch.
- Hours and closures read-only while a CRM manages the calendar, with the design's banner.
- The link panel prints the configured `HOST_URL` host with a note that a stale value must be fixed there.

**Rails (no migration)**
- `Scheduling::Settings#gates`: the tour gate reads `communities.self_tour`, exactly as the widget.
- `SchedulerWidget::WidgetsController`: `verify_community_code!` answers 404 before any write for an unknown property or a
  missing / invalid / foreign-key / mismatched direct-link code.

## Tests
- Connect: `tsc --noEmit`, `vitest` (28), `next build` — pass. No lint configuration in the project.
- Rails: new `test/controllers/schedular_widget/widget_controller_test.rb` (7), `booking_controller_test.rb` (14) — pass.
- Headless Playwright run against the local pair on 1411, 1618 and 229 as admin and as a visitor-detail user: 31/31 (save → reload
  → persisted → restored; direct link 200 / bad codes 404; managed hours; writes-off and role notes).

## Owner actions after merge
- `heroku config:set HOST_URL=https://pyn-system-16a05cad79df.herokuapp.com -a pyn-system` (or the real public domain).
- Deploy `main` to `pyn-system` and `pyn-system-connect`.
