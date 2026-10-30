Branch: `feature/complete-visitors-module` → `main`
Compare: https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...feature/complete-visitors-module?expand=1

# Visitors module: every source, the full lifecycle, access codes and a recorded-events timeline

Closes the gaps between the Visitors tab (PR #30/#31) and the October 20 design on the real rows. Report:
`VISITORS_MODULE_FULL_QA.md`; evidence in `visitors_module_qa/evidence/`; knowledge in `context.md` §40, progress §46.

## What changed

**Rails (Connect module only — no migration, no legacy controller / model / view touched)**
- `Visitors::Status`: `abandoned` is a row status of its own (the Completed chip counts it, as the design's `vStat` does;
  `status=abandoned` filters it alone; the CSV says "Abandoned"); `property_tour_type` `remote_tour` is a virtual tour; the
  ID check reports verified / lapsed (30 days) / mismatch / never with provider and dates; a stop's instant is rebuilt from
  the stored date + time-of-day columns in the property's zone; `stop_pin` is split into a code or a vendor instruction.
- `Visitors::Query`: completed / abandoned counts and filters, phone-digit search, "Code failed" flag, the last recorded
  stop's time on the on-site cards, per-visitor cancelled read.
- `Visitors::Profile`: verification details, the restricted-access property code with expiry, booking slot history
  (`Visitors::Changes`, from PaperTrail `update` versions) and CRM appointment ids, stops grouped per stop with photos,
  notes, code / instruction and the next arrival, `Visitors::Access` (igloohome, Latch with window, Zerv with vendor
  errors, RemoteLock / Dwelo, Igloo rows; matched to the visit by time; codes only for users who may edit the property),
  feedback, guest cards (`prospects`), a timeline of recorded events with kinds.
- **Fix:** `Visitors::Cancelled` read the booked time of every cancelled booking as nil (PaperTrail's serialized time
  column), so Cancelled rows showed "unscheduled".
- `Visitors::Export`: Abandoned label, Visits and Bookings columns. Controller passes `codes_visible?`.

**Connect**: types, `tourVisitors.generator` (+12 vitest), `useTourVisitors` (reveal codes, This visit / All), `VisitorsTab`
(ID sentence, booking change / CRM / cancellation lines, feedback + guest-cards card, grouped stops with photos, property
code, Access codes card, timeline note), 54 strings.

## Verified (production clone, worktree Rails :3103, Connect :3008)
- Six sources end to end: public widget (25524), legacy-app walk-in through `/api/v1` (16262, on site → completed →
  PII removed), new Tour App booking (25522), Connect booking (25523 → rescheduled → cancelled), PERQ (25520), Salesforce
  (25521). Apartments.com inventoried only (vendor key).
- Hazel 1618 (280 visitors, 45 abandoned), John Demo 1411, Oeuvre 229, Jennifer Demo FP 1412, Escaya 818 and Cypress
  Terra 8005 (empty states, cross-property 404); real profiles with 115 / 39 / 8 vendor accesses, lapsed verification,
  Funnel appointments, feedback.
- Tests: visitors controller 17 runs (6 new), Connect controllers + Tour API green, full Rails suite 308 runs with only the
  pre-existing partner-screen failure, vitest 26, tsc clean, Playwright real-data visitors spec 2 passed, headless pass
  0 errors / 0 writes, 12 legacy pages 200 in-process after the writes. Production read-only (one query).

## Known gaps (documented)
The new Tour App books but records no visit / stop / unlock rows; reminder send times are not stored; validity windows
exist only for Latch; unlock events only from RemoteLock / Dwelo; local dumps lack the production version history (Cancelled
and reschedule history are empty locally except for Connect-made changes).
