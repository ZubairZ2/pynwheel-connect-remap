# SVG / dual-map / asset-delivery / Auto-Detect QA evidence (October 10, 2026)

Companion to `../svg_dual_map_asset_delivery_qa_report.md`. Nothing here holds a credential, a cookie or a production export.

- `sql/q1–q4.sql` — the read-only production queries (`SET default_transaction_read_only = on`, statement timeouts); `scripts/prodq.sh` runs one against the URL in `~/.pynwheel_ro_url` and redacts any `postgres://` text from the output.
- `scripts/svg_structure.py`, `scripts/svg_layers.py` — how the real exports were inspected (run with `python3 -I` on files downloaded to a separate folder).
- `scripts/sync_8005_units.py` — turns the production export of Cypress Terra's unit placements into UPDATEs for the isolated clone (`pynwheel_audit_clone`); the export itself is not kept here.
- `scripts/mint.rb` — the local Devise session mint (PYN_CONNECT_PROGRESS.md §7); the minted session files are not kept.
- `scripts/verify.mjs`, `probe.mjs`, `probe-retry.mjs`, `retry.sh` — the browser verification (Playwright, minted session) on the clone. Their logs and screenshots were not kept in the repository; the outcomes are recorded in the report's test matrix (§10) and regression notes (§9, §11a).

The nine production SVG exports used by `tests/e2e/hallways.spec.ts` (`PYN_CONNECT_REAL_SVG_FIXTURES`) are re-downloaded from the bucket named in the report's §2 when needed; they are not committed.
