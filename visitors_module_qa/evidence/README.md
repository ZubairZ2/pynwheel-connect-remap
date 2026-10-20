# Visitors module QA evidence (October 21, 2026)

Clone `pynwheel_audit_clone`, Rails :3103 from the worktree, Connect :3008, signed in as super admin 2181 (form sign-in).

| File | What |
|---|---|
| `list_1618.png`, `list_1618_search.png`, `list_1411.png`, `list_818.png` | Visitors lists: Hazel (280, chips with counts), Hazel search "nugent", John Demo (walk-ins), Escaya (empty state) |
| `list_229_onsite.png` | Oeuvre with the legacy-app walk-in on site ("last at Game Room …") |
| `profile_13024.png`, `profile_13024_access_all.png` | Rob Nugent (Hazel): lapsed Authenteq check, 22 sessions, feedback 1/5, Funnel appointment; all 115 vendor accesses |
| `profile_14793.png` | John Hall (John Demo): 34 sessions, 15 bookings, Latch / Zerv accesses, feedback 5/5 |
| `profile_16212.png` | Chang Liu (Hazel): 7 grouped stops with times and Zerv instructions, 8 accesses during the visit (codes revealed), dismissed feedback |
| `profile_walkin_inprogress.png`, `profile_walkin_completed.png`, `profile_walkin_redacted.png` | the QA walk-in through the legacy app API: in progress, completed (2 stops), after Remove personal data |
| `profile_app_booking.png` | the Tour App booking (created by Tour App) |
| `new_booking_229.png` | the New Booking dialog on Oeuvre |
| `shots_log*.json` | per-step counts, page errors (none), non-GET requests (none) |
| `flow_*.json` | raw answers of the walk-in start / end, the Tour App booking, the Connect booking, the Salesforce webhook |

Flow results (ids on the clone): widget booking 25524 (visitor 16267, later deleted), walk-in visitor 16262 / history 22684
(later PII-removed), Tour App booking 25522 (16265, ID reviewed and reset), Connect booking 25523 (16266, rescheduled then
cancelled), PERQ 25520 (1778 / 16263), Salesforce 25521 (8008 / 16264).
