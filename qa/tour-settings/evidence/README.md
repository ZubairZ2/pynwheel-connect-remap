# Evidence of the October 20, 2026 Settings / booking work (see ../../../TOUR_SETTINGS_SCHEDULING_BOOKING_QA.md)

- `G_before_clone.json`, `G_after_clone.json`, `G_before_dev.json`, `G_after_dev.json` — `scripts/legacy_snapshot.rb` output: legacy
  Tour Settings page and public widget page status + fingerprints, slot-engine hashes, hours, types at sample times, booking hashes,
  per property (1618, 818, 8005; 229 after). Before = `main` code before the migration; after = this branch after the whole matrix.
- `screens/clone_1618_*.png`, `screens/dev_1618_*.png` — the five Settings sections on Hazel, on the audit clone and on development.
- `widget229/` — the legacy widget booking on Oeuvre 229 (clone): open, filled, after submit; `closed_day_refusal.txt`.
- `widget/`, `widget818/` — earlier attempts on Hazel (Funnel-managed: legacy push raised locally) and Escaya (gated on the clone).
- `app/` — the headless Self Tour App run on Hazel (clone): sign-in → property → Schedule → confirmed.
- `dev_api/` — Tour App API answers on development (settings, availability, a 201 booking, a 422 closed time, a 422 missing phone)
  and the legacy widget's closed-day refusal on 229.
No credential, token or password is stored here; the widget URLs carry the local-only signing key's JWT.
