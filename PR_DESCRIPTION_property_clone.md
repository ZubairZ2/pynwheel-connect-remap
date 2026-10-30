# Property clone script: an isolated, property-centred clone with its own company

Branch `feature/property-clone-script` → `main`. Rails only; no schema change, no route change, no change to existing behaviour.

## What

`rake property_clone:dry_run[<id>]` (reads only) and `rake property_clone:execute[<id>]` (explicit confirmations) copy one property, the company it belongs to and every record the property needs into new rows with new ids, remap every foreign key, polymorphic pair and id-bearing serialized column, sanitize secrets and notification targets, verify the result with 13 integrity checks, copy the property's S3 folders and write an audit manifest. `property_clone:test_admin` bootstraps a company-scoped administrator; `verify`, `baseline` and `compare_baseline` re-check a clone and the source later.

- `app/services/property_clone/`: Policy (the dependency map as code: 76 steps, exclusions, serialized id columns), Plan (dry run), Runner (`INSERT … SELECT` per row in one transaction under an advisory lock, second pass for self references and serialized ids), Baseline, Verifier, FileCopier, TestAdmin, EnvironmentGuard, Manifest, Report.
- `lib/tasks/property_clone.rake`, `script/property_clone/{dependency_map,isolation_rehearsal}.rb`.
- Tests: `test/services/property_clone/*`, `test/integration/property_clone_access_test.rb` (22 runs, 1028 assertions, green).
- Docs: `docs/property_clone/{DEPENDENCY_MAP,RUNBOOK,TEST_ADMIN,REPORT_2026-10-28}.md`, samples; context.md §46; PYN_CONNECT_PROGRESS.md §52.

## Rehearsal (not production)

Hazel 1618 / QuadReal 596 on the disposable `pynwheel_audit_clone` → property 8044 / company 1048 `… [SCRIPT TESTING]`: 915 rows + 90 statuses, 13/13 checks PASS, source fingerprint identical before/after the clone and after the isolation rehearsal driven as the test administrator through the real routes. The S3 phase was not run locally (no bucket access). Full detail, every PASS / FAIL / NOT RUN item, open risks and the production prerequisites: `docs/property_clone/REPORT_2026-10-28.md`.

## Found on the way (pre-existing, reported, not changed)

- 46 of the 76 legacy HTML controllers do not run `check_community` (ToursController, TourStopsController, HallwaysController, …): any signed-in user can open them for any property id.
- `Ability` has no rule for the `Company admin` role (CompaniesController answers 403, `/companies.json` included).
- `TourStopsController#destroy` deletes `Path.where(map_path_from_id:)` with no type or property filter.
- `units.floorplan_id` is a string PMS code, not a foreign key; `tour_stops.unit_id` and `elevators.parent_id` do not exist although the models declare the associations.

## Before production

Rehearse once more on a staging database with a staging bucket (file phase), decide on bookings/visitors/residents (excluded by default), consider the `check_community` gap, and run only with the confirmations in the runbook.
